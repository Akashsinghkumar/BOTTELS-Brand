import db from '../database/db_client.js';

export const getTickets = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const tickets = await db.supportTickets.find({}, env);
        return res.json ? res.json(tickets) : Response.json(tickets);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const getTicketById = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const ticketId = req.params?.ticketId || (req.req ? req.req.param('ticketId') : null);
        const ticket = await db.supportTickets.findById(ticketId, env);
        if (!ticket) {
            const errObj = { error: 'Ticket not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }
        return res.json ? res.json(ticket) : Response.json(ticket);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const createTicket = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { customerName, customerEmail, issueType, subject, description } = body;

        const ticketId = 'TKT-' + Math.floor(1000 + Math.random() * 9000);
        const newTicket = await db.supportTickets.create({
            ticketId,
            customerName: customerName || 'Customer',
            customerEmail: customerEmail || 'customer@example.com',
            issueType: issueType || 'General Inquiry',
            subject: subject || issueType || 'Support Request',
            description: description || '',
            status: 'Open',
            messages: [{ sender: 'customer', text: description, timestamp: new Date() }]
        }, env);

        const data = { success: true, ticket: newTicket };
        return res.status ? res.status(201).json(data) : Response.json(data, { status: 201 });
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const sendTicketMessage = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const ticketId = req.params?.ticketId || (req.req ? req.req.param('ticketId') : null);
        const body = req.body || (req.json ? await req.json() : {});
        const { sender, text } = body;

        const ticket = await db.supportTickets.findById(ticketId, env);
        if (!ticket) {
            const errObj = { error: 'Ticket not found.' };
            return res.status ? res.status(404).json(errObj) : Response.json(errObj, { status: 404 });
        }

        const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
        messages.push({ sender: sender || 'user', text, timestamp: new Date() });

        await db.supportTickets.updateOne({ id: ticketId }, { messages }, env);
        const data = { success: true, messages };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const closeTicket = async (req, res) => {
    try {
        const env = req.env || (req.c ? req.c.env : null);
        const ticketId = req.params?.ticketId || (req.req ? req.req.param('ticketId') : null);
        await db.supportTickets.updateOne({ id: ticketId }, { status: 'Closed' }, env);
        const data = { success: true, message: 'Ticket closed successfully' };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default {
    getTickets,
    getTicketById,
    createTicket,
    sendTicketMessage,
    closeTicket
};
