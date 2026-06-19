const express = require('express');
const router = express.Router();
const db = require('../database/db_client');

// Import controllers
const auth = require('../controllers/auth.controller');
const order = require('../controllers/order.controller');
const inventory = require('../controllers/inventory.controller');
const delivery = require('../controllers/delivery.controller');
const ai = require('../controllers/ai.controller');
const support = require('../controllers/support.controller');
const notification = require('../controllers/notification.controller');

// Auth endpoints
router.post('/auth/signup', auth.signup);
router.post('/auth/login', auth.login);
router.post('/auth/send-otp', auth.sendOTP);
router.post('/auth/verify-otp', auth.verifyOTP);
router.post('/auth/complete-registration', auth.completeRegistration);

// Order Placement & Lifecycle
router.post('/orders', order.createOrder);
router.put('/orders/status/:orderId', order.updateOrderStatus);
router.post('/orders/verify-otp/:orderId', order.verifyOTP);
router.post('/orders/return/:orderId', order.requestReturn);
router.post('/orders/approve-return/:orderId', order.approveReturn);
router.get('/orders/invoice/:invoiceNumber', order.getInvoice);

// Order Retrieval API (Role-Based and Identity-Based filters)
router.get('/orders', async (req, res) => {
    try {
        const { role, userId, warehouseId, deliveryAgentId } = req.query;
        let query = {};
        
        if (role === 'customer' && userId) {
            query.customerId = userId;
        } else if (role === 'warehouse_manager' && warehouseId) {
            query.warehouseId = warehouseId;
        } else if (role === 'delivery_agent' && deliveryAgentId) {
            query.deliveryAgentId = deliveryAgentId;
        }
        
        const list = await db.orders.find(query);
        res.json(list);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Specific order details
router.get('/orders/:orderId', async (req, res) => {
    try {
        const item = await db.orders.findById(req.params.orderId);
        if (!item) return res.status(404).json({ error: 'Order not found' });
        res.json(item);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Inventory APIs
router.get('/inventory/warehouses', inventory.getWarehouses);
router.post('/inventory/restock/:warehouseId', inventory.restockWarehouse);

// Delivery APIs
router.get('/delivery/agents', delivery.getAgents);
router.post('/delivery/assign/:orderId', delivery.assignAgent);
router.post('/delivery/location/:orderId', delivery.updateAgentLocation);

// AI Predictor APIs
router.post('/ai/predict-eta', ai.predictETA);
router.post('/ai/optimize-route', ai.getOptimizedRoute);
router.get('/ai/forecast-demand', ai.getDemandForecast);

// Customer Support Tickets APIs
router.get('/support/tickets', support.getTickets);
router.post('/support/tickets', support.createTicket);
router.post('/support/tickets/:ticketId/messages', support.sendTicketMessage);
router.post('/support/tickets/:ticketId/close', support.closeTicket);

// Notification Logs APIs
router.get('/notifications', notification.getNotifications);
router.post('/notifications/simulate', notification.sendSimulatedNotification);

// Audit Logs (Admins only verification)
router.get('/audit-logs', async (req, res) => {
    try {
        const logs = await db.auditLogs.find();
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
