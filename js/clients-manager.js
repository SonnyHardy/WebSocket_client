/**
 * Module de gestion de plusieurs clients WebSocket STOMP
 */

import { STOMPWebSocketClient } from './stomp-client.js';

class STOMPClientsManager {
    constructor() {
        this.clients = new Map();
        this.nextClientId = 1;
        this.activeClientId = null;
    }

    /**
     * Crée un nouveau client STOMP
     * @param {Object} config - Configuration du client
     * @returns {number} ID du client créé
     */
    createClient(config = {}) {
        const clientId = this.nextClientId++;
        const client = new STOMPWebSocketClient(clientId);

        // Configurer le client avec les paramètres fournis
        if (config.name) client.setName(config.name);

        this.clients.set(clientId, client);

        // Définir comme client actif si c'est le premier
        if (this.clients.size === 1 || config.makeActive) {
            this.setActiveClient(clientId);
        }

        return clientId;
    }

    /**
     * Supprime un client STOMP
     * @param {number} clientId - ID du client à supprimer
     * @returns {boolean} Succès de l'opération
     */
    removeClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return false;

        // Déconnecter le client s'il est connecté
        if (client.isConnected) {
            client.disconnect();
        }

        // Supprimer le client
        this.clients.delete(clientId);

        // Si c'était le client actif, définir un autre client comme actif
        if (this.activeClientId === clientId) {
            if (this.clients.size > 0) {
                this.setActiveClient(this.clients.keys().next().value);
            } else {
                this.activeClientId = null;
            }
        }

        return true;
    }

    /**
     * Définit le client actif
     * @param {number} clientId - ID du client à activer
     * @returns {boolean} Succès de l'opération
     */
    setActiveClient(clientId) {
        if (!this.clients.has(clientId)) return false;

        this.activeClientId = clientId;
        return true;
    }

    /**
     * Récupère le client actif
     * @returns {STOMPWebSocketClient} Client actif ou null
     */
    getActiveClient() {
        if (!this.activeClientId) return null;
        return this.clients.get(this.activeClientId);
    }

    /**
     * Récupère un client par son ID
     * @param {number} clientId - ID du client
     * @returns {STOMPWebSocketClient} Client demandé ou null
     */
    getClient(clientId) {
        return this.clients.get(clientId) || null;
    }

    /**
     * Récupère tous les clients
     * @returns {Array} Liste des clients
     */
    getAllClients() {
        const clientsArray = [];
        this.clients.forEach((client, id) => {
            clientsArray.push({
                id,
                name: client.name || `Client ${id}`,
                isConnected: client.isConnected,
                url: client.url || '',
                topics: Array.from(client.subscribedTopics.keys())
            });
        });
        return clientsArray;
    }
}

// Exporter une instance unique
export const clientsManager = new STOMPClientsManager();
