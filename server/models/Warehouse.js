const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema({
    name: { type: String, required: true },
    city: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    inventory: {
        '250ml': { type: Number, default: 500 },
        '500ml': { type: Number, default: 500 },
        '600ml': { type: Number, default: 500 },
        '1L': { type: Number, default: 500 },
        '20L': { type: Number, default: 500 }
    },
    capacity: { type: Number, default: 2000 }
});

module.exports = mongoose.model('Warehouse', WarehouseSchema);
