/**
 * Module principal qui intègre tous les modules du client STOMP
 */

// Importer les modules
import { authManager } from './auth.js';
import { reconnectManager } from './reconnect.js';
import { messageStorage } from './storage.js';
import { messageScheduler } from './scheduler.js';
import { STOMPWebSocketClient } from './stomp-client.js';

// Initialiser l'application avec un client unique
const stompClient = new STOMPWebSocketClient();

// Configuration des modules
reconnectManager.configure({
    initialDelay: 1000,
    maxDelay: 30000,
    maxReconnectAttempts: 10
});

// Événements de reconnexion
reconnectManager.setReconnectCallback(() => {
    if (stompClient) {
        stompClient.reconnect();
    }
});

// Configuration du simulateur
messageScheduler.setClient(stompClient);

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
                if (stompClient) {
                    stompClient.reconnect();
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
        if (stompClient) {
            stompClient.filterMessages(query);
        }
    });

    historyElements.topicFilter.addEventListener('change', function() {
        const topic = this.value;
        if (stompClient) {
            stompClient.filterByTopic(topic);
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
        const currentValue = topicFilter.value;

        // Sauvegarder la sélection actuelle
        topicFilter.innerHTML = '<option value="">Tous les topics</option>';

        // Ajouter les topics du client
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
    if (stompClient.subscribedTopics) {
        updateTopicFilter(Array.from(stompClient.subscribedTopics.keys()));
    }
});

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

// Exposer l'instance pour l'accès global
window.stompClient = stompClient;
