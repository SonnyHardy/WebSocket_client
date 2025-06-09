/**
 * Module de gestion du stockage des messages avec localStorage
 */

class MessageStorage {
    constructor() {
        this.storageKey = 'stomp_message_history';
        this.maxMessages = 200; // Nombre maximum de messages à conserver
        this.isEnabled = localStorage.getItem('stomp_storage_enabled') === 'true';
    }

    /**
     * Active ou désactive le stockage des messages
     * @param {boolean} enabled - État d'activation
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('stomp_storage_enabled', enabled.toString());
    }

    /**
     * Vérifie si le stockage est activé
     * @returns {boolean} État d'activation
     */
    isStorageEnabled() {
        return this.isEnabled;
    }

    /**
     * Enregistre un message dans l'historique
     * @param {Object} message - Message à enregistrer
     */
    saveMessage(message) {
        if (!this.isEnabled) return;

        try {
            const messages = this.getMessages();
            messages.push({
                ...message,
                timestamp: message.timestamp || new Date().toISOString()
            });

            // Limiter le nombre de messages stockés
            if (messages.length > this.maxMessages) {
                messages.splice(0, messages.length - this.maxMessages);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(messages));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du message:', error);
        }
    }

    /**
     * Récupère tous les messages de l'historique
     * @returns {Array} Liste des messages
     */
    getMessages() {
        try {
            const messagesJson = localStorage.getItem(this.storageKey);
            return messagesJson ? JSON.parse(messagesJson) : [];
        } catch (error) {
            console.error('Erreur lors de la récupération des messages:', error);
            return [];
        }
    }

    /**
     * Filtre les messages par topic
     * @param {string} topic - Topic à filtrer
     * @returns {Array} Messages filtrés
     */
    getMessagesByTopic(topic) {
        const messages = this.getMessages();
        return messages.filter(msg => msg.topic === topic);
    }

    /**
     * Recherche dans les messages
     * @param {string} query - Terme de recherche
     * @returns {Array} Messages correspondants
     */
    searchMessages(query) {
        if (!query) return this.getMessages();

        const messages = this.getMessages();
        const searchTerm = query.toLowerCase();

        return messages.filter(msg => {
            return (
                (msg.content && msg.content.toLowerCase().includes(searchTerm)) ||
                (msg.topic && msg.topic.toLowerCase().includes(searchTerm))
            );
        });
    }

    /**
     * Efface tous les messages de l'historique
     */
    clearMessages() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Exporte l'historique des messages au format JSON
     * @returns {string} JSON des messages
     */
    exportMessagesAsJson() {
        return JSON.stringify(this.getMessages(), null, 2);
    }

    /**
     * Télécharge l'historique des messages sous forme de fichier JSON
     */
    downloadMessagesAsJson() {
        const data = this.exportMessagesAsJson();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `stomp-messages-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
}

// Exporter une instance unique
export const messageStorage = new MessageStorage();
