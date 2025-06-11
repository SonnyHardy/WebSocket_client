/**
 * Scheduled message sending management module (simulator)
 */

class MessageScheduler {
    constructor() {
        this.scheduledTasks = new Map();
        this.templates = [];
        this.nextTaskId = 1;
        this.client = null;
    }

    /**
     * Sets the STOMP client to use for sending
     * @param {Object} stompClient - STOMP client instance
     */
    setClient(stompClient) {
        this.client = stompClient;
    }

    /**
     * Schedule regular sending of a message
     * @param {Object} config - Scheduled sending configuration
     * @returns {number} ID of the scheduled task
     */
    scheduleMessage(config) {
        if (!config.destination || !config.message) {
            throw new Error('Destination and message are required');
        }

        const taskId = this.nextTaskId++;
        const intervalMs = (config.intervalSeconds || 5) * 1000; // Convert to milliseconds

        // Save task configuration
        const task = {
            id: taskId,
            config: {
                destination: config.destination,
                message: config.message,
                headers: config.headers || {},
                intervalSeconds: config.intervalSeconds || 5,
                variableData: config.variableData || false,
                iterations: config.iterations || 0, // 0 = infinite
                currentIteration: 0
            },
            timerId: null
        };

        // Message sending function
        const sendScheduledMessage = () => {
            if (!this.client || !this.client.stompClient || !this.client.stompClient.connected) {
                console.warn('STOMP client not connected, scheduled message not sent');
                return;
            }

            // Increment iteration counter
            task.config.currentIteration++;

            // Prepare message with variable data if necessary
            let messageToSend = task.config.message;

            // Add variable data if configured
            if (task.config.variableData) {
                try {
                    // If it's JSON, modify certain values
                    const messageObj = JSON.parse(messageToSend);
                    // Add timestamp
                    messageObj.timestamp = new Date().toLocaleString();
                    // Add sequence number
                    //messageObj.sequence = task.config.currentIteration;
                    // Add random values to simulate sensors
                    //if (!messageObj.sensors) messageObj.sensors = {};
                    //messageObj.sensors.temperature = Math.round((15 + Math.random() * 10) * 10) / 10;
                    //messageObj.sensors.humidity = Math.round(Math.random() * 100);
                    messageToSend = JSON.stringify(messageObj);
                } catch (e) {
                    // If it's not JSON, just add a timestamp
                    messageToSend += ` [${new Date().toLocaleTimeString()}] [seq:${task.config.currentIteration}]`;
                }
            }

            // Send the message
            this.client.stompClient.send(task.config.destination, task.config.headers, messageToSend);

            // Successful send event
            const sendEvent = new CustomEvent('scheduledMessageSent', {
                detail: {
                    taskId: task.id,
                    destination: task.config.destination,
                    message: messageToSend,
                    iteration: task.config.currentIteration
                }
            });
            document.dispatchEvent(sendEvent);

            // Check if we've reached the maximum number of iterations
            if (task.config.iterations > 0 && task.config.currentIteration >= task.config.iterations) {
                this.stopScheduledTask(taskId);

                // Task completion event
                const completedEvent = new CustomEvent('scheduledTaskCompleted', {
                    detail: { taskId: task.id }
                });
                document.dispatchEvent(completedEvent);
            }
        };

        // Start periodic sending
        task.timerId = setInterval(sendScheduledMessage, intervalMs);
        this.scheduledTasks.set(taskId, task);

        // Send the first message immediately
        if (config.sendImmediately) {
            sendScheduledMessage();
        }

        return taskId;
    }

    /**
     * Stops a scheduled task
     * @param {number} taskId - ID of the task to stop
     * @returns {boolean} Success of the operation
     */
    stopScheduledTask(taskId) {
        const task = this.scheduledTasks.get(taskId);
        if (!task) return false;

        clearInterval(task.timerId);
        this.scheduledTasks.delete(taskId);
        return true;
    }

    /**
     * Gets all active scheduled tasks
     * @returns {Array} List of scheduled tasks
     */
    getActiveTasks() {
        const tasks = [];
        this.scheduledTasks.forEach(task => {
            tasks.push({
                id: task.id,
                ...task.config
            });
        });
        return tasks;
    }

    /**
     * Stops all scheduled tasks
     */
    stopAllTasks() {
        this.scheduledTasks.forEach((task, id) => {
            clearInterval(task.timerId);
        });
        this.scheduledTasks.clear();
    }

    /**
     * Adds a message template
     * @param {Object} template - Message template
     * @returns {number} Template ID
     */
    addTemplate(template) {
        if (!template.name || !template.destination || !template.message) {
            throw new Error('Name, destination, and message are required for a template');
        }

        const templateId = this.templates.length + 1;
        this.templates.push({
            id: templateId,
            ...template
        });

        return templateId;
    }

    /**
     * Gets all available templates
     * @returns {Array} List of templates
     */
    getTemplates() {
        return [...this.templates];
    }
}

// Export a single instance
export const messageScheduler = new MessageScheduler();
