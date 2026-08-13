const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database/db_client');
const { initGoogleSheets, appendOrder, appendEnquiry } = require('./services/googleSheets');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Services
initGoogleSheets();

// Mount New Modular API Router
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Serve Built React Client under /dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));

// Serve Root Static Frontend (AQUAVIORA Landing Page)
app.use(express.static(path.join(__dirname, '../public')));

// Legacy Routes (Backwards Compatibility)
app.post('/api/order', async (req, res) => {
    try {
        const newOrder = await db.orders.create(req.body);
        await appendOrder(req.body); // Sync to Sheets
        res.status(201).json({ success: true, message: 'Order placed successfully', order: newOrder });
    } catch (error) {
        console.error('Order Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/enquiry', async (req, res) => {
    try {
        const newEnquiry = await db.enquiries.create(req.body);
        await appendEnquiry(req.body); // Sync to Sheets
        res.status(201).json({ success: true, message: 'Enquiry received', enquiry: newEnquiry });
    } catch (error) {
        console.error('Enquiry Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Admin Routes (Legacy Compatibility)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await db.orders.find();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.get('/api/admin/enquiries', async (req, res) => {
    try {
        const enquiries = await db.enquiries.find();
        res.json(enquiries);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch enquiries' });
    }
});

// SPA routing fallback for Dashboard
app.get(/^\/dashboard/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard/index.html'));
});

// Fallback for root (if static files fail)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export app for Cloudflare Workers / Serverless compatibility
module.exports = app;

// Only listen if executed directly
if (require.main === module || !process.env.CF_PAGES) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Dashboard client served on http://localhost:${PORT}/dashboard`);
    });
}
