const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
    userId: { type: String },
    type: { type: String, required: true }, // WhatsApp, SMS, Email, Push
    recipient: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
