const db = require('../database/db_client');

const getTickets = async (req, res) => {
    try {
        const tickets = await db.supportTickets.find();
        res.json(tickets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const sendTicketMessage = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { sender, text } = req.body;

        if (!sender || !text) {
            return res.status(400).json({ error: 'Sender and text are required.' });
        }

        const ticket = await db.supportTickets.findById(ticketId);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

        const updatedMessages = [...ticket.messages, { sender, text, timestamp: new Date() }];
        await db.supportTickets.updateOne({ _id: ticketId }, { $set: { messages: updatedMessages } });

        let botReply = null;

        // If the customer sent the message, trigger the automated support bot responder!
        if (sender === 'customer') {
            const query = text.toLowerCase();
            let botText = "I have received your message and notified the team. An agent will connect with you shortly.";

            // Context-Aware Bot Logic
            if (query.includes('status') || query.includes('order') || query.includes('where is')) {
                // Find latest order for this customer
                const orders = await db.orders.find({ customerId: ticket.customerId });
                if (orders.length > 0) {
                    const latest = orders[0];
                    botText = `Hi! I found your latest order (${latest._id}) placed on ${new Date(latest.createdAt).toLocaleDateString()}. Its status is currently "${latest.status}" with an ETA of ${latest.etaMinutes || 25} minutes. Tracking is active in your dashboard!`;
                } else {
                    botText = "I couldn't find any recent orders associated with your account. Please provide your order ID.";
                }
            } else if (query.includes('price') || query.includes('cost') || query.includes('rate')) {
                botText = "Our pricing standard PET bottle rates: 250ml (₹10), 500ml (₹20), 600ml (₹22), 1L (₹25-30), and 20L jar (₹25-30). We offer special discounts on orders exceeding 10 Peti cases!";
            } else if (query.includes('private label') || query.includes('brand') || query.includes('custom')) {
                botText = "To request a Private Label branding quote, select the 'Private Label' option during checkout or message our sales team on WhatsApp directly!";
            }

            // Append bot message
            botReply = { sender: 'bot', text: botText, timestamp: new Date() };
            updatedMessages.push(botReply);
            await db.supportTickets.updateOne({ _id: ticketId }, { $set: { messages: updatedMessages } });
        }

        res.json({ success: true, messages: updatedMessages });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createTicket = async (req, res) => {
    try {
        const { customerId, customerName, initialMessage } = req.body;
        if (!customerId || !customerName) {
            return res.status(400).json({ error: 'CustomerId and CustomerName are required.' });
        }

        // Check for existing open ticket for this customer
        let ticket = await db.supportTickets.findOne({ customerId, status: 'Open' });
        
        if (!ticket) {
            const messages = [];
            if (initialMessage) {
                messages.push({ sender: 'customer', text: initialMessage, timestamp: new Date() });
            }

            // Add standard welcoming bot message
            messages.push({
                sender: 'bot',
                text: `Welcome to AQUAVIORA Support, ${customerName}! I'm your AI assistant. How can I help you with your order, billing, or products today?`,
                timestamp: new Date()
            });

            ticket = await db.supportTickets.create({
                customerId,
                customerName,
                messages,
                status: 'Open'
            });
        } else if (initialMessage) {
            // If ticket already exists, append the new message
            const updatedMessages = [...ticket.messages, { sender: 'customer', text: initialMessage, timestamp: new Date() }];
            await db.supportTickets.updateOne({ _id: ticket._id }, { $set: { messages: updatedMessages } });
            ticket.messages = updatedMessages;
        }

        res.json({ success: true, ticket });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const closeTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        await db.supportTickets.updateOne({ _id: ticketId }, { $set: { status: 'Closed' } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getTickets,
    createTicket,
    sendTicketMessage,
    closeTicket
};
