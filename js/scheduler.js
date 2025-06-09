/**
 * Module de gestion des envois programmés de messages (simulateur)
 */

class MessageScheduler {
    constructor() {
        this.scheduledTasks = new Map();
        this.templates = [];
        this.nextTaskId = 1;
        this.client = null;
    }

    /**
     * Définit le client STOMP à utiliser pour l'envoi
     * @param {Object} stompClient - Instance du client STOMP
     */
    setClient(stompClient) {
        this.client = stompClient;
    }

    /**
     * Planifie l'envoi régulier d'un message
     * @param {Object} config - Configuration de l'envoi programmé
     * @returns {number} ID de la tâche planifiée
     */
    scheduleMessage(config) {
        if (!config.destination || !config.message) {
            throw new Error('La destination et le message sont requis');
        }

        const taskId = this.nextTaskId++;
        const intervalMs = (config.intervalSeconds || 5) * 1000; // Convertir en millisecondes

        // Sauvegarder la configuration de la tâche
        const task = {
            id: taskId,
            config: {
                destination: config.destination,
                message: config.message,
                headers: config.headers || {},
                intervalSeconds: config.intervalSeconds || 5,
                variableData: config.variableData || false,
                iterations: config.iterations || 0, // 0 = infini
                currentIteration: 0
            },
            timerId: null
        };

        // Fonction d'envoi du message
        const sendScheduledMessage = () => {
            if (!this.client || !this.client.stompClient || !this.client.stompClient.connected) {
                console.warn('Client STOMP non connecté, message programmé non envoyé');
                return;
            }

            // Incrémenter le compteur d'itérations
            task.config.currentIteration++;

            // Préparer le message avec des données variables si nécessaire
            let messageToSend = task.config.message;

            // Ajouter des données variables si configuré
            if (task.config.variableData) {
                try {
                    // Si c'est du JSON, on modifie certaines valeurs
                    const messageObj = JSON.parse(messageToSend);
                    // Ajouter un timestamp
                    messageObj.timestamp = new Date().toLocaleString();
                    // Ajouter un numéro de séquence
                    //messageObj.sequence = task.config.currentIteration;
                    // Ajouter des valeurs aléatoires pour simuler des capteurs
                    //if (!messageObj.sensors) messageObj.sensors = {};
                    //messageObj.sensors.temperature = Math.round((15 + Math.random() * 10) * 10) / 10;
                    //messageObj.sensors.humidity = Math.round(Math.random() * 100);
                    messageToSend = JSON.stringify(messageObj);
                } catch (e) {
                    // Si ce n'est pas du JSON, on ajoute juste un timestamp
                    messageToSend += ` [${new Date().toLocaleTimeString()}] [seq:${task.config.currentIteration}]`;
                }
            }

            // Envoyer le message
            this.client.stompClient.send(task.config.destination, task.config.headers, messageToSend);

            // Événement d'envoi réussi
            const sendEvent = new CustomEvent('scheduledMessageSent', {
                detail: {
                    taskId: task.id,
                    destination: task.config.destination,
                    message: messageToSend,
                    iteration: task.config.currentIteration
                }
            });
            document.dispatchEvent(sendEvent);

            // Vérifier si on a atteint le nombre maximum d'itérations
            if (task.config.iterations > 0 && task.config.currentIteration >= task.config.iterations) {
                this.stopScheduledTask(taskId);

                // Événement de fin de tâche
                const completedEvent = new CustomEvent('scheduledTaskCompleted', {
                    detail: { taskId: task.id }
                });
                document.dispatchEvent(completedEvent);
            }
        };

        // Démarrer l'envoi périodique
        task.timerId = setInterval(sendScheduledMessage, intervalMs);
        this.scheduledTasks.set(taskId, task);

        // Envoyer immédiatement le premier message
        if (config.sendImmediately) {
            sendScheduledMessage();
        }

        return taskId;
    }

    /**
     * Arrête une tâche programmée
     * @param {number} taskId - ID de la tâche à arrêter
     * @returns {boolean} Succès de l'opération
     */
    stopScheduledTask(taskId) {
        const task = this.scheduledTasks.get(taskId);
        if (!task) return false;

        clearInterval(task.timerId);
        this.scheduledTasks.delete(taskId);
        return true;
    }

    /**
     * Récupère toutes les tâches programmées actives
     * @returns {Array} Liste des tâches programmées
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
     * Arrête toutes les tâches programmées
     */
    stopAllTasks() {
        this.scheduledTasks.forEach((task, id) => {
            clearInterval(task.timerId);
        });
        this.scheduledTasks.clear();
    }

    /**
     * Ajoute un template de message
     * @param {Object} template - Template de message
     * @returns {number} ID du template
     */
    addTemplate(template) {
        if (!template.name || !template.destination || !template.message) {
            throw new Error('Le nom, la destination et le message sont requis pour un template');
        }

        const templateId = this.templates.length + 1;
        this.templates.push({
            id: templateId,
            ...template
        });

        return templateId;
    }

    /**
     * Récupère tous les templates disponibles
     * @returns {Array} Liste des templates
     */
    getTemplates() {
        return [...this.templates];
    }
}

// Exporter une instance unique
export const messageScheduler = new MessageScheduler();
