import db from '../database/db_client.js';
import { appendOrder } from '../services/googleSheets.js';

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export const createOrder = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { name, phone, items, shippingAddressDetails, paymentMethod, orderType, customerId } = body;

        if (!name || !phone || !items || items.length === 0 || !shippingAddressDetails) {
            const errObj = { error: 'Missing required order details.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const addressLat = shippingAddressDetails.lat || 28.6139;
        const addressLng = shippingAddressDetails.lng || 77.2090;

        const warehouses = await db.warehouses.find();
        let closestWarehouse = null;
        let minDistance = Infinity;

        for (const wh of warehouses) {
            const dist = getDistance(addressLat, addressLng, wh.lat, wh.lng);
            if (dist < minDistance) {
                minDistance = dist;
                closestWarehouse = wh;
            }
        }

        if (!closestWarehouse) {
            const errObj = { error: 'No shipping warehouse available.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        for (const item of items) {
            const stock = (closestWarehouse.inventory && closestWarehouse.inventory[item.productId]) || 0;
            if (stock < item.quantity) {
                const errObj = {
                    error: `Insufficient stock for ${item.title} at ${closestWarehouse.name}. Available: ${stock}, Requested: ${item.quantity}`
                };
                return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
            }
        }

        const updatedInventory = { ...closestWarehouse.inventory };
        for (const item of items) {
            updatedInventory[item.productId] -= item.quantity;
        }
        await db.warehouses.updateOne({ id: closestWarehouse.id || closestWarehouse._id }, { inventory: updatedInventory });

        let subtotal = 0;
        for (const item of items) {
            subtotal += (item.price || 20) * item.quantity;
        }
        const tax = Math.round(subtotal * 0.18);
        const total = subtotal + tax;

        const invoiceNum = 'INV-' + Math.floor(100000 + Math.random() * 900000);
        const newOrder = await db.orders.create({
            customerId: customerId || 'guest',
            name,
            phone,
            location: `${shippingAddressDetails.address}, ${shippingAddressDetails.city}`,
            orderType: orderType || 'Normal',
            status: 'Confirmed',
            items,
            subtotal,
            tax,
            total,
            shippingAddressDetails,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
            paymentMethod,
            warehouseId: closestWarehouse.id || closestWarehouse._id,
            liveCoordinates: { lat: closestWarehouse.lat, lng: closestWarehouse.lng },
            etaMinutes: Math.round(minDistance * 2.5) + 15,
            invoiceNumber: invoiceNum,
            invoiceUrl: `/api/orders/invoice/${invoiceNum}`
        });

        await db.auditLogs.create({
            username: name,
            role: 'customer',
            action: 'ORDER_PLACED',
            details: `Order placed successfully. Total: ₹${total}. Warehouse assigned: ${closestWarehouse.name}`
        });

        try {
            await appendOrder({ name, phone, bottleSize: items[0]?.productId || '250ml', quantity: items[0]?.quantity || 10, status: 'Confirmed' });
        } catch (e) {}

        const data = { success: true, order: newOrder };
        return res.status ? res.status(201).json(data) : Response.json(data, { status: 201 });
    } catch (error) {
        console.error('Create Order Error:', error);
        const errObj = { error: error.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params?.orderId || (req.req ? req.req.param('orderId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { status, deliveryAgentId } = body;

        const order = await db.orders.findById(orderId);
        if (!order) {
            const errObj = { error: 'Order not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        const updates = { status };
        if (deliveryAgentId) updates.deliveryAgentId = deliveryAgentId;

        if (status === 'OutForDelivery' && !order.otpCode) {
            updates.otpCode = Math.floor(1000 + Math.random() * 9000).toString();
            await db.notificationLogs.create({
                recipient: order.phone,
                channel: 'SMS',
                message: `Your AQUAVIORA order is out for delivery. Share OTP ${updates.otpCode} with delivery agent.`
            });
        }

        await db.orders.updateOne({ id: orderId }, updates);
        const data = { success: true, order: { ...order, ...updates } };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const orderId = req.params?.orderId || (req.req ? req.req.param('orderId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { otpCode } = body;

        const order = await db.orders.findById(orderId);
        if (!order) {
            const errObj = { error: 'Order not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        if (order.otpCode !== otpCode) {
            const errObj = { error: 'Invalid delivery OTP.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        await db.orders.updateOne({ id: orderId }, { status: 'Delivered', paymentStatus: 'Paid' });
        const data = { success: true, message: 'OTP verified. Order marked as Delivered.' };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const requestReturn = async (req, res) => {
    try {
        const orderId = req.params?.orderId || (req.req ? req.req.param('orderId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { reason } = body;

        const order = await db.orders.findById(orderId);
        if (!order) {
            const errObj = { error: 'Order not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        await db.orders.updateOne({ id: orderId }, { status: 'ReturnRequested', returnReason: reason });
        const data = { success: true, message: 'Return request submitted.' };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const approveReturn = async (req, res) => {
    try {
        const orderId = req.params?.orderId || (req.req ? req.req.param('orderId') : null);
        const order = await db.orders.findById(orderId);
        if (!order) {
            const errObj = { error: 'Order not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        await db.orders.updateOne({ id: orderId }, { status: 'ReturnApproved' });
        const data = { success: true, message: 'Return approved.' };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const getInvoice = async (req, res) => {
    try {
        const invoiceNumber = req.params?.invoiceNumber || (req.req ? req.req.param('invoiceNumber') : null);
        const order = await db.orders.findOne({ invoiceNumber });
        if (!order) {
            const errObj = { error: 'Invoice not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }
        return res.json ? res.json(order) : Response.json(order);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default {
    createOrder,
    updateOrderStatus,
    verifyOTP,
    requestReturn,
    approveReturn,
    getInvoice
};
