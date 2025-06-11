/**
 * Main WebSocket STOMP client module
 */

import { authManager } from './auth.js';
import { reconnectManager } from './reconnect.js';
import { messageStorage } from './storage.js';

export class STOMPWebSocketClient {
    constructor() {
        this.stompClient = null;
        this.subscribedTopics = new Map(); // Map pour stocker les subscriptions
        this.isConnected = false;
        this.reconnecting = false;
        this.messageCache = [];
        this.currentFilter = '';
        this.currentTopicFilter = '';

        this.initializeElements();
        this.bindEvents();

        // Charger les messages historiques si disponibles
        if (messageStorage.isStorageEnabled()) {
            this.loadHistoricalMessages();
        }
    }

    initializeElements() {
        this.elements = {
            wsUrl: document.getElementById('wsUrl'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            connectBtn: document.getElementById('connectBtn'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            connectionMessage: document.getElementById('connectionMessage'),
            topicPath: document.getElementById('topicPath'),
            subscribeBtn: document.getElementById('subscribeBtn'),
            topicsList: document.getElementById('topicsList'),
            sendDestination: document.getElementById('sendDestination'),
            sendMessage: document.getElementById('sendMessage'),
            sendBtn: document.getElementById('sendBtn'),
            messagesConsole: document.getElementById('messagesConsole'),
            clearBtn: document.getElementById('clearBtn')
        };
    }

    bindEvents() {
        this.elements.connectBtn.addEventListener('click', () => this.connect());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.subscribeBtn.addEventListener('click', () => this.subscribe());
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.clearBtn.addEventListener('click', () => this.clearMessages());

        // Événements clavier
        this.elements.topicPath.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.subscribe();
        });

        this.elements.sendMessage.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        this.elements.wsUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connect();
        });
    }

    connect() {
        const url = this.elements.wsUrl.value.trim();
        if (!url) {
            this.showMessage('Please enter a valid WebSocket URL', 'error');
            return;
        }

        try {
            this.showMessage('🔄 STOMP connection in progress...', 'info');
            this.addMessage('🔄 Attempting STOMP connection...', 'SYSTEM');

            // Create STOMP client
            const socket = new SockJS(url);
            this.stompClient = Stomp.over(socket);

            // STOMP client configuration
            this.stompClient.heartbeat.outgoing = 20000; // 20 seconds
            this.stompClient.heartbeat.incoming = 20000; // 20 seconds

            // Reduce debug logs (optional)
            this.stompClient.debug = (str) => {
                console.log('STOMP: ' + str);
            };

            // Connection headers
            let connectHeaders = {};

            // Add basic authentication information
            if (this.elements.username.value.trim()) {
                connectHeaders.login = this.elements.username.value.trim();
            }
            if (this.elements.password.value.trim()) {
                connectHeaders.passcode = this.elements.password.value.trim();
            }

            // Add JWT/OAuth2 token if available
            connectHeaders = authManager.applyAuthHeaders(connectHeaders);

            // Connection
            this.stompClient.connect(
                connectHeaders,
                (frame) => this.onConnected(frame),    // Success
                (error) => this.onError(error)         // Error
            );

        } catch (error) {
            this.showMessage(`❌ Connection error: ${error.message}`, 'error');
            this.addMessage(`❌ Error: ${error.message}`, 'SYSTEM');
        }
    }

    /**
     * Attempts to reconnect after connection loss
     */
    reconnect() {
        if (this.reconnecting || this.isConnected) return;

        this.reconnecting = true;
        this.addMessage('🔄 Attempting to reconnect...', 'SYSTEM');
        this.connect();
    }

    disconnect() {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.disconnect(() => {
                this.addMessage('🔌 STOMP disconnection successful', 'SYSTEM');
                this.onClosed();
            });
        }
    }

    subscribe() {
        const topic = this.elements.topicPath.value.trim();
        if (!topic) {
            this.showMessage('Please enter a valid topic', 'error');
            return;
        }

        if (this.subscribedTopics.has(topic)) {
            this.showMessage('Already subscribed to this topic', 'error');
            return;
        }

        if (this.stompClient && this.stompClient.connected) {
            try {
                // STOMP subscription
                const subscription = this.stompClient.subscribe(topic, (message) => {
                    this.onMessageReceived(topic, message);
                });

                // Store the subscription
                this.subscribedTopics.set(topic, subscription);
                this.addTopicTag(topic);
                this.elements.topicPath.value = '';
                this.addMessage(`✅ Subscribed to topic: ${topic}`, 'SYSTEM');

                // Update topic selector for filtering
                this.updateTopicSelector();

            } catch (error) {
                this.showMessage(`Subscription error: ${error.message}`, 'error');
            }
        }
    }

    sendMessage() {
        const destination = this.elements.sendDestination.value.trim();
        const message = this.elements.sendMessage.value.trim();

        if (!destination || !message) {
            this.showMessage('Please fill in both destination and message', 'error');
            return;
        }

        if (this.stompClient && this.stompClient.connected) {
            try {
                // Send message with STOMP
                this.stompClient.send(destination, {}, message);

                // Add to interface and history
                const timestamp = new Date().toISOString();
                const messageObj = {
                    content: message,
                    topic: 'SENT:' + destination,
                    timestamp,
                    headers: {}
                };

                this.addMessage(message, 'SENT:' + destination, {}, false, null);

                // Save to history if enabled
                if (messageStorage.isStorageEnabled()) {
                    messageStorage.saveMessage(messageObj);
                }

                this.elements.sendMessage.value = '';

            } catch (error) {
                this.showMessage(`Sending error: ${error.message}`, 'error');
            }
        }
    }

    onConnected(frame) {
        this.isConnected = true;
        this.reconnecting = false;
        this.elements.connectionStatus.classList.add('connected');
        this.elements.connectBtn.disabled = true;
        this.elements.disconnectBtn.disabled = false;
        this.elements.topicPath.disabled = false;
        this.elements.subscribeBtn.disabled = false;
        this.elements.sendDestination.disabled = false;
        this.elements.sendMessage.disabled = false;
        this.elements.sendBtn.disabled = false;

        this.showMessage('✅ STOMP connection successfully established!', 'success');
        this.clearMessages();
        this.addMessage('🔗 STOMP connection established', 'SYSTEM');
        this.addMessage(`📋 Session ID: ${frame.headers.session || 'N/A'}`, 'SYSTEM');
        this.addMessage(`🖥️ Server: ${frame.headers.server || 'N/A'}`, 'SYSTEM');
        this.addMessage(`💓 Heartbeat: ${this.stompClient.heartbeat.outgoing}ms`, 'SYSTEM');

        // Stop the reconnection manager if active
        reconnectManager.reset();

    }

    onError(error) {
        this.isConnected = false;
        this.showMessage('❌ STOMP connection error', 'error');
        this.addMessage(`❌ STOMP error: ${error}`, 'SYSTEM');
        this.resetConnectionState();

        // Handle automatic reconnection if enabled
        if (document.getElementById('enableReconnect') && document.getElementById('enableReconnect').checked) {
            reconnectManager.startReconnection();
            this.addMessage('🔄 Automatic reconnection attempt scheduled...', 'SYSTEM');
        }

        // Update client interface
        this.updateClientUI();
        this.reconnecting = false;
    }

    onClosed() {
        this.isConnected = false;
        this.resetConnectionState();
        this.addMessage('🔌 STOMP connection closed', 'SYSTEM');
        this.updateClientUI();
    }

    // Enhanced onMessageReceived method
    onMessageReceived(topic, message) {
        try {
            let content = message.body;
            let isJson = false;
            let jsonObject = null;

            // Try to parse JSON
            try {
                jsonObject = JSON.parse(content);
                isJson = true;
            } catch (e) {
                // Not JSON, keep original content
                isJson = false;
            }

            // Add to the interface
            this.addMessage(content, topic, message.headers, isJson, jsonObject);

            // Save to history if enabled
            if (messageStorage.isStorageEnabled()) {
                const timestamp = new Date().toISOString();
                messageStorage.saveMessage({
                    content,
                    topic,
                    timestamp,
                    headers: message.headers,
                    isJson,
                    jsonObject: isJson ? jsonObject : null
                });
            }

        } catch (error) {
            this.addMessage(`Processing error: ${error.message}`, 'ERROR');
        }
    }

    resetConnectionState() {
        this.elements.connectionStatus.classList.remove('connected');
        this.elements.connectBtn.disabled = false;
        this.elements.disconnectBtn.disabled = true;
        this.elements.topicPath.disabled = true;
        this.elements.subscribeBtn.disabled = true;
        this.elements.sendDestination.disabled = true;
        this.elements.sendMessage.disabled = true;
        this.elements.sendBtn.disabled = true;

        // Clean up subscriptions
        this.subscribedTopics.clear();
        this.clearTopicTags();
        this.updateTopicSelector();
    }

    showMessage(text, type) {
        this.elements.connectionMessage.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => {
            this.elements.connectionMessage.innerHTML = '';
        }, 5000);
    }

    addTopicTag(topic) {
        const tag = document.createElement('div');
        tag.className = 'topic-tag';
        tag.innerHTML = `
            <span>${topic}</span>
            <button class="topic-remove" data-topic="${topic}">×</button>
        `;

        // Utiliser une closure pour conserver le contexte
        const self = this;
        tag.querySelector('.topic-remove').addEventListener('click', function() {
            const topicToRemove = this.getAttribute('data-topic');
            self.removeTopic(topicToRemove);
        });

        this.elements.topicsList.appendChild(tag);
    }

    removeTopic(topic) {
        // Unsubscribe with STOMP
        const subscription = this.subscribedTopics.get(topic);
        if (subscription) {
            subscription.unsubscribe();
            this.subscribedTopics.delete(topic);
        }

        // Remove visual tag
        const tags = this.elements.topicsList.querySelectorAll('.topic-tag');
        tags.forEach(tag => {
            if (tag.textContent.includes(topic)) {
                tag.remove();
            }
        });

        this.addMessage(`❌ Unsubscribed from topic: ${topic}`, 'SYSTEM');
        this.updateTopicSelector();
    }

    clearTopicTags() {
        this.elements.topicsList.innerHTML = '';
    }

    // Enhanced addMessage method
    addMessage(content, topic, headers = {}, isJson = false, jsonObject = null) {
        const timestamp = new Date().toLocaleTimeString();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-item';

        // Add data for filtering
        messageDiv.setAttribute('data-topic', topic);
        messageDiv.setAttribute('data-content', content);
        messageDiv.setAttribute('data-timestamp', timestamp);

        // Identify if it's a history message
        if (topic.startsWith('HISTORY:')) {
            messageDiv.classList.add('history');
            topic = topic.replace('HISTORY:', '');
        }

        // Display headers if they exist
        let headersInfo = '';
        if (Object.keys(headers).length > 0) {
            headersInfo = `
                <div class="message-headers">
                    <strong>📋 Headers:</strong>
                    <pre class="headers-content">${JSON.stringify(headers, null, 2)}</pre>
                </div>`;
        }

        // Format content based on whether it's JSON or not
        let formattedContent = '';
        if (isJson && jsonObject !== null) {
            formattedContent = `
                <div class="json-content">
                    <div class="json-formatted">
                        ${this.formatJsonToHtml(jsonObject)}
                    </div>
                    <details class="raw-json">
                        <summary>Show raw JSON</summary>
                        <pre>${JSON.stringify(jsonObject, null, 2)}</pre>
                    </details>
                </div>`;
        } else {
            formattedContent = `<div class="text-content">${this.escapeHtml(content)}</div>`;
        }

        // Special class for sent messages
        const sentClass = topic.startsWith('SENT:') ? 'sent-message-log' : '';

        // Badge for history
        const historyBadge = messageDiv.classList.contains('history') ? 
            '<span class="history-badge">History</span>' : '';

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-timestamp">[${timestamp}]</span>
                <span class="message-topic">${topic}</span>
                ${isJson ? '<span class="json-badge">JSON</span>' : ''}
                ${historyBadge}
            </div>
            <div class="message-body ${sentClass}">
                ${formattedContent}
                ${headersInfo}
            </div>
        `;

        this.elements.messagesConsole.appendChild(messageDiv);
        this.elements.messagesConsole.scrollTop = this.elements.messagesConsole.scrollHeight;

        // Ajouter au cache pour le filtrage
        this.messageCache.push({
            element: messageDiv,
            topic,
            content
        });

        // Appliquer les filtres courants
        this.applyFilters();
    }

    clearMessages() {
        this.elements.messagesConsole.innerHTML = '';
        this.messageCache = [];
    }

    // Méthode pour formater récursivement un objet JSON en HTML
    formatJsonToHtml(obj, indent = 0) {
        const indentStr = '  '.repeat(indent);
        let html = '';

        if (obj === null) {
            return '<span class="json-null">null</span>';
        }

        if (typeof obj === 'string') {
            return `<span class="json-string">"${this.escapeHtml(obj)}"</span>`;
        }

        if (typeof obj === 'number') {
            return `<span class="json-number">${obj}</span>`;
        }

        if (typeof obj === 'boolean') {
            return `<span class="json-boolean">${obj}</span>`;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) {
                return '<span class="json-array">[]</span>';
            }

            html += '<span class="json-bracket">[</span><br>';
            obj.forEach((item, index) => {
                html += `${indentStr}  ${this.formatJsonToHtml(item, indent + 1)}`;
                if (index < obj.length - 1) {
                    html += '<span class="json-comma">,</span>';
                }
                html += '<br>';
            });
            html += `${indentStr}<span class="json-bracket">]</span>`;
            return html;
        }

        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) {
                return '<span class="json-object">{}</span>';
            }

            html += '<span class="json-bracket">{</span><br>';
            keys.forEach((key, index) => {
                html += `${indentStr}  <span class="json-key">"${this.escapeHtml(key)}"</span><span class="json-colon">:</span> `;
                html += this.formatJsonToHtml(obj[key], indent + 1);
                if (index < keys.length - 1) {
                    html += '<span class="json-comma">,</span>';
                }
                html += '<br>';
            });
            html += `${indentStr}<span class="json-bracket">}</span>`;
            return html;
        }

        return String(obj);
    }

    // Méthode utilitaire pour échapper le HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Load historical messages from local storage
     */
    loadHistoricalMessages() {
        const messages = messageStorage.getMessages();
        messages.forEach(msg => {
            // Load only messages for this client
            if (msg.clientId === this.clientId) {
                this.addMessage(
                    msg.content,
                    'HISTORY:' + msg.topic,
                    msg.headers || {},
                    msg.isJson || false,
                    msg.jsonObject || null
                );
            }
        });
    }

    /**
     * Update topic selector for filtering
     */
    updateTopicSelector() {
        const topicFilter = document.getElementById('topicFilter');
        if (!topicFilter) return;

        // Save current selection
        const currentValue = topicFilter.value;

        // Reset
        topicFilter.innerHTML = '<option value="">All topics</option>';

        // Add topics from active client
        const topics = Array.from(this.subscribedTopics.keys());
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicFilter.appendChild(option);
        });

        // Restore selection if possible
        if (currentValue && topics.includes(currentValue)) {
            topicFilter.value = currentValue;
        }
    }

    /**
     * Filter displayed messages based on a search term
     * @param {string} query - Search term
     */
    filterMessages(query) {
        this.currentFilter = query.toLowerCase();
        this.applyFilters();
    }

    /**
     * Filter messages by topic
     * @param {string} topic - Topic to filter
     */
    filterByTopic(topic) {
        this.currentTopicFilter = topic;
        this.applyFilters();
    }

    /**
     * Apply active filters to messages
     */
    applyFilters() {
        this.messageCache.forEach(item => {
            const matchesTopic = !this.currentTopicFilter || 
                                item.topic === this.currentTopicFilter || 
                                item.topic === 'HISTORY:' + this.currentTopicFilter || 
                                item.topic.replace('HISTORY:', '') === this.currentTopicFilter;

            const matchesSearch = !this.currentFilter || 
                                item.topic.toLowerCase().includes(this.currentFilter) || 
                                item.content.toLowerCase().includes(this.currentFilter);

            item.element.style.display = (matchesTopic && matchesSearch) ? 'block' : 'none';
        });
    }

    /**
     * Update user interface for multi-client mode
     */
    updateClientUI() {
        const clientsList = document.getElementById('clientsList');
        if (!clientsList) return;

        // Update connection status in client list
        const clientCard = clientsList.querySelector(`[data-client-id="${this.clientId}"]`);
        if (clientCard) {
            const statusElement = clientCard.querySelector('.client-status');
            if (statusElement) {
                statusElement.className = `client-status ${this.isConnected ? 'connected' : 'disconnected'}`;
                statusElement.textContent = this.isConnected ? 'Connected' : 'Disconnected';
            }
        }

        // Update active client info
        const activeClientInfo = document.getElementById('activeClientInfo');
        if (activeClientInfo) {
            const clientDetails = activeClientInfo.querySelector('.client-details');
            if (clientDetails) {
                const statusValue = clientDetails.querySelector('.client-detail-value');
                if (statusValue) {
                    statusValue.innerHTML = this.isConnected ? '✅ Connected' : '❌ Disconnected';
                }
            }
        }
    }
}
