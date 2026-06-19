const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    bottleSize: { type: String }, // Backwards compatibility
    quantity: { type: Number },   // Backwards compatibility
    location: { type: String, required: true }, // Shipping address
    orderType: { type: String, default: 'Normal' }, // 'Normal' or 'Private Label'
    status: { type: String, default: 'New' }, // New, Confirmed, Processing, Dispatched, OutForDelivery, Delivered, ReturnRequested, Returned, Refunded
    items: [{
        productId: { type: String, required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    shippingAddressDetails: {
        address: String,
        landmark: String,
        city: String,
        state: String,
        pincode: String,
        lat: Number,
        lng: Number
    },
    paymentStatus: { type: String, default: 'Pending' }, // Pending, Paid, Refunded
    paymentMethod: { type: String, default: 'COD' }, // UPI, Card, COD
    warehouseId: { type: String },
    deliveryAgentId: { type: String },
    otpCode: { type: String },
    liveCoordinates: {
        lat: Number,
        lng: Number
    },
    etaMinutes: { type: Number },
    invoiceNumber: { type: String },
    invoiceUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
