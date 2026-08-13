// Unified Database Client for Cloudflare D1 SQL & Local Node Environment
// Eliminates MongoDB dependency for Cloudflare serverless native execution

const memoryDB = {
    users: [],
    warehouses: [],
    orders: [],
    auditLogs: [],
    notificationLogs: [],
    supportTickets: [],
    enquiries: []
};

// Seed initial memory data for local development and testing
const seedMemoryDB = () => {
    memoryDB.users = [
        { _id: 'u1', username: 'admin', email: 'admin@aquaviora.com', passwordHash: 'admin123', role: 'admin', createdAt: new Date() },
        { _id: 'u2', username: 'manager', email: 'manager@aquaviora.com', passwordHash: 'manager123', role: 'warehouse_manager', createdAt: new Date() },
        { _id: 'u3', username: 'agent', email: 'agent@aquaviora.com', passwordHash: 'agent123', role: 'delivery_agent', createdAt: new Date() },
        { _id: 'u4', username: 'customer', email: 'customer@aquaviora.com', passwordHash: 'customer123', role: 'customer', createdAt: new Date() }
    ];

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

    memoryDB.auditLogs = [
        { _id: 'a1', username: 'system', role: 'admin', action: 'SYSTEM_STARTUP', details: 'Cloudflare D1 database interface initialized.', ipAddress: '127.0.0.1', timestamp: new Date() }
    ];
};

seedMemoryDB();

// Database Collection Abstraction Class
class CollectionWrapper {
    constructor(key) {
        this.key = key;
    }

    getD1(env) {
        return (env && env.DB) || (typeof DB !== 'undefined' ? DB : null);
    }

    async find(query = {}, env) {
        const d1 = this.getD1(env);
        if (d1) {
            try {
                const res = await d1.prepare(`SELECT * FROM ${this.key} ORDER BY created_at DESC`).all();
                return res.results || [];
            } catch (e) {
                console.error(`D1 Query Error (${this.key}):`, e);
            }
        }

        // Local In-Memory Fallback
        return memoryDB[this.key]
            .filter(item => {
                for (let k in query) {
                    if (query[k] !== undefined && item[k] !== query[k]) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    async findOne(query = {}, env) {
        const list = await this.find(query, env);
        return list[0] || null;
    }

    async findById(id, env) {
        const d1 = this.getD1(env);
        if (d1) {
            try {
                const res = await d1.prepare(`SELECT * FROM ${this.key} WHERE id = ?`).bind(id).first();
                return res || null;
            } catch (e) {
                console.error(`D1 findById Error (${this.key}):`, e);
            }
        }
        return memoryDB[this.key].find(item => item._id === id || item.id === id) || null;
    }

    async create(docData, env) {
        const id = docData._id || docData.id || 'id_' + Math.random().toString(36).substr(2, 9);
        const newDoc = {
            _id: id,
            id: id,
            createdAt: new Date(),
            ...docData
        };

        const d1 = this.getD1(env);
        if (d1) {
            try {
                const keys = Object.keys(docData).join(', ');
                const placeholders = Object.keys(docData).map(() => '?').join(', ');
                const values = Object.values(docData).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
                await d1.prepare(`INSERT INTO ${this.key} (id, ${keys}) VALUES (?, ${placeholders})`).bind(id, ...values).run();
            } catch (e) {
                console.error(`D1 Insert Error (${this.key}):`, e);
            }
        }

        memoryDB[this.key].push(newDoc);
        return newDoc;
    }

    async updateOne(query = {}, updateData = {}, env) {
        const d1 = this.getD1(env);
        const dataToUpdate = updateData.$set ? updateData.$set : updateData;

        if (d1 && query.id) {
            try {
                const setClause = Object.keys(dataToUpdate).map(k => `${k} = ?`).join(', ');
                const values = Object.values(dataToUpdate).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
                await d1.prepare(`UPDATE ${this.key} SET ${setClause} WHERE id = ?`).bind(...values, query.id).run();
            } catch (e) {
                console.error(`D1 Update Error (${this.key}):`, e);
            }
        }

        const doc = await this.findOne(query, env);
        if (doc) {
            Object.assign(doc, dataToUpdate);
            return { nModified: 1, modifiedCount: 1 };
        }
        return { nModified: 0, modifiedCount: 0 };
    }

    async deleteOne(query = {}, env) {
        const d1 = this.getD1(env);
        if (d1 && query.id) {
            try {
                await d1.prepare(`DELETE FROM ${this.key} WHERE id = ?`).bind(query.id).run();
            } catch (e) {
                console.error(`D1 Delete Error (${this.key}):`, e);
            }
        }

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

module.exports = {
    users: new CollectionWrapper('users'),
    warehouses: new CollectionWrapper('warehouses'),
    orders: new CollectionWrapper('orders'),
    auditLogs: new CollectionWrapper('auditLogs'),
    notificationLogs: new CollectionWrapper('notificationLogs'),
    supportTickets: new CollectionWrapper('supportTickets'),
    enquiries: new CollectionWrapper('enquiries'),
    getMemoryStore: () => memoryDB
};
