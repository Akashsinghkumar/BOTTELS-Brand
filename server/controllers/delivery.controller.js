import db from '../database/db_client.js';

const mockAgents = [
    { id: 'da1', name: 'Ramesh Singh', phone: '+919988776651', city: 'Patna', lat: 25.599, lng: 85.141, status: 'Available' },
    { id: 'da2', name: 'Suresh Kumar', phone: '+919988776652', city: 'Ranchi', lat: 23.349, lng: 85.315, status: 'Available' },
    { id: 'da3', name: 'Vinay Patel', phone: '+919988776653', city: 'Mumbai', lat: 19.082, lng: 72.885, status: 'Available' },
    { id: 'da4', name: 'Priya Dey', phone: '+919988776654', city: 'Kolkata', lat: 22.578, lng: 88.370, status: 'Available' },
    { id: 'da5', name: 'Deepak Sharma', phone: '+919988776655', city: 'Delhi', lat: 28.621, lng: 77.218, status: 'Available' }
];

export const getAgents = async (req, res) => {
    return res.json ? res.json(mockAgents) : Response.json(mockAgents);
};

export const assignAgent = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const orderId = req.params?.orderId || (req.req ? req.req.param('orderId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { agentId } = body;

        const order = await db.orders.findById(orderId, env);
        if (!order) {
            const errObj = { error: 'Order not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        const agent = mockAgents.find(a => a.id === agentId);
        if (!agent) {
            const errObj = { error: 'Agent not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        agent.status = 'Busy';

        await db.orders.updateOne({ id: orderId }, {
            deliveryAgentId: agent.id,
            status: 'Assigned'
        }, env);

        await db.auditLogs.create({
            username: 'system',
            role: 'admin',
            action: 'DELIVERY_PARTNER_ALLOCATION',
            details: `Agent ${agent.name} assigned to order ${orderId}.`
        }, env);

        const data = { success: true, message: 'Agent allocated successfully.', agent };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const updateAgentLocation = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const orderId = req.params?.orderId || (req.req ? req.req.param('orderId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { lat, lng } = body;

        const order = await db.orders.findById(orderId, env);
        if (!order) {
            const errObj = { error: 'Order not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        if (order.deliveryAgentId) {
            const agent = mockAgents.find(a => a.id === order.deliveryAgentId);
            if (agent) {
                agent.lat = lat;
                agent.lng = lng;
            }
        }

        const data = { success: true, coordinates: { lat, lng } };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default {
    getAgents,
    assignAgent,
    updateAgentLocation
};
