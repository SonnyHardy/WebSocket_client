/**
 * Module de gestion des clients multiples pour simulation de plusieurs connexions
 */

class MultiClientManager {
    constructor() {
        this.clients = new Map();
        this.nextClientId = 1;
        this.activeClientId = null;
    }

    /**
     * Crée un nouveau client
     * @param {string} name - Nom du client
     * @param {Object} config - Configuration du client
     * @returns {number} ID du client créé
     */
    createClient(name, config = {}) {
        const clientId = this.nextClientId++;
        this.clients.set(clientId, {
            id: clientId,
            name: name || `Client ${clientId}`,
            config: config,
            isActive: false,
            instance: null
        });

        return clientId;
    }

    /**
     * Définit l'instance d'un client
     * @param {number} clientId - ID du client
     * @param {Object} instance - Instance du client
     */
    setClientInstance(clientId, instance) {
        const client = this.clients.get(clientId);
        if (client) {
            client.instance = instance;
        }
    }

    /**
     * Active un client spécifique
     * @param {number} clientId - ID du client à activer
     */
    activateClient(clientId) {
        if (!this.clients.has(clientId)) return;

        // Désactiver tous les clients
        this.clients.forEach(client => {
            client.isActive = false;
        });

        // Activer le client spécifié
        const client = this.clients.get(clientId);
        client.isActive = true;
        this.activeClientId = clientId;

        // Déclencher un événement pour informer de ce changement
        const event = new CustomEvent('clientActivated', {
            detail: { clientId, clientName: client.name }
        });
        document.dispatchEvent(event);
    }

    /**
     * Récupère l'ID du client actuellement actif
     * @returns {number|null} ID du client actif ou null
     */
    getActiveClientId() {
        return this.activeClientId;
    }

    /**
     * Récupère l'instance du client actuellement actif
     * @returns {Object|null} Instance du client actif ou null
     */
    getActiveClient() {
        if (!this.activeClientId) return null;
        const client = this.clients.get(this.activeClientId);
        return client ? client.instance : null;
    }

    /**
     * Récupère tous les clients disponibles
     * @returns {Array} Liste des clients
     */
    getAllClients() {
        const clientsList = [];
        this.clients.forEach(client => {
            clientsList.push({
                id: client.id,
                name: client.name,
                isActive: client.isActive
            });
        });
        return clientsList;
    }

    /**
     * Supprime un client
     * @param {number} clientId - ID du client à supprimer
     * @returns {boolean} Succès de l'opération
     */
    removeClient(clientId) {
        if (!this.clients.has(clientId)) return false;

        // Si c'est le client actif, réinitialiser
        if (this.activeClientId === clientId) {
            this.activeClientId = null;
        }

        return this.clients.delete(clientId);
    }
}

// Exporter une instance unique
export const multiClientManager = new MultiClientManager();
