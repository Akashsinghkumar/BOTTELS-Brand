const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['customer', 'admin', 'warehouse_manager', 'delivery_agent'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
