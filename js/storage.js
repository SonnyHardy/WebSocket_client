/**
 * Message storage management module using localStorage
 */

class MessageStorage {
    constructor() {
        this.storageKey = 'stomp_message_history';
        this.maxMessages = 200; // Maximum number of messages to keep
        this.isEnabled = localStorage.getItem('stomp_storage_enabled') === 'true';
    }

    /**
     * Enable or disable message storage
     * @param {boolean} enabled - Activation state
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        localStorage.setItem('stomp_storage_enabled', enabled.toString());
    }

    /**
     * Check if storage is enabled
     * @returns {boolean} Activation state
     */
    isStorageEnabled() {
        return this.isEnabled;
    }

    /**
     * Save a message in history
     * @param {Object} message - Message to save
     */
    saveMessage(message) {
        if (!this.isEnabled) return;

        try {
            const messages = this.getMessages();
            messages.push({
                ...message,
                timestamp: message.timestamp || new Date().toISOString()
            });

            // Limit the number of stored messages
            if (messages.length > this.maxMessages) {
                messages.splice(0, messages.length - this.maxMessages);
            }

            localStorage.setItem(this.storageKey, JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    /**
     * Retrieve all history messages
     * @returns {Array} List of messages
     */
    getMessages() {
        try {
            const messagesJson = localStorage.getItem(this.storageKey);
            return messagesJson ? JSON.parse(messagesJson) : [];
        } catch (error) {
            console.error('Error retrieving messages:', error);
            return [];
        }
    }

    /**
     * Filter messages by topic
     * @param {string} topic - Topic to filter
     * @returns {Array} Filtered messages
     */
    getMessagesByTopic(topic) {
        const messages = this.getMessages();
        return messages.filter(msg => msg.topic === topic);
    }

    /**
     * Search through messages
     * @param {string} query - Search term
     * @returns {Array} Matching messages
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
     * Clear all messages from history
     */
    clearMessages() {
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Export message history as JSON
     * @returns {string} Messages in JSON format
     */
    exportMessagesAsJson() {
        return JSON.stringify(this.getMessages(), null, 2);
    }

    /**
     * Download message history as a JSON file
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

// Export a single instance
export const messageStorage = new MessageStorage();
