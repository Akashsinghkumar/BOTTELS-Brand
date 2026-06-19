const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    messages: [{
        sender: { type: String, enum: ['customer', 'support', 'bot'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    status: { type: String, default: 'Open' }, // Open, Closed
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
