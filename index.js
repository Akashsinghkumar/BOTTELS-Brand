import { Hono } from 'hono';
import { cors } from 'hono/cors';

import db from './server/database/db_client.js';
import { predictETA, getOptimizedRoute, getDemandForecast } from './server/controllers/ai.controller.js';
import { getWarehouses, restockWarehouse } from './server/controllers/inventory.controller.js';
import { createOrder, updateOrderStatus, verifyOTP as verifyOrderOTP, requestReturn, approveReturn, getInvoice } from './server/controllers/order.controller.js';
import { getTickets, getTicketById, createTicket, sendTicketMessage, closeTicket } from './server/controllers/support.controller.js';
import { getNotifications, sendSimulatedNotification } from './server/controllers/notification.controller.js';
import { signup, login, sendOTP, verifyOTP, completeRegistration } from './server/controllers/auth.controller.js';
import { getAgents, assignAgent, updateAgentLocation } from './server/controllers/delivery.controller.js';

const app = new Hono();

app.use('*', cors());

// Health Check
app.get('/api/health', (c) => c.json({ status: 'ok', platform: 'Cloudflare Workers & D1 Database' }));

// Auth Routes
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/send-otp', sendOTP);
app.post('/api/auth/verify-otp', verifyOTP);
app.post('/api/auth/complete-registration', completeRegistration);

// Order Placement & Management
app.post('/api/order', createOrder);
app.post('/api/orders', createOrder);
app.put('/api/orders/status/:orderId', updateOrderStatus);
app.post('/api/orders/verify-otp/:orderId', verifyOrderOTP);
app.post('/api/orders/return/:orderId', requestReturn);
app.post('/api/orders/approve-return/:orderId', approveReturn);
app.get('/api/orders/invoice/:invoiceNumber', getInvoice);

app.get('/api/orders', async (c) => {
    try {
        const role = c.req.query('role');
        const userId = c.req.query('userId');
        const warehouseId = c.req.query('warehouseId');
        const deliveryAgentId = c.req.query('deliveryAgentId');
        let query = {};

        if (role === 'customer' && userId) query.customerId = userId;
        else if (role === 'warehouse_manager' && warehouseId) query.warehouseId = warehouseId;
        else if (role === 'delivery_agent' && deliveryAgentId) query.deliveryAgentId = deliveryAgentId;

        const list = await db.orders.find(query, c.env);
        return c.json(list);
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

app.get('/api/orders/:orderId', async (c) => {
    try {
        const item = await db.orders.findById(c.req.param('orderId'), c.env);
        if (!item) return c.json({ error: 'Order not found' }, 404);
        return c.json(item);
    } catch (e) {
        return c.json({ error: e.message }, 500);
    }
});

// Admin Routes
app.get('/api/admin/orders', async (c) => {
    try {
        const orders = await db.orders.find({}, c.env);
        return c.json(orders);
    } catch (e) {
        return c.json({ error: 'Failed to fetch orders' }, 500);
    }
});

app.get('/api/admin/enquiries', async (c) => {
    try {
        const enquiries = await db.enquiries.find({}, c.env);
        return c.json(enquiries);
    } catch (e) {
        return c.json({ error: 'Failed to fetch enquiries' }, 500);
    }
});

app.post('/api/enquiry', async (c) => {
    try {
        const body = await c.req.json();
        const newEnquiry = await db.enquiries.create(body, c.env);
        return c.json({ success: true, message: 'Enquiry received', enquiry: newEnquiry }, 201);
    } catch (e) {
        return c.json({ success: false, message: 'Server error' }, 500);
    }
});

// Inventory APIs
app.get('/api/inventory/warehouses', getWarehouses);
app.post('/api/inventory/restock/:warehouseId', restockWarehouse);

// Delivery APIs
app.get('/api/delivery/agents', getAgents);
app.post('/api/delivery/assign/:orderId', assignAgent);
app.post('/api/delivery/location/:orderId', updateAgentLocation);

// AI Predictor APIs
app.post('/api/ai/predict-eta', predictETA);
app.post('/api/ai/optimize-route', getOptimizedRoute);
app.get('/api/ai/forecast-demand', getDemandForecast);

// Support APIs
app.get('/api/support/tickets', getTickets);
app.get('/api/support/tickets/:ticketId', getTicketById);
app.post('/api/support/tickets', createTicket);
app.post('/api/support/tickets/:ticketId/messages', sendTicketMessage);
app.post('/api/support/tickets/:ticketId/close', closeTicket);

// Notification APIs
app.get('/api/notifications', getNotifications);
app.post('/api/notifications/simulate', sendSimulatedNotification);

// Cloudflare Workers Native ES Module Export
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api')) {
            return app.fetch(request, env, ctx);
        }
        if (env && env.ASSETS) {
            return env.ASSETS.fetch(request);
        }
        return new Response('Not Found', { status: 404 });
    }
};
