class STOMPWebSocketClient {
            constructor() {
                this.stompClient = null;
                this.subscribedTopics = new Map(); // Map pour stocker les subscriptions
                this.isConnected = false;
                this.initializeElements();
                this.bindEvents();
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
                    this.showMessage('Veuillez entrer une URL WebSocket valide', 'error');
                    return;
                }

                try {
                    this.showMessage('🔄 Connexion STOMP en cours...', 'info');
                    this.addMessage('🔄 Tentative de connexion STOMP...', 'SYSTEM');

                    // Créer le client STOMP
                    //const socket = new SockJS ? new SockJS(url) : new WebSocket(url);
                    const socket = new SockJS(url);
                    this.stompClient = Stomp.over(socket);

                    // Configuration du client STOMP
                    this.stompClient.heartbeat.outgoing = 20000; // 20 secondes
                    this.stompClient.heartbeat.incoming = 20000; // 20 secondes
                    
                    // Réduire les logs de debug (optionnel)
                    this.stompClient.debug = (str) => {
                        console.log('STOMP: ' + str);
                    };

                    // Headers de connexion
                    const connectHeaders = {};
                    if (this.elements.username.value.trim()) {
                        connectHeaders.login = this.elements.username.value.trim();
                    }
                    if (this.elements.password.value.trim()) {
                        connectHeaders.passcode = this.elements.password.value.trim();
                    }

                    // Connexion
                    this.stompClient.connect(
                        connectHeaders,
                        (frame) => this.onConnected(frame),    // Succès
                        (error) => this.onError(error)         // Erreur
                    );

                } catch (error) {
                    this.showMessage(`❌ Erreur de connexion: ${error.message}`, 'error');
                    this.addMessage(`❌ Erreur: ${error.message}`, 'SYSTEM');
                }
            }

            disconnect() {
                if (this.stompClient && this.stompClient.connected) {
                    this.stompClient.disconnect(() => {
                        this.addMessage('🔌 Déconnexion STOMP réussie', 'SYSTEM');
                    });
                }
            }

            subscribe() {
                const topic = this.elements.topicPath.value.trim();
                if (!topic) {
                    this.showMessage('Veuillez entrer un topic valide', 'error');
                    return;
                }

                if (this.subscribedTopics.has(topic)) {
                    this.showMessage('Déjà abonné à ce topic', 'error');
                    return;
                }

                if (this.stompClient && this.stompClient.connected) {
                    try {
                        // Souscription avec STOMP
                        const subscription = this.stompClient.subscribe(topic, (message) => {
                            this.onMessageReceived(topic, message);
                        });

                        // Stocker la souscription
                        this.subscribedTopics.set(topic, subscription);
                        this.addTopicTag(topic);
                        this.elements.topicPath.value = '';
                        this.addMessage(`✅ Abonné au topic: ${topic}`, 'SYSTEM');
                        
                    } catch (error) {
                        this.showMessage(`Erreur de souscription: ${error.message}`, 'error');
                    }
                }
            }

            sendMessage() {
                const destination = this.elements.sendDestination.value.trim();
                const message = this.elements.sendMessage.value.trim();
                
                if (!destination || !message) {
                    this.showMessage('Veuillez remplir la destination et le message', 'error');
                    return;
                }

                if (this.stompClient && this.stompClient.connected) {
                    try {
                        // Envoi du message avec STOMP
                        this.stompClient.send(destination, {}, message);
                        this.addMessage(`📤 Message envoyé vers ${destination}: ${message}`, 'SENT');
                        this.elements.sendMessage.value = '';
                        
                    } catch (error) {
                        this.showMessage(`Erreur d'envoi: ${error.message}`, 'error');
                    }
                }
            }

            onConnected(frame) {
                this.isConnected = true;
                this.elements.connectionStatus.classList.add('connected');
                this.elements.connectBtn.disabled = true;
                this.elements.disconnectBtn.disabled = false;
                this.elements.topicPath.disabled = false;
                this.elements.subscribeBtn.disabled = false;
                this.elements.sendDestination.disabled = false;
                this.elements.sendMessage.disabled = false;
                this.elements.sendBtn.disabled = false;
                
                this.showMessage('✅ Connexion STOMP établie avec succès!', 'success');
                this.clearMessages();
                this.addMessage('🔗 Connexion STOMP établie', 'SYSTEM');
                this.addMessage(`📋 Session ID: ${frame.headers.session || 'N/A'}`, 'SYSTEM');
                this.addMessage(`🖥️ Serveur: ${frame.headers.server || 'N/A'}`, 'SYSTEM');
                this.addMessage(`💓 Heartbeat: ${this.stompClient.heartbeat.outgoing}ms`, 'SYSTEM');
            }

            onError(error) {
                this.isConnected = false;
                this.showMessage('❌ Erreur de connexion STOMP', 'error');
                this.addMessage(`❌ Erreur STOMP: ${error}`, 'SYSTEM');
                this.resetConnectionState();
            }

            onClosed(closeEvent) {
                this.isConnected = false;
                this.resetConnectionState();
                this.addMessage('🔌 Connexion STOMP fermée', 'SYSTEM');
            }

            // Méthode onMessageReceived améliorée
            onMessageReceived(topic, message) {
                try {
                    let content = message.body;
                    let isJson = false;
                    let jsonObject = null;
                    
                    // Essayer de parser le JSON
                    try {
                        jsonObject = JSON.parse(content);
                        console.log('JSON reçu:', jsonObject);
                        isJson = true;
                    } catch (e) {
                        // Ce n'est pas du JSON, garder le contenu original
                        isJson = false;
                    }

                    this.addMessage(content, topic, message.headers, isJson, jsonObject);
                } catch (error) {
                    this.addMessage(`Erreur de traitement: ${error.message}`, 'ERROR');
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
                
                // Nettoyer les souscriptions
                this.subscribedTopics.clear();
                this.clearTopicTags();
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
                    <button class="topic-remove" onclick="stompClient.removeTopic('${topic}')">×</button>
                `;
                this.elements.topicsList.appendChild(tag);
            }

            removeTopic(topic) {
                // Désabonnement avec STOMP
                const subscription = this.subscribedTopics.get(topic);
                if (subscription) {
                    subscription.unsubscribe();
                    this.subscribedTopics.delete(topic);
                }

                // Supprimer le tag visuel
                const tags = this.elements.topicsList.querySelectorAll('.topic-tag');
                tags.forEach(tag => {
                    if (tag.textContent.includes(topic)) {
                        tag.remove();
                    }
                });
                
                this.addMessage(`❌ Désabonné du topic: ${topic}`, 'SYSTEM');
            }

            clearTopicTags() {
                this.elements.topicsList.innerHTML = '';
            }

            // Méthode addMessage améliorée
            addMessage(content, topic, headers = {}, isJson = false, jsonObject = null) {
                const timestamp = new Date().toLocaleTimeString();
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message-item';
                
                // Afficher les headers s'ils existent
                let headersInfo = '';
                if (Object.keys(headers).length > 0) {
                    headersInfo = `
                        <div class="message-headers">
                            <strong>📋 Headers:</strong>
                            <pre class="headers-content">${JSON.stringify(headers, null, 2)}</pre>
                        </div>`;
                }
                
                // Formater le contenu selon qu'il soit JSON ou non
                let formattedContent = '';
                if (isJson && jsonObject !== null) {
                    formattedContent = `
                        <div class="json-content">
                            <div class="json-formatted">
                                ${this.formatJsonToHtml(jsonObject)}
                            </div>
                            <details class="raw-json">
                                <summary>Afficher le JSON brut</summary>
                                <pre>${JSON.stringify(jsonObject, null, 2)}</pre>
                            </details>
                        </div>`;
                } else {
                    formattedContent = `<div class="text-content">${this.escapeHtml(content)}</div>`;
                }
                
                messageDiv.innerHTML = `
                    <div class="message-header">
                        <span class="message-timestamp">[${timestamp}]</span>
                        <span class="message-topic">${topic}</span>
                        ${isJson ? '<span class="json-badge">JSON</span>' : ''}
                    </div>
                    <div class="message-body">
                        ${formattedContent}
                        ${headersInfo}
                    </div>
                `;
                
                this.elements.messagesConsole.appendChild(messageDiv);
                this.elements.messagesConsole.scrollTop = this.elements.messagesConsole.scrollHeight;
            }

            clearMessages() {
                this.elements.messagesConsole.innerHTML = '';
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
        }

        // Initialiser l'application
        const stompClient = new STOMPWebSocketClient();

        // Fonction globale pour la suppression des topics (appelée depuis le HTML)
        window.stompClient = stompClient;