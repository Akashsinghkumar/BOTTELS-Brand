// AQUAVIORA Floating Support Chat Widget Controller

(function() {
    // Generate and inject the chat HTML structure into the DOM
    const widgetHtml = `
        <div class="chat-widget-wrapper">
            <!-- Floating Launcher Icon -->
            <div class="chat-widget-launcher" id="chatLauncher">
                <i class="fas fa-comments"></i>
            </div>
            
            <!-- Chat Card Window -->
            <div class="chat-widget-card" id="chatCard">
                <!-- Header -->
                <div class="chat-widget-header">
                    <div class="chat-widget-header-info">
                        <div class="chat-widget-avatar" id="headerAvatar">
                            <i class="fas fa-tint" style="color: white;"></i>
                        </div>
                        <div>
                            <div class="chat-widget-header-title">AQUAVIORA Support</div>
                            <div class="chat-widget-header-status">
                                <span class="chat-widget-status-dot"></span> Online now
                            </div>
                        </div>
                    </div>
                    <button class="chat-widget-close" id="chatCloseBtn" title="Close chat">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Setup / Welcome panel (if no active session) -->
                <div class="chat-widget-setup" id="chatSetupPanel" style="display: none;">
                    <i class="fas fa-headset" style="font-size: 3rem; color: var(--aq-primary); margin-bottom: 16px;"></i>
                    <h4>Start a conversation</h4>
                    <p>Tell us your name to connect with our support team and AI assistant instantly.</p>
                    <div class="form-group" style="width: 100%;">
                        <input type="text" id="setupCustName" class="form-control" placeholder="Your Name" style="margin-bottom: 12px; font-size: 0.85rem;" />
                        <button class="btn btn-primary" id="startChatBtn" style="width: 100%; font-size: 0.85rem; padding: 10px 0; border-radius: 6px;">Start Chat</button>
                    </div>
                </div>

                <!-- Chat Messages Pane -->
                <div class="chat-widget-messages" id="chatMessagesPane" style="display: flex;">
                    <!-- Message bubbles will be dynamically rendered here -->
                </div>

                <!-- Input area -->
                <div class="chat-widget-input-area" id="chatInputArea" style="display: flex;">
                    <div class="chat-widget-input-pill">
                        <button class="chat-widget-attach" onclick="alert('File attachment features coming soon!')" title="Attach file">
                            <i class="fas fa-paperclip"></i>
                        </button>
                        <input type="text" class="chat-widget-input" id="chatWidgetInputField" placeholder="Type your message..." />
                    </div>
                    <button class="chat-widget-send" id="chatWidgetSendBtn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inject into body
    const div = document.createElement('div');
    div.innerHTML = widgetHtml;
    document.body.appendChild(div);

    // DOM References
    const launcher = document.getElementById('chatLauncher');
    const card = document.getElementById('chatCard');
    const closeBtn = document.getElementById('chatCloseBtn');
    const setupPanel = document.getElementById('chatSetupPanel');
    const messagesPane = document.getElementById('chatMessagesPane');
    const inputArea = document.getElementById('chatInputArea');
    const startBtn = document.getElementById('startChatBtn');
    const inputField = document.getElementById('chatWidgetInputField');
    const sendBtn = document.getElementById('chatWidgetSendBtn');
    const headerAvatar = document.getElementById('headerAvatar');

    let activeTicketId = localStorage.getItem('aq_support_ticket_id');
    let customerName = localStorage.getItem('aq_support_customer_name');
    let isTyping = false;
    let pollInterval = null;

    // Toggle Chat Panel
    launcher.addEventListener('click', () => {
        card.classList.toggle('open');
        if (card.classList.contains('open')) {
            initSessionView();
            startPolling();
        } else {
            stopPolling();
        }
    });

    closeBtn.addEventListener('click', () => {
        card.classList.remove('open');
        stopPolling();
    });

    // Initialize/Check Session View
    function initSessionView() {
        if (!activeTicketId) {
            setupPanel.style.display = 'flex';
            messagesPane.style.display = 'none';
            inputArea.style.display = 'none';
        } else {
            setupPanel.style.display = 'none';
            messagesPane.style.display = 'flex';
            inputArea.style.display = 'flex';
            loadChatHistory();
        }
    }

    // Start Chat Trigger
    startBtn.addEventListener('click', async () => {
        const nameField = document.getElementById('setupCustName');
        const name = nameField.value.trim();
        if (!name) {
            alert('Please enter your name.');
            return;
        }

        try {
            // Create ticket session on backend
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: 'guest_' + Date.now(),
                    customerName: name,
                    initialMessage: 'User opened chat'
                })
            });
            const data = await res.json();
            if (data.success && data.ticket) {
                activeTicketId = data.ticket._id;
                customerName = name;
                localStorage.setItem('aq_support_ticket_id', activeTicketId);
                localStorage.setItem('aq_support_customer_name', customerName);
                
                setupPanel.style.display = 'none';
                messagesPane.style.display = 'flex';
                inputArea.style.display = 'flex';
                
                renderMessages(data.ticket.messages);
            }
        } catch (e) {
            console.error('Failed to create ticket:', e);
            alert('Unable to start support chat. Please try again.');
        }
    });

    // Load Chat History from Backend
    async function loadChatHistory() {
        if (!activeTicketId) return;
        try {
            const res = await fetch(`/api/support/tickets/${activeTicketId}`);
            if (res.status === 404) {
                // Clear obsolete ticket session
                clearSession();
                initSessionView();
                return;
            }
            const data = await res.json();
            if (data && data.messages) {
                renderMessages(data.messages);
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
    }

    // Render Messages list
    function renderMessages(messages) {
        messagesPane.innerHTML = '';
        
        messages.forEach((msg) => {
            const isBot = msg.sender === 'bot' || msg.sender === 'support';
            const row = document.createElement('div');
            row.className = `chat-widget-row ${isBot ? 'bot' : 'customer'}`;
            
            const avatar = document.createElement('div');
            avatar.className = `chat-widget-msg-avatar ${isBot ? 'bot-avatar' : ''}`;
            avatar.innerHTML = isBot ? '<i class="fas fa-robot"></i>' : (customerName ? customerName.substring(0, 2).toUpperCase() : 'US');
            
            const bubble = document.createElement('div');
            bubble.className = 'chat-widget-bubble';
            
            const timeText = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            bubble.innerHTML = `
                <div>${msg.text}</div>
                <span class="chat-widget-msg-time">${timeText}</span>
            `;
            
            row.appendChild(avatar);
            row.appendChild(bubble);
            messagesPane.appendChild(row);
        });

        // If the last message is from bot and isTyping is false, render suggestions
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.sender === 'bot' && !isTyping) {
            renderQuickReplies();
        }

        scrollToBottom();
    }

    // Render Quick Suggestions Pills
    function renderQuickReplies() {
        // Remove existing replies block if any
        const oldReplies = messagesPane.querySelector('.chat-widget-replies');
        if (oldReplies) oldReplies.remove();

        const repliesDiv = document.createElement('div');
        repliesDiv.className = 'chat-widget-replies';
        repliesDiv.innerHTML = `
            <button class="chat-widget-reply-btn" data-text="Track Order">Track Order</button>
            <button class="chat-widget-reply-btn" data-text="Private Label Quote">Private Label Quote</button>
            <button class="chat-widget-reply-btn" data-text="Talk to Agent">Talk to Agent</button>
        `;

        repliesDiv.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                sendMessage(text);
            });
        });

        messagesPane.appendChild(repliesDiv);
        scrollToBottom();
    }

    // Send Message
    async function sendMessage(text) {
        if (!text.trim() || !activeTicketId) return;

        // Render customer message locally immediately
        appendLocalMessage('customer', text);
        scrollToBottom();

        // Trigger typing dots
        isTyping = true;
        renderTypingIndicator();

        try {
            const res = await fetch(`/api/support/tickets/${activeTicketId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: 'customer', text: text })
            });
            const data = await res.json();
            if (data.success) {
                // Simulate typing delay for bot response
                setTimeout(() => {
                    isTyping = false;
                    removeTypingIndicator();
                    renderMessages(data.messages);
                }, 1000);
            } else {
                isTyping = false;
                removeTypingIndicator();
            }
        } catch (e) {
            isTyping = false;
            removeTypingIndicator();
            console.error('Failed to send message:', e);
        }
    }

    // Add local customer message to pane immediately
    function appendLocalMessage(sender, text) {
        const row = document.createElement('div');
        row.className = `chat-widget-row customer`;
        
        const avatar = document.createElement('div');
        avatar.className = `chat-widget-msg-avatar`;
        avatar.innerHTML = customerName ? customerName.substring(0, 2).toUpperCase() : 'US';
        
        const bubble = document.createElement('div');
        bubble.className = 'chat-widget-bubble';
        
        const timeText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        bubble.innerHTML = `
            <div>${text}</div>
            <span class="chat-widget-msg-time">${timeText}</span>
        `;
        
        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesPane.appendChild(row);
    }

    // Render Bouncing Dots Typing indicator
    function renderTypingIndicator() {
        removeTypingIndicator();
        headerAvatar.classList.add('pulse');

        const row = document.createElement('div');
        row.className = 'chat-widget-row bot typing-indicator-row';
        
        const avatar = document.createElement('div');
        avatar.className = 'chat-widget-msg-avatar bot-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const bubble = document.createElement('div');
        bubble.className = 'chat-widget-typing';
        bubble.innerHTML = `
            <span class="chat-widget-dot"></span>
            <span class="chat-widget-dot"></span>
            <span class="chat-widget-dot"></span>
        `;
        
        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesPane.appendChild(row);
        scrollToBottom();
    }

    // Remove Typing Indicator
    function removeTypingIndicator() {
        headerAvatar.classList.remove('pulse');
        const indicators = messagesPane.querySelectorAll('.typing-indicator-row');
        indicators.forEach(i => i.remove());
    }

    // Scroll chat pane to bottom
    function scrollToBottom() {
        messagesPane.scrollTop = messagesPane.scrollHeight;
    }

    // Input handlers
    inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = inputField.value.trim();
            if (val) {
                sendMessage(val);
                inputField.value = '';
            }
        }
    });

    sendBtn.addEventListener('click', () => {
        const val = inputField.value.trim();
        if (val) {
            sendMessage(val);
            inputField.value = '';
        }
    });

    // Clear obsolete ticket session
    function clearSession() {
        activeTicketId = null;
        customerName = null;
        localStorage.removeItem('aq_support_ticket_id');
        localStorage.removeItem('aq_support_customer_name');
    }

    // Polling Logic
    function startPolling() {
        stopPolling();
        pollInterval = setInterval(() => {
            if (!isTyping) {
                loadChatHistory();
            }
        }, 4000); // Poll every 4 seconds
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }
})();
