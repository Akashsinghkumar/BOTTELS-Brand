const db = require('../database/db_client');
const { appendOrder } = require('../services/googleSheets');

// Distance helper (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Order placement
const createOrder = async (req, res) => {
    try {
        const { name, phone, items, shippingAddressDetails, paymentMethod, orderType, paymentSuccess, customerId } = req.body;

        if (!name || !phone || !items || items.length === 0 || !shippingAddressDetails) {
            return res.status(400).json({ error: 'Missing required order details.' });
        }

        const addressLat = shippingAddressDetails.lat || 28.6139; // default Delhi
        const addressLng = shippingAddressDetails.lng || 77.2090;

        // 1. Assign closest warehouse
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
            return res.status(400).json({ error: 'No shipping warehouse available.' });
        }

        // 2. Validate inventory at this warehouse
        for (const item of items) {
            const stock = closestWarehouse.inventory[item.productId] || 0;
            if (stock < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for ${item.title} at ${closestWarehouse.name}. Available: ${stock}, Requested: ${item.quantity}`
                });
            }
        }

        // 3. Subtract stock
        const updatedInventory = { ...closestWarehouse.inventory };
        for (const item of items) {
            updatedInventory[item.productId] -= item.quantity;
        }
        await db.warehouses.updateOne({ _id: closestWarehouse._id }, { $set: { inventory: updatedInventory } });

        // Generate low stock alerts if needed
        for (const item of items) {
            if (updatedInventory[item.productId] < 50) {
                await db.auditLogs.create({
                    username: 'system',
                    role: 'admin',
                    action: 'INVENTORY_ALERT',
                    details: `Low stock warning: ${item.title} has ${updatedInventory[item.productId]} left at ${closestWarehouse.name}`,
                    ipAddress: '127.0.0.1'
                });
            }
        }

        // 4. Calculate total prices
        let subtotal = 0;
        for (const item of items) {
            subtotal += item.price * item.quantity;
        }
        const tax = Math.round(subtotal * 0.18); // 18% GST
        const total = subtotal + tax;

        // 5. Payment simulation
        let paymentStatus = 'Pending';
        if (paymentMethod === 'COD') {
            paymentStatus = 'Pending';
        } else {
            // Cards or UPI
            if (paymentSuccess === false) {
                // Revert stock
                for (const item of items) {
                    updatedInventory[item.productId] += item.quantity;
                }
                await db.warehouses.updateOne({ _id: closestWarehouse._id }, { $set: { inventory: updatedInventory } });
                return res.status(400).json({ error: 'Payment processing failed.' });
            }
            paymentStatus = 'Paid';
        }

        // 6. Create Order
        const invoiceNum = 'INV-' + Math.floor(100000 + Math.random() * 900000);
        const newOrder = await db.orders.create({
            customerId: customerId || 'guest',
            name,
            phone,
            location: `${shippingAddressDetails.address}, ${shippingAddressDetails.city}`,
            orderType: orderType || 'Normal',
            status: paymentStatus === 'Paid' || paymentMethod === 'COD' ? 'Confirmed' : 'New',
            items,
            subtotal,
            tax,
            total,
            shippingAddressDetails,
            paymentStatus,
            paymentMethod,
            warehouseId: closestWarehouse._id,
            liveCoordinates: { lat: closestWarehouse.lat, lng: closestWarehouse.lng }, // starts at warehouse
            etaMinutes: Math.round(minDistance * 2.5) + 15, // AI ETA logic: 2.5 mins per km + 15 mins prep
            invoiceNumber: invoiceNum,
            invoiceUrl: `/api/orders/invoice/${invoiceNum}`
        });

        // 7. Audit Log
        await db.auditLogs.create({
            username: name,
            role: 'customer',
            action: 'ORDER_PLACED',
            details: `Order ${newOrder._id} placed successfully. Total: ₹${total}. Warehouse assigned: ${closestWarehouse.name}`,
            ipAddress: req.ip
        });

        // 8. Send WhatsApp Confirmation Simulated
        const whatsappMsg = `Hi ${name}, your AQUAVIORA order ${newOrder._id} of ₹${total} is Confirmed! It will be dispatched from our ${closestWarehouse.city} warehouse. Track here: http://localhost:5000/dashboard`;
        await db.notificationLogs.create({
            userId: customerId,
            type: 'WhatsApp',
            recipient: phone,
            message: whatsappMsg
        });

        // Also email simulation
        await db.notificationLogs.create({
            userId: customerId,
            type: 'Email',
            recipient: `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
            message: `Your order invoice ${invoiceNum} is ready. Total: ₹${total}.`
        });

        // 9. Sync to Sheets (Compat support)
        try {
            await appendOrder({
                name,
                phone,
                bottleSize: items[0]?.productId || '250ml',
                quantity: items[0]?.quantity || 10,
                location: `${shippingAddressDetails.address}, ${shippingAddressDetails.city}`,
                orderType: orderType || 'Normal',
                status: 'Confirmed'
            });
        } catch (e) {
            console.error('Failed to append to sheet:', e.message);
        }

        res.status(201).json({ success: true, order: newOrder });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, deliveryAgentId, agentLat, agentLng } = req.body;

        const order = await db.orders.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const updates = { status };

        if (deliveryAgentId) {
            updates.deliveryAgentId = deliveryAgentId;
        }

        // If status becomes OutForDelivery, generate OTP code
        if (status === 'OutForDelivery' && !order.otpCode) {
            updates.otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit OTP
            // Push Notification & SMS simulation
            await db.notificationLogs.create({
                userId: order.customerId,
                type: 'SMS',
                recipient: order.phone,
                message: `Your AQUAVIORA order is out for delivery. Share OTP ${updates.otpCode} with delivery agent to verify.`
            });
        }

        // Update coordinates if agent coordinates provided
        if (agentLat && agentLng) {
            updates.liveCoordinates = { lat: agentLat, lng: agentLng };
        }

        await db.orders.updateOne({ _id: orderId }, { $set: updates });

        // Logging
        await db.auditLogs.create({
            username: 'system',
            role: 'admin',
            action: 'ORDER_STATUS_UPDATE',
            details: `Order ${orderId} status updated to ${status}.`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { otp } = req.body;

        const order = await db.orders.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (order.otpCode !== otp) {
            return res.status(400).json({ error: 'Invalid OTP. Verification failed.' });
        }

        await db.orders.updateOne({ _id: orderId }, { $set: { status: 'Delivered', paymentStatus: 'Paid' } });

        await db.auditLogs.create({
            username: order.name,
            role: 'customer',
            action: 'ORDER_DELIVERED',
            details: `Order ${orderId} delivered via OTP verification.`,
            ipAddress: req.ip
        });

        // WhatsApp notification
        await db.notificationLogs.create({
            userId: order.customerId,
            type: 'WhatsApp',
            recipient: order.phone,
            message: `Hi ${order.name}, your order ${orderId} has been successfully delivered! Thank you for choosing AQUAVIORA.`
        });

        res.json({ success: true, message: 'Order delivered and verified.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Returns & Refunds
const requestReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await db.orders.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        if (order.status !== 'Delivered') {
            return res.status(400).json({ error: 'Only delivered orders can be returned.' });
        }

        await db.orders.updateOne({ _id: orderId }, { $set: { status: 'ReturnRequested' } });

        await db.auditLogs.create({
            username: order.name,
            role: 'customer',
            action: 'RETURN_REQUESTED',
            details: `Return requested for order ${orderId}.`,
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'Return request submitted.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const approveReturn = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { approve } = req.body; // true or false

        const order = await db.orders.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        if (approve) {
            await db.orders.updateOne({ _id: orderId }, { $set: { status: 'Returned', paymentStatus: 'Refunded' } });

            // Refund logic audit
            await db.auditLogs.create({
                username: 'admin',
                role: 'admin',
                action: 'RETURN_APPROVED',
                details: `Return approved for order ${orderId}. Payment status updated to Refunded.`,
                ipAddress: req.ip
            });

            // Notification
            await db.notificationLogs.create({
                userId: order.customerId,
                type: 'WhatsApp',
                recipient: order.phone,
                message: `Hi ${order.name}, your return request for order ${orderId} is approved. Refund of ₹${order.total} has been initiated to your account.`
            });
        } else {
            await db.orders.updateOne({ _id: orderId }, { $set: { status: 'Delivered' } });
            await db.auditLogs.create({
                username: 'admin',
                role: 'admin',
                action: 'RETURN_REJECTED',
                details: `Return rejected for order ${orderId}.`,
                ipAddress: req.ip
            });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Invoice print rendering (HTML view)
const getInvoice = async (req, res) => {
    try {
        const { invoiceNumber } = req.params;
        const order = await db.orders.findOne({ invoiceNumber });

        if (!order) {
            return res.status(404).send('Invoice not found');
        }

        res.send(`
            <html>
            <head>
                <title>Invoice - ${invoiceNumber}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
                    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-radius: 8px; }
                    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .header-table td { vertical-align: top; }
                    .title { font-size: 28px; font-weight: bold; color: #008ba3; }
                    .meta { text-align: right; }
                    .billing-table { width: 100%; margin-bottom: 40px; }
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .items-table th, .items-table td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
                    .items-table th { background: #f7f7f7; color: #666; }
                    .totals { text-align: right; font-size: 16px; line-height: 24px; }
                    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="invoice-box">
                    <table class="header-table">
                        <tr>
                            <td class="title">AQUAVIORA</td>
                            <td class="meta">
                                <strong>Invoice #:</strong> ${order.invoiceNumber}<br/>
                                <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}<br/>
                                <strong>Order Status:</strong> ${order.status}
                            </td>
                        </tr>
                    </table>
                    
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
                    
                    <table class="billing-table">
                        <tr>
                            <td>
                                <strong>Seller:</strong><br/>
                                AQUAVIORA Private Limited<br/>
                                Industrial Area, Phase 2<br/>
                                New Delhi, 110020
                            </td>
                            <td style="text-align: right;">
                                <strong>Buyer:</strong><br/>
                                ${order.name}<br/>
                                ${order.location}<br/>
                                Phone: ${order.phone}
                            </td>
                        </tr>
                    </table>
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Product Details</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.title} (${item.productId})</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${item.price}</td>
                                    <td>₹${item.price * item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        Subtotal: ₹${order.subtotal}<br/>
                        Tax (18% GST): ₹${order.tax}<br/>
                        <strong>Total Paid: ₹${order.total}</strong><br/>
                        Payment Method: ${order.paymentMethod} (${order.paymentStatus})
                    </div>
                    
                    <div class="footer">
                        Thank you for your business! If you have questions about this invoice, contact support@aquaviora.com
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (e) {
        res.status(500).send(e.message);
    }
};

module.exports = {
    createOrder,
    updateOrderStatus,
    verifyOTP,
    requestReturn,
    approveReturn,
    getInvoice
};
