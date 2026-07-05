# AQUAVIORA Support Chatbot — Real-World Implementation Prompt

Ye prompt aap directly kisi developer, freelancer, dev agency, ya AI coding tool (Claude Code, Cursor, v0.dev, Replit AI) ko de sakte hain apne existing website mein full customer support system implement karne ke liye.

---

## MASTER PROMPT (Copy-Paste Ready)

```
Build a complete, production-ready customer support chat system for the 
AQUAVIORA e-commerce website (premium water bottle brand). The system 
must have THREE connected parts: Customer Chat Widget, Backend Server, 
and Admin Dashboard. Use the existing brand color palette: Teal/Cyan 
(#00BCD4), White (#FFFFFF), Light Gray (#F5F5F5).

═══════════════════════════════════════
PART 1: CUSTOMER-FACING CHAT WIDGET
═══════════════════════════════════════

Tech: React (or vanilla JS widget embeddable via <script> tag)

Requirements:
1. Floating chat bubble icon bottom-right of every website page
2. On click, opens chat window (400x600px desktop, full-screen mobile)
3. Auto-greets logged-in user by name: "Welcome to AQUAVIORA Support, 
   {customer_name}!"
4. Bot handles FAQs automatically using a rules/AI engine (order status, 
   product info, private label info, shipping, returns)
5. Quick-reply pill buttons: "Track Order", "Private Label Quote", 
   "Talk to Agent", "Billing Issue"
6. When customer clicks "Talk to Agent" OR bot confidence score is low 
   OR customer typed 2+ unanswered messages → ESCALATE to human:
   - Show message: "Connecting you to a live agent. Average wait: 
     2 minutes."
   - Send real-time event to backend (see Part 2)
7. Real-time updates: use WebSocket (Socket.io) so admin replies appear 
   instantly without page refresh
8. Store full chat transcript with timestamps in database, linked to 
   customer_id
9. Typing indicator ("Agent is typing...") when admin is composing reply
10. File/image upload support for order photos, complaint proof, etc.
11. Chat history persists — returning customer sees previous conversation

═══════════════════════════════════════
PART 2: BACKEND SERVER (The Brain)
═══════════════════════════════════════

Tech: Node.js + Express + Socket.io (or Django + Django Channels)
Database: PostgreSQL or MongoDB

Required Database Tables/Collections:
- customers (id, name, email, phone, address, order_history)
- conversations (id, customer_id, status[open/waiting/resolved], 
  created_at, assigned_agent_id)
- messages (id, conversation_id, sender[bot/customer/agent], text, 
  timestamp, read_status)
- agents (id, name, email, phone, is_online)

Core Backend Logic:
1. Bot Response Engine:
   - First check FAQ/rules database for keyword match (order, price, 
     private label, shipping, WhatsApp, refund)
   - If no match found OR customer explicitly asks for human → mark 
     conversation status = "waiting_for_agent"
   - Integrate OpenAI/Claude API for smarter bot responses if budget 
     allows (understands "I want 200 bottles for my restro own brand 
     labeling" as a private-label lead, auto-tags it as "Sales Lead - 
     Private Label")

2. Escalation & Notification Trigger:
   When conversation status changes to "waiting_for_agent", 
   simultaneously fire:
   a) WebSocket event to Admin Dashboard (instant red-dot alert)
   b) Email notification via SendGrid/Nodemailer to support team inbox:
      Subject: "🔴 New Support Request - {customer_name}"
      Body: customer name, last message, direct link to open chat
   c) WhatsApp Business API (via Twilio or Meta Cloud API) message to 
      admin's phone: "New chat waiting: {customer_name} - {message 
      preview}"
   d) If unattended for 5+ minutes, send SMS escalation to on-call 
      manager number

3. Lead Capture for Private Label / Bulk Orders:
   Auto-detect keywords like "private label", "bulk", "restaurant", 
   "own brand", "wholesale" in customer messages → automatically create 
   a "Sales Lead" entry in CRM with customer contact + message, and 
   notify the Sales team separately (not just support team)

4. WhatsApp Number Auto-Reply Fix:
   Add a hardcoded rule: if customer message contains "whatsapp" or 
   "number" → bot instantly replies with the actual business WhatsApp 
   number and a clickable link: "https://wa.me/91XXXXXXXXXX" — do NOT 
   show generic "notified the team" message for this specific query

═══════════════════════════════════════
PART 3: ADMIN DASHBOARD (Agent Panel)
═══════════════════════════════════════

Tech: React admin panel, separate login (admin.aquaviora.com or 
/admin route with auth)

Features:
1. Login page with role-based access (Support Agent, Sales Agent, 
   Manager/Admin)

2. Left Sidebar — Live Conversation Queue:
   - 🔴 Red badge = waiting for agent (unattended)
   - 🟡 Yellow = bot currently handling
   - 🟢 Green = resolved/closed
   - Sort by: oldest waiting first, VIP customers first
   - Search/filter by customer name, order ID, date

3. Center Panel — Active Chat Window:
   - Full conversation history (same format as widget, mirrored)
   - Reply textbox for agent → sends instantly to customer via 
     WebSocket
   - Canned response templates (dropdown): "Please share your Order 
     ID", "Our WhatsApp number is...", "Private label MOQ is 500 units"
   - "Mark as Resolved" / "Escalate to Manager" / "Transfer to Sales" 
     buttons

4. Right Panel — Customer Context (CRM view):
   - Name, email, phone, registered address
   - Order history with status/tracking links
   - Cart/wishlist items
   - Past support tickets
   - Tags: "VIP", "Private Label Lead", "Complaint" (auto or manual)

5. Notification Center (top bar):
   - Real-time bell icon with unread count
   - Sound alert on new incoming chat
   - Browser push notification even when admin tab is in background

6. Analytics Dashboard (for manager):
   - Avg response time, resolution time
   - Total chats today, bot-resolved vs human-resolved ratio
   - Common queries (word cloud/chart)
   - Private label lead conversion tracking

7. Multi-agent support:
   - Multiple support staff can log in simultaneously
   - Auto-assign or manual "claim this chat" system to avoid duplicate 
     replies
   - Internal notes (visible to agents only, not customer) on each 
     conversation

═══════════════════════════════════════
PART 4: NOTIFICATION INTEGRATIONS (Setup Needed)
═══════════════════════════════════════

1. Email: SendGrid or Amazon SES account + API key
2. WhatsApp Business: Meta Cloud API or Twilio WhatsApp API — needs 
   Facebook Business verification
3. SMS: Twilio account for fallback SMS alerts
4. Push Notifications: Firebase Cloud Messaging (FCM) for browser/app 
   push alerts to admin devices
5. Slack (optional): Slack Incoming Webhook to post new-chat alerts in 
   #support-team channel

═══════════════════════════════════════
PART 5: DEPLOYMENT REQUIREMENTS
═══════════════════════════════════════

1. Host backend on Render/Railway/AWS EC2/DigitalOcean
2. Host admin dashboard separately or under /admin subpath, protected 
   by authentication (JWT-based sessions)
3. Embed chat widget script on main AQUAVIORA website via a single 
   <script src="chatwidget.js"></script> tag, no full website rewrite 
   needed
4. Use HTTPS/SSL everywhere (required for WebSocket + camera/file 
   uploads)
5. Set up environment variables for all API keys (never hardcode in 
   frontend code)
6. Add rate-limiting to prevent spam/bot abuse of chat widget

Deliver the complete codebase with:
- README with setup instructions
- .env.example file listing required API keys
- Database schema/migration files
- Basic automated tests for message send/receive flow
```

---

## Quick Alternative (No-Code / Low-Code Route)

Agar aap khud developer hire nahi karna chahte ya jaldi launch karna hai, ye ready-made tools already ye sab features de dete hain — bas embed karna hai:

| Tool | Admin Dashboard | WhatsApp Integration | Pricing |
|---|---|---|---|
| **Crisp** | ✅ Built-in | ✅ Yes | Free tier available |
| **Tidio** | ✅ Built-in | ✅ Yes | Free tier available |
| **Freshchat** | ✅ Built-in | ✅ Yes | Paid |
| **Zendesk Chat** | ✅ Built-in | ✅ Yes | Paid |

**In case, use this short prompt instead for a developer:**
```
Integrate Crisp Chat (or Tidio) live chat widget into our AQUAVIORA 
e-commerce website. Configure it to:
1. Match our teal/white brand color palette
2. Auto-route "private label" and "bulk order" keyword messages to 
   the Sales team inbox
3. Enable WhatsApp channel integration so agents can reply via 
   WhatsApp Business
4. Set up email + mobile push notifications for the admin/support team
5. Add canned responses for FAQs: order tracking, private label MOQ, 
   shipping policy, returns
```

---

### Next Step Suggestion
Custom build lagbhag **3-6 weeks** (developer team) lega, jabki **Crisp/Tidio** integration **1-2 din** mein live ho sakta hai. Agar budget/time limited hai, no-code route se start karo, baad mein scale karte waqt custom system bana lena.
