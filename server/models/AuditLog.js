const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    userId: { type: String },
    username: { type: String, required: true },
    role: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String },
    ipAddress: { type: String },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
