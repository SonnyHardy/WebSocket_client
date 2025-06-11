/**
 * Module principal qui intègre tous les modules du client STOMP
 */

// Importer les modules
import { authManager } from './auth.js';
import { reconnectManager } from './reconnect.js';
import { messageStorage } from './storage.js';
import { messageScheduler } from './scheduler.js';
import { STOMPWebSocketClient } from './stomp-client.js';
import { clientsManager } from './clients-manager.js';

// Initialiser l'application avec le gestionnaire de clients multiples
// Créer un client par défaut
const defaultClientId = clientsManager.createClient({ name: 'Client Principal' });

// Configuration des modules
reconnectManager.configure({
    initialDelay: 1000,
    maxDelay: 30000,
    maxReconnectAttempts: 10
});

// Événements de reconnexion
reconnectManager.setReconnectCallback(() => {
    const activeClient = clientsManager.getActiveClient();
    if (activeClient) {
        activeClient.reconnect();
    }
});

// Configuration du simulateur avec callback pour récupérer le client actif
messageScheduler.setClientProvider(() => clientsManager.getActiveClient());

// Initialiser l'interface utilisateur
document.addEventListener('DOMContentLoaded', () => {
    // Interface pour authentification JWT/OAuth2
    const authElements = {
        authToken: document.getElementById('authToken'),
        tokenType: document.getElementById('tokenType'),
        applyTokenBtn: document.getElementById('applyTokenBtn'),
        clearTokenBtn: document.getElementById('clearTokenBtn'),
        enableReconnect: document.getElementById('enableReconnect'),
        maxRetries: document.getElementById('maxRetries'),
        initialDelay: document.getElementById('initialDelay')
    };

    // Interface pour la gestion de l'historique
    const historyElements = {
        enableHistory: document.getElementById('enableHistory'),
        searchMessages: document.getElementById('searchMessages'),
        topicFilter: document.getElementById('topicFilter'),
        exportBtn: document.getElementById('exportBtn')
    };

    // Interface pour le simulateur
    const schedulerElements = {
        schedulerDestination: document.getElementById('schedulerDestination'),
        schedulerMessage: document.getElementById('schedulerMessage'),
        intervalSeconds: document.getElementById('intervalSeconds'),
        iterations: document.getElementById('iterations'),
        variableData: document.getElementById('variableData'),
        startSchedulerBtn: document.getElementById('startSchedulerBtn'),
        stopSchedulerBtn: document.getElementById('stopSchedulerBtn'),
        activeTasks: document.getElementById('activeTasks')
    };


    // Initialisation de l'interface d'authentification
    if (authManager.hasAuthToken()) {
        authElements.authToken.value = authManager.getAuthToken();
        authElements.tokenType.value = authManager.getTokenType();
    }

    authElements.applyTokenBtn.addEventListener('click', () => {
        const token = authElements.authToken.value.trim();
        const type = authElements.tokenType.value;
        authManager.setAuthToken(token, type);
        if (token) {
            showMessage('Token d\'authentification appliqué', 'success');
        } else {
            showMessage('Token d\'authentification effacé', 'info');
        }
    });

    authElements.clearTokenBtn.addEventListener('click', () => {
        authManager.clearAuthToken();
        authElements.authToken.value = '';
        authElements.tokenType.value = 'Bearer';
        showMessage('Token d\'authentification effacé', 'info');
    });

    // Paramètres de reconnexion
    authElements.enableReconnect.addEventListener('change', function() {
        if (this.checked) {
            reconnectManager.setReconnectCallback(() => {
                const activeClient = clientsManager.getActiveClient();
                if (activeClient) {
                    activeClient.reconnect();
                }
            });
            authElements.maxRetries.disabled = false;
            authElements.initialDelay.disabled = false;
        } else {
            reconnectManager.setReconnectCallback(null);
            authElements.maxRetries.disabled = true;
            authElements.initialDelay.disabled = true;
        }
    });

    authElements.maxRetries.addEventListener('change', function() {
        reconnectManager.configure({ maxReconnectAttempts: parseInt(this.value, 10) || 10 });
    });

    authElements.initialDelay.addEventListener('change', function() {
        reconnectManager.configure({ initialDelay: parseInt(this.value, 10) || 1000 });
    });

    // Initialisation de l'interface d'historique
    historyElements.enableHistory.checked = messageStorage.isStorageEnabled();

    historyElements.enableHistory.addEventListener('change', function() {
        messageStorage.setEnabled(this.checked);
        if (this.checked) {
            showMessage('Conservation de l\'historique activée', 'success');
        } else {
            showMessage('Conservation de l\'historique désactivée', 'info');
        }
    });

    historyElements.searchMessages.addEventListener('input', function() {
        const query = this.value.trim();
        const activeClient = clientsManager.getActiveClient();
        if (activeClient) {
            activeClient.filterMessages(query);
        }
    });

    historyElements.topicFilter.addEventListener('change', function() {
        const topic = this.value;
        const activeClient = clientsManager.getActiveClient();
        if (activeClient) {
            activeClient.filterByTopic(topic);
        }
    });

    historyElements.exportBtn.addEventListener('click', () => {
        messageStorage.downloadMessagesAsJson();
    });

    // Initialisation de l'interface du simulateur
    schedulerElements.startSchedulerBtn.addEventListener('click', () => {
        const destination = schedulerElements.schedulerDestination.value.trim();
        const message = schedulerElements.schedulerMessage.value.trim();
        const intervalSeconds = parseInt(schedulerElements.intervalSeconds.value, 10) || 5;
        const iterations = parseInt(schedulerElements.iterations.value, 10) || 0;
        const variableData = schedulerElements.variableData.checked;

        if (!destination || !message) {
            showMessage('Veuillez remplir la destination et le message', 'error');
            return;
        }

        try {
            const taskId = messageScheduler.scheduleMessage({
                destination,
                message,
                intervalSeconds,
                iterations,
                variableData,
                sendImmediately: true
            });

            schedulerElements.startSchedulerBtn.disabled = true;
            schedulerElements.stopSchedulerBtn.disabled = false;
            showMessage(`Envoi programmé démarré avec intervalle de ${intervalSeconds}s`, 'success');

            // Ajouter la tâche à l'interface
            updateActiveTasksUI();
        } catch (error) {
            showMessage(`Erreur: ${error.message}`, 'error');
        }
    });

    schedulerElements.stopSchedulerBtn.addEventListener('click', () => {
        messageScheduler.stopAllTasks();
        schedulerElements.startSchedulerBtn.disabled = false;
        schedulerElements.stopSchedulerBtn.disabled = true;
        schedulerElements.activeTasks.innerHTML = '';
        showMessage('Tous les envois programmés ont été arrêtés', 'info');
    });

    // Écouter les événements d'envoi programmé
    document.addEventListener('scheduledMessageSent', (event) => {
        const { taskId, destination, message, iteration } = event.detail;
        console.log(`Tâche ${taskId}: Message ${iteration} envoyé vers ${destination}`);
        updateActiveTasksUI();
    });

    document.addEventListener('scheduledTaskCompleted', (event) => {
        const { taskId } = event.detail;
        console.log(`Tâche ${taskId}: Terminée`);
        updateActiveTasksUI();

        if (messageScheduler.getActiveTasks().length === 0) {
            schedulerElements.startSchedulerBtn.disabled = false;
            schedulerElements.stopSchedulerBtn.disabled = true;
        }
    });

    function updateActiveTasksUI() {
        const tasks = messageScheduler.getActiveTasks();
        schedulerElements.activeTasks.innerHTML = '';

        if (tasks.length === 0) {
            schedulerElements.activeTasks.innerHTML = '<p>Aucune tâche active</p>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <div class="task-info">
                    <h4>${task.destination} <span class="task-counter">${task.currentIteration}${task.iterations ? '/' + task.iterations : ''}</span></h4>
                    <div class="task-details">
                        Intervalle: ${task.intervalSeconds}s | 
                        ${task.variableData ? 'Données variables' : 'Données fixes'}
                    </div>
                </div>
                <div class="task-action">
                    <button class="task-stop" data-task-id="${task.id}">Arrêter</button>
                </div>
            `;
            schedulerElements.activeTasks.appendChild(taskElement);

            // Ajouter l'événement pour arrêter une tâche spécifique
            taskElement.querySelector('.task-stop').addEventListener('click', (e) => {
                const taskId = parseInt(e.target.getAttribute('data-task-id'), 10);
                messageScheduler.stopScheduledTask(taskId);
                updateActiveTasksUI();
                if (messageScheduler.getActiveTasks().length === 0) {
                    schedulerElements.startSchedulerBtn.disabled = false;
                    schedulerElements.stopSchedulerBtn.disabled = true;
                }
            });
        });
    }

    function updateTopicFilter(topics) {
        const topicFilter = historyElements.topicFilter;
        if (!topicFilter) return;

        const currentValue = topicFilter.value;

        // Sauvegarder la sélection actuelle
        topicFilter.innerHTML = '<option value="">Tous les topics</option>';

        // Ajouter les topics du client actif
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicFilter.appendChild(option);
        });

        // Restaurer la sélection si possible
        if (currentValue && topics.includes(currentValue)) {
            topicFilter.value = currentValue;
        }
    }

    // Initialiser l'interface
    const activeClient = clientsManager.getActiveClient();
    if (activeClient && activeClient.subscribedTopics) {
        updateTopicFilter(Array.from(activeClient.subscribedTopics.keys()));
    }

    // Initialiser l'interface des clients multiples
    initMultiClientInterface();
});

// Fonction pour initialiser l'interface multi-client
function initMultiClientInterface() {
    const newClientNameInput = document.getElementById('newClientName');
    const createClientBtn = document.getElementById('createClientBtn');
    const clientsList = document.getElementById('clientsList');
    const clientRadioFilters = document.getElementById('clientRadioFilters');

    // Mise à jour des informations du client actif
    function updateActiveClientInfo() {
        const activeClient = clientsManager.getActiveClient();
        if (activeClient) {
            document.getElementById('activeClientName').textContent = activeClient.name;
            document.getElementById('activeClientStatus').innerHTML = activeClient.isConnected ? 
                '✅ Connecté' : '❌ Déconnecté';
            document.getElementById('activeClientUrl').textContent = activeClient.url || '-';
        }
    }

    // Création d'une carte de client pour l'UI
    function createClientCard(client, id) {
        const card = document.createElement('div');
        card.className = `client-card ${id === clientsManager.activeClientId ? 'active' : ''}`;
        card.setAttribute('data-client-id', id);

        const topicsHtml = Array.from(client.subscribedTopics.keys())
            .map(topic => `<span class="client-topic">${topic}</span>`)
            .join('');

        card.innerHTML = `
            <div class="client-header">
                <h3 class="client-name">${client.name}</h3>
                <span class="client-status ${client.isConnected ? 'connected' : 'disconnected'}">
                    ${client.isConnected ? 'Connecté' : 'Déconnecté'}
                </span>
            </div>
            <div class="client-url">${client.url || 'Non connecté'}</div>
            <div class="client-topics">
                ${topicsHtml || '<span class="client-topic">Aucun topic</span>'}
            </div>
            <div class="client-actions">
                <button class="btn btn-primary btn-sm select-client-btn">Sélectionner</button>
                <button class="btn btn-danger btn-sm remove-client-btn">Supprimer</button>
            </div>
        `;

        // Événement pour sélectionner un client
        card.querySelector('.select-client-btn').addEventListener('click', () => {
            clientsManager.setActiveClient(id);
            updateClientsList();
            updateActiveClientInfo();

            // Mettre à jour les filtres et la console
            const activeClient = clientsManager.getActiveClient();
            if (activeClient) {
                // Ne pas effacer la console pour conserver tous les messages
                // On utilise les boutons radio pour filtrer

                // Sélectionner le bouton radio correspondant au client actif
                const radioButtons = document.querySelectorAll('input[name="clientFilter"]');
                radioButtons.forEach(radio => {
                    if (radio.value === id.toString()) {
                        radio.checked = true;

                        // Déclencher l'événement change pour filtrer les messages
                        const event = new Event('change');
                        radio.dispatchEvent(event);

                        // Mettre à jour l'apparence des labels
                        const labels = document.querySelectorAll('.client-radio-label');
                        labels.forEach(label => {
                            label.classList.remove('active');
                        });
                        radio.parentNode.classList.add('active');
                    }
                });

                // Mettre à jour le filtre de topics
                updateTopicFilter(Array.from(activeClient.subscribedTopics.keys()));
            }
        });

        // Événement pour supprimer un client
        card.querySelector('.remove-client-btn').addEventListener('click', () => {
            if (clientsManager.clients.size <= 1) {
                showMessage('Impossible de supprimer le dernier client', 'error');
                return;
            }

            clientsManager.removeClient(id);
            updateClientsList();
            updateActiveClientInfo();
        });

        return card;
    }

    // Mise à jour de la liste des clients
    function updateClientsList() {
        clientsList.innerHTML = '';

        clientsManager.clients.forEach((client, id) => {
            clientsList.appendChild(createClientCard(client, id));
        });

        // Mettre à jour les boutons radio pour le filtrage des messages
        updateClientRadioFilters();
    }

    // Mise à jour des boutons radio pour le filtrage des messages par client
    function updateClientRadioFilters() {
        if (!clientRadioFilters) return;

        clientRadioFilters.innerHTML = '';

        // Option pour afficher tous les clients
        const allClientsLabel = document.createElement('label');
        allClientsLabel.className = 'client-radio-label';
        allClientsLabel.innerHTML = `
            <input type="radio" name="clientFilter" value="all" checked>
            Tous les clients
        `;
        clientRadioFilters.appendChild(allClientsLabel);

        // Option pour chaque client
        clientsManager.clients.forEach((client, id) => {
            const label = document.createElement('label');
            label.className = 'client-radio-label';
            label.innerHTML = `
                <input type="radio" name="clientFilter" value="${id}">
                ${client.name}
            `;
            clientRadioFilters.appendChild(label);
        });

        // Ajouter les événements aux boutons radio
        const radioButtons = clientRadioFilters.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    filterMessagesByClient(this.value);

                    // Mettre à jour l'apparence des labels
                    const labels = clientRadioFilters.querySelectorAll('.client-radio-label');
                    labels.forEach(label => {
                        label.classList.remove('active');
                    });
                    this.parentNode.classList.add('active');
                }
            });
        });

        // Activer le premier bouton par défaut
        radioButtons[0].checked = true;
        radioButtons[0].parentNode.classList.add('active');
    }

    // Événement pour créer un nouveau client
    createClientBtn.addEventListener('click', () => {
        const name = newClientNameInput.value.trim() || `Client ${clientsManager.nextClientId}`;
        const clientId = clientsManager.createClient({ name });

        newClientNameInput.value = '';
        updateClientsList();

        // Afficher les messages de tous les clients par défaut
        const allClientsRadio = document.querySelector('input[name="clientFilter"][value="all"]');
        if (allClientsRadio) {
            allClientsRadio.checked = true;
            filterMessagesByClient('all');

            // Mettre à jour l'apparence des labels
            const labels = document.querySelectorAll('.client-radio-label');
            labels.forEach(label => {
                label.classList.remove('active');
            });
            allClientsRadio.parentNode.classList.add('active');
        }
    });

    // Fonction pour filtrer les messages par client
    function filterMessagesByClient(clientIdOrAll) {
        const messagesConsole = document.getElementById('messagesConsole');
        if (!messagesConsole) return;

        // Récupérer tous les messages dans la console
        const allMessages = messagesConsole.querySelectorAll('.message-item');

        if (clientIdOrAll === 'all') {
            // Afficher tous les messages
            allMessages.forEach(msg => {
                msg.style.display = 'block';
            });
        } else {
            // Filtrer par client spécifique
            const clientId = parseInt(clientIdOrAll, 10);
            allMessages.forEach(msg => {
                const msgClientId = parseInt(msg.getAttribute('data-client-id'), 10);
                msg.style.display = (msgClientId === clientId) ? 'block' : 'none';
            });
        }
    }

    // Initialisation
    updateClientsList();
    updateActiveClientInfo();
}

// Fonction utilitaire pour afficher des messages temporaires
function showMessage(text, type) {
    const connectionMessage = document.getElementById('connectionMessage');
    if (connectionMessage) {
        connectionMessage.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => {
            connectionMessage.innerHTML = '';
        }, 5000);
    }
}

// Fonction pour charger tous les messages historiques dans la console
function loadAllClientsMessages() {
    if (!messageStorage.isStorageEnabled()) return;

    const messagesConsole = document.getElementById('messagesConsole');
    if (!messagesConsole) return;

    // Effacer la console
    messagesConsole.innerHTML = '';

    // Récupérer tous les messages et les trier par timestamp
    const allMessages = messageStorage.getMessages();
    allMessages.sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
    });

    // Afficher chaque message dans la console
    allMessages.forEach(msg => {
        // Trouver le client correspondant
        const client = clientsManager.getClient(msg.clientId);
        if (client) {
            client.addMessage(
                msg.content,
                'HISTORY:' + msg.topic,
                msg.headers || {},
                msg.isJson || false,
                msg.jsonObject || null
            );
        }
    });
}

// Charger tous les messages après l'initialisation
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadAllClientsMessages();
    }, 500); // Petit délai pour s'assurer que l'interface est prête
});

// Exposer les instances pour l'accès global
window.clientsManager = clientsManager;
