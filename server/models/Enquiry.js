const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    enquiryType: { type: String, required: true }, // Bulk, Private Label, Distributor, General
    message: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Enquiry', EnquirySchema);
