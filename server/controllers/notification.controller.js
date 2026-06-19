const db = require('../database/db_client');

const getNotifications = async (req, res) => {
    try {
        const logs = await db.notificationLogs.find();
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const sendSimulatedNotification = async (req, res) => {
    try {
        const { userId, type, recipient, message } = req.body;
        if (!type || !recipient || !message) {
            return res.status(400).json({ error: 'Type, recipient, and message are required.' });
        }

        const log = await db.notificationLogs.create({
            userId: userId || 'system',
            type,
            recipient,
            message
        });

        res.json({ success: true, log });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getNotifications,
    sendSimulatedNotification
};
