const mongoose = require('mongoose');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const NotificationLog = require('../models/NotificationLog');
const SupportTicket = require('../models/SupportTicket');
const Enquiry = require('../models/Enquiry');

// In-Memory Database Store
const memoryDB = {
    users: [],
    warehouses: [],
    orders: [],
    auditLogs: [],
    notificationLogs: [],
    supportTickets: [],
    enquiries: []
};

// Seed initial memory data
const seedMemoryDB = () => {
    // 1. Seed Users (with hashed passwords - we'll check plain text check or simple match for ease in mock)
    // To make authentication extremely easy, we'll store simple passwords and match them.
    memoryDB.users = [
        { _id: 'u1', username: 'admin', email: 'admin@aquaviora.com', passwordHash: 'admin123', role: 'admin', createdAt: new Date() },
        { _id: 'u2', username: 'manager', email: 'manager@aquaviora.com', passwordHash: 'manager123', role: 'warehouse_manager', createdAt: new Date() },
        { _id: 'u3', username: 'agent', email: 'agent@aquaviora.com', passwordHash: 'agent123', role: 'delivery_agent', createdAt: new Date() },
        { _id: 'u4', username: 'customer', email: 'customer@aquaviora.com', passwordHash: 'customer123', role: 'customer', createdAt: new Date() }
    ];

    // 2. Seed Warehouses
    memoryDB.warehouses = [
        {
            _id: 'w1',
            name: 'Patna Central Warehouse',
            city: 'Patna',
            lat: 25.5941,
            lng: 85.1376,
            inventory: { '250ml': 600, '500ml': 450, '600ml': 300, '1L': 500, '20L': 120 },
            capacity: 2000
        },
        {
            _id: 'w2',
            name: 'Ranchi Hub',
            city: 'Ranchi',
            lat: 23.3441,
            lng: 85.3096,
            inventory: { '250ml': 300, '500ml': 400, '600ml': 100, '1L': 150, '20L': 50 },
            capacity: 1500
        },
        {
            _id: 'w3',
            name: 'Mumbai Port Warehouse',
            city: 'Mumbai',
            lat: 19.0760,
            lng: 72.8777,
            inventory: { '250ml': 1200, '500ml': 950, '600ml': 800, '1L': 1000, '20L': 400 },
            capacity: 5000
        },
        {
            _id: 'w4',
            name: 'Kolkata Depot',
            city: 'Kolkata',
            lat: 22.5726,
            lng: 88.3639,
            inventory: { '250ml': 400, '500ml': 300, '600ml': 250, '1L': 600, '20L': 90 },
            capacity: 2000
        },
        {
            _id: 'w5',
            name: 'Delhi NCR Hub',
            city: 'Delhi',
            lat: 28.6139,
            lng: 77.2090,
            inventory: { '250ml': 800, '500ml': 600, '600ml': 500, '1L': 850, '20L': 200 },
            capacity: 3500
        }
    ];

    // Seed some initial Audit Logs
    memoryDB.auditLogs = [
        { _id: 'a1', username: 'system', role: 'admin', action: 'SYSTEM_STARTUP', details: 'In-memory database initialized successfully.', ipAddress: '127.0.0.1', timestamp: new Date() }
    ];
};

seedMemoryDB();

// Dynamic seeding for MongoDB if it is connected and empty
const seedMongoDB = async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            const userCount = await User.countDocuments();
            if (userCount === 0) {
                console.log('Seeding initial data into MongoDB...');
                await User.insertMany([
                    { username: 'admin', email: 'admin@aquaviora.com', passwordHash: 'admin123', role: 'admin' },
                    { username: 'manager', email: 'manager@aquaviora.com', passwordHash: 'manager123', role: 'warehouse_manager' },
                    { username: 'agent', email: 'agent@aquaviora.com', passwordHash: 'agent123', role: 'delivery_agent' },
                    { username: 'customer', email: 'customer@aquaviora.com', passwordHash: 'customer123', role: 'customer' }
                ]);
            }

            const whCount = await Warehouse.countDocuments();
            if (whCount === 0) {
                await Warehouse.insertMany([
                    { name: 'Patna Central Warehouse', city: 'Patna', lat: 25.5941, lng: 85.1376, inventory: { '250ml': 600, '500ml': 450, '600ml': 300, '1L': 500, '20L': 120 }, capacity: 2000 },
                    { name: 'Ranchi Hub', city: 'Ranchi', lat: 23.3441, lng: 85.3096, inventory: { '250ml': 300, '500ml': 400, '600ml': 100, '1L': 150, '20L': 50 }, capacity: 1500 },
                    { name: 'Mumbai Port Warehouse', city: 'Mumbai', lat: 19.0760, lng: 72.8777, inventory: { '250ml': 1200, '500ml': 950, '600ml': 800, '1L': 1000, '20L': 400 }, capacity: 5000 },
                    { name: 'Kolkata Depot', city: 'Kolkata', lat: 22.5726, lng: 88.3639, inventory: { '250ml': 400, '500ml': 300, '600ml': 250, '1L': 600, '20L': 90 }, capacity: 2000 },
                    { name: 'Delhi NCR Hub', city: 'Delhi', lat: 28.6139, lng: 77.2090, inventory: { '250ml': 800, '500ml': 600, '600ml': 500, '1L': 850, '20L': 200 }, capacity: 3500 }
                ]);
            }
        }
    } catch (e) {
        console.error('Error seeding MongoDB:', e);
    }
};

// Listen for connection to seed MongoDB
mongoose.connection.once('open', seedMongoDB);

// Helper for memory collection interface
class MemoryCollectionWrapper {
    constructor(key, mongooseModel) {
        this.key = key;
        this.model = mongooseModel;
    }

    isMongo() {
        return mongoose.connection.readyState === 1;
    }

    async find(query = {}) {
        if (this.isMongo()) {
            return await this.model.find(query).sort({ createdAt: -1 });
        } else {
            return memoryDB[this.key]
                .filter(item => {
                    for (let k in query) {
                        if (query[k] !== undefined && item[k] !== query[k]) return false;
                    }
                    return true;
                })
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
    }

    async findOne(query = {}) {
        if (this.isMongo()) {
            return await this.model.findOne(query);
        } else {
            const list = await this.find(query);
            return list[0] || null;
        }
    }

    async findById(id) {
        if (this.isMongo()) {
            return await this.model.findById(id);
        } else {
            return memoryDB[this.key].find(item => item._id === id) || null;
        }
    }

    async create(docData) {
        if (this.isMongo()) {
            const newDoc = new this.model(docData);
            return await newDoc.save();
        } else {
            const newDoc = {
                _id: 'mem_' + Math.random().toString(36).substr(2, 9),
                createdAt: new Date(),
                ...docData
            };
            memoryDB[this.key].push(newDoc);
            return newDoc;
        }
    }

    async updateOne(query = {}, updateData = {}) {
        if (this.isMongo()) {
            return await this.model.updateOne(query, updateData);
        } else {
            const doc = await this.findOne(query);
            if (doc) {
                // If it's a $set operation
                if (updateData.$set) {
                    Object.assign(doc, updateData.$set);
                } else {
                    Object.assign(doc, updateData);
                }
                return { nModified: 1, modifiedCount: 1 };
            }
            return { nModified: 0, modifiedCount: 0 };
        }
    }

    async deleteOne(query = {}) {
        if (this.isMongo()) {
            return await this.model.deleteOne(query);
        } else {
            const index = memoryDB[this.key].findIndex(item => {
                for (let k in query) {
                    if (item[k] !== query[k]) return false;
                }
                return true;
            });
            if (index !== -1) {
                memoryDB[this.key].splice(index, 1);
                return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
        }
    }
}

// Unified client exports
module.exports = {
    users: new MemoryCollectionWrapper('users', User),
    warehouses: new MemoryCollectionWrapper('warehouses', Warehouse),
    orders: new MemoryCollectionWrapper('orders', Order),
    auditLogs: new MemoryCollectionWrapper('auditLogs', AuditLog),
    notificationLogs: new MemoryCollectionWrapper('notificationLogs', NotificationLog),
    supportTickets: new MemoryCollectionWrapper('supportTickets', SupportTicket),
    enquiries: new MemoryCollectionWrapper('enquiries', Enquiry),
    getMemoryStore: () => memoryDB // exposed for debugging or logs
};
