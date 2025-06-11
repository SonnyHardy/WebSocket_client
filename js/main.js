/**
 * Main module that integrates all STOMP client modules
 */

// Import modules
import { authManager } from './auth.js';
import { reconnectManager } from './reconnect.js';
import { messageStorage } from './storage.js';
import { messageScheduler } from './scheduler.js';
import { STOMPWebSocketClient } from './stomp-client.js';

// Initialize the application with a single client
const stompClient = new STOMPWebSocketClient();

// Module configuration
reconnectManager.configure({
    initialDelay: 1000,
    maxDelay: 30000,
    maxReconnectAttempts: 10
});

// Reconnection events
reconnectManager.setReconnectCallback(() => {
    if (stompClient) {
        stompClient.reconnect();
    }
});

// Scheduler configuration
messageScheduler.setClient(stompClient);

// Initialize user interface
document.addEventListener('DOMContentLoaded', () => {
    // JWT/OAuth2 authentication interface
    const authElements = {
        authToken: document.getElementById('authToken'),
        tokenType: document.getElementById('tokenType'),
        applyTokenBtn: document.getElementById('applyTokenBtn'),
        clearTokenBtn: document.getElementById('clearTokenBtn'),
        enableReconnect: document.getElementById('enableReconnect'),
        maxRetries: document.getElementById('maxRetries'),
        initialDelay: document.getElementById('initialDelay')
    };

    // History management interface
    const historyElements = {
        enableHistory: document.getElementById('enableHistory'),
        searchMessages: document.getElementById('searchMessages'),
        topicFilter: document.getElementById('topicFilter'),
        exportBtn: document.getElementById('exportBtn')
    };

    // Scheduler interface
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


    // Authentication interface initialization
    if (authManager.hasAuthToken()) {
        authElements.authToken.value = authManager.getAuthToken();
        authElements.tokenType.value = authManager.getTokenType();
    }

    authElements.applyTokenBtn.addEventListener('click', () => {
        const token = authElements.authToken.value.trim();
        const type = authElements.tokenType.value;
        authManager.setAuthToken(token, type);
        if (token) {
            showMessage('Authentication token applied', 'success');
        } else {
            showMessage('Authentication token cleared', 'info');
        }
    });

    authElements.clearTokenBtn.addEventListener('click', () => {
        authManager.clearAuthToken();
        authElements.authToken.value = '';
        authElements.tokenType.value = 'Bearer';
        showMessage('Authentication token cleared', 'info');
    });

    // Reconnection parameters
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

    // History interface initialization
    historyElements.enableHistory.checked = messageStorage.isStorageEnabled();

    historyElements.enableHistory.addEventListener('change', function() {
        messageStorage.setEnabled(this.checked);
        if (this.checked) {
            showMessage('Message history storage enabled', 'success');
        } else {
            showMessage('Message history storage disabled', 'info');
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

    // Scheduler interface initialization
    schedulerElements.startSchedulerBtn.addEventListener('click', () => {
        const destination = schedulerElements.schedulerDestination.value.trim();
        const message = schedulerElements.schedulerMessage.value.trim();
        const intervalSeconds = parseInt(schedulerElements.intervalSeconds.value, 10) || 5;
        const iterations = parseInt(schedulerElements.iterations.value, 10) || 0;
        const variableData = schedulerElements.variableData.checked;

        if (!destination || !message) {
            showMessage('Please fill in both destination and message', 'error');
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
            showMessage(`Scheduled sending started with ${intervalSeconds}s interval`, 'success');

            // Add task to the interface
            updateActiveTasksUI();
        } catch (error) {
            showMessage(`Error: ${error.message}`, 'error');
        }
    });

    schedulerElements.stopSchedulerBtn.addEventListener('click', () => {
        messageScheduler.stopAllTasks();
        schedulerElements.startSchedulerBtn.disabled = false;
        schedulerElements.stopSchedulerBtn.disabled = true;
        schedulerElements.activeTasks.innerHTML = '';
        showMessage('All scheduled sendings have been stopped', 'info');
    });

    // Listen for scheduled sending events
    document.addEventListener('scheduledMessageSent', (event) => {
        const { taskId, destination, message, iteration } = event.detail;
        console.log(`Task ${taskId}: Message ${iteration} sent to ${destination}`);
        updateActiveTasksUI();
    });

    document.addEventListener('scheduledTaskCompleted', (event) => {
        const { taskId } = event.detail;
        console.log(`Task ${taskId}: Completed`);
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
            schedulerElements.activeTasks.innerHTML = '<p>No active tasks</p>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-item';
            taskElement.innerHTML = `
                <div class="task-info">
                    <h4>${task.destination} <span class="task-counter">${task.currentIteration}${task.iterations ? '/' + task.iterations : ''}</span></h4>
                    <div class="task-details">
                        Interval: ${task.intervalSeconds}s | 
                        ${task.variableData ? 'Variable data' : 'Fixed data'}
                    </div>
                </div>
                <div class="task-action">
                    <button class="task-stop" data-task-id="${task.id}">Stop</button>
                </div>
            `;
            schedulerElements.activeTasks.appendChild(taskElement);

            // Add event to stop a specific task
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

        // Save the current selection
        topicFilter.innerHTML = '<option value="">All topics</option>';

        // Add client topics
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

    // Initialize the interface
    if (stompClient.subscribedTopics) {
        updateTopicFilter(Array.from(stompClient.subscribedTopics.keys()));
    }
});

// Utility function to display temporary messages
function showMessage(text, type) {
    const connectionMessage = document.getElementById('connectionMessage');
    if (connectionMessage) {
        connectionMessage.innerHTML = `<div class="message ${type}">${text}</div>`;
        setTimeout(() => {
            connectionMessage.innerHTML = '';
        }, 5000);
    }
}

// Expose the instance for global access
window.stompClient = stompClient;
