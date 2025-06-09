/**
 * Module de gestion de la reconnexion automatique avec backoff exponentiel
 */

class ReconnectionManager {
    constructor() {
        this.initialDelay = 1000; // 1 seconde
        this.maxDelay = 30000;    // 30 secondes
        this.currentDelay = this.initialDelay;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimer = null;
        this.reconnectCallback = null;
        this.isReconnecting = false;
    }

    /**
     * Configure la stratégie de reconnexion
     * @param {Object} options - Options de configuration
     */
    configure(options = {}) {
        if (options.initialDelay) this.initialDelay = options.initialDelay;
        if (options.maxDelay) this.maxDelay = options.maxDelay;
        if (options.maxReconnectAttempts) this.maxReconnectAttempts = options.maxReconnectAttempts;
    }

    /**
     * Définit la fonction de rappel pour la reconnexion
     * @param {Function} callback - Fonction à appeler pour tenter une reconnexion
     */
    setReconnectCallback(callback) {
        this.reconnectCallback = callback;
    }

    /**
     * Démarre le processus de reconnexion automatique
     */
    startReconnection() {
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        this.reconnectAttempts = 0;
        this.currentDelay = this.initialDelay;
        this.scheduleReconnect();
    }

    /**
     * Planifie la prochaine tentative de reconnexion
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.stopReconnection();
            console.warn('Nombre maximum de tentatives de reconnexion atteint');
            return;
        }

        console.log(`Tentative de reconnexion dans ${this.currentDelay/1000} secondes...`);

        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.attemptReconnect();
        }, this.currentDelay);

        // Appliquer le backoff exponentiel (mais plafonné)
        this.currentDelay = Math.min(this.currentDelay * 1.5, this.maxDelay);
    }

    /**
     * Tente une reconnexion
     */
    attemptReconnect() {
        this.reconnectAttempts++;

        if (typeof this.reconnectCallback === 'function') {
            console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.reconnectCallback(this.reconnectAttempts);
        }
    }

    /**
     * Arrête le processus de reconnexion automatique
     */
    stopReconnection() {
        this.isReconnecting = false;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    /**
     * Réinitialise les paramètres de reconnexion
     */
    reset() {
        this.stopReconnection();
        this.currentDelay = this.initialDelay;
        this.reconnectAttempts = 0;
    }
}

// Exporter une instance unique
export const reconnectManager = new ReconnectionManager();
