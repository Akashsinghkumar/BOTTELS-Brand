import db from '../database/db_client.js';

export const getNotifications = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const logs = await db.notificationLogs.find({}, env);
        return res.json ? res.json(logs) : Response.json(logs);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const sendSimulatedNotification = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { userId, type, recipient, message } = body;

        if (!recipient || !message) {
            const errObj = { error: 'Recipient and message are required.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const log = await db.notificationLogs.create({
            recipient,
            channel: type || 'SMS',
            message,
            status: 'SENT'
        }, env);

        const data = { success: true, log };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default {
    getNotifications,
    sendSimulatedNotification
};
