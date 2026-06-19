const db = require('../database/db_client');

// Seeding delivery agents in memory/mock database
const mockAgents = [
    { id: 'da1', name: 'Ramesh Singh', phone: '+919988776651', city: 'Patna', lat: 25.599, lng: 85.141, status: 'Available' },
    { id: 'da2', name: 'Suresh Kumar', phone: '+919988776652', city: 'Ranchi', lat: 23.349, lng: 85.315, status: 'Available' },
    { id: 'da3', name: 'Vinay Patel', phone: '+919988776653', city: 'Mumbai', lat: 19.082, lng: 72.885, status: 'Available' },
    { id: 'da4', name: 'Priya Dey', phone: '+919988776654', city: 'Kolkata', lat: 22.578, lng: 88.370, status: 'Available' },
    { id: 'da5', name: 'Deepak Sharma', phone: '+919988776655', city: 'Delhi', lat: 28.621, lng: 77.218, status: 'Available' }
];

const getAgents = async (req, res) => {
    res.json(mockAgents);
};

const assignAgent = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { agentId } = req.body;

        const order = await db.orders.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        const agent = mockAgents.find(a => a.id === agentId);
        if (!agent) return res.status(404).json({ error: 'Agent not found.' });

        // Update agent status
        agent.status = 'Busy';

        // Update order status & delivery agent
        await db.orders.updateOne({ _id: orderId }, {
            $set: {
                deliveryAgentId: agent.id,
                status: 'Assigned',
                liveCoordinates: { lat: agent.lat, lng: agent.lng }
            }
        });

        await db.auditLogs.create({
            username: 'system',
            role: 'admin',
            action: 'DELIVERY_PARTNER_ALLOCATION',
            details: `Agent ${agent.name} assigned to order ${orderId}.`,
            ipAddress: req.ip
        });

        // WhatsApp notification simulation
        await db.notificationLogs.create({
            userId: order.customerId,
            type: 'WhatsApp',
            recipient: order.phone,
            message: `Your AQUAVIORA order ${orderId} has been assigned to delivery partner ${agent.name} (${agent.phone}). Tracker updated.`
        });

        res.json({ success: true, message: 'Agent allocated successfully.', agent });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateAgentLocation = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { lat, lng } = req.body;

        const order = await db.orders.findById(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found.' });

        // Update coordinate positions
        await db.orders.updateOne({ _id: orderId }, {
            $set: {
                liveCoordinates: { lat, lng }
            }
        });

        // If the agent is the assigned one, update their cached location
        if (order.deliveryAgentId) {
            const agent = mockAgents.find(a => a.id === order.deliveryAgentId);
            if (agent) {
                agent.lat = lat;
                agent.lng = lng;
            }
        }

        res.json({ success: true, coordinates: { lat, lng } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getAgents,
    assignAgent,
    updateAgentLocation
};
