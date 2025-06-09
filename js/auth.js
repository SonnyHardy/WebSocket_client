/**
 * Module d'authentification pour gérer JWT/OAuth2
 */

class AuthenticationManager {
    constructor() {
        this.authToken = localStorage.getItem('stomp_auth_token') || '';
        this.tokenType = localStorage.getItem('stomp_token_type') || 'Bearer';
    }

    /**
     * Définit le token d'authentification
     * @param {string} token - Le token JWT/OAuth2
     * @param {string} type - Le type de token (Bearer, etc.)
     */
    setAuthToken(token, type = 'Bearer') {
        this.authToken = token;
        this.tokenType = type;

        // Persistance des données
        if (token) {
            localStorage.setItem('stomp_auth_token', token);
            localStorage.setItem('stomp_token_type', type);
        } else {
            localStorage.removeItem('stomp_auth_token');
            localStorage.removeItem('stomp_token_type');
        }
    }

    /**
     * Récupère le token d'authentification
     * @returns {string} Le token
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * Récupère le type de token
     * @returns {string} Le type de token
     */
    getTokenType() {
        return this.tokenType;
    }

    /**
     * Vérifie si un token d'authentification est défini
     * @returns {boolean} Vrai si un token est défini
     */
    hasAuthToken() {
        return !!this.authToken;
    }

    /**
     * Efface le token d'authentification
     */
    clearAuthToken() {
        this.authToken = '';
        this.tokenType = 'Bearer';
        localStorage.removeItem('stomp_auth_token');
        localStorage.removeItem('stomp_token_type');
    }

    /**
     * Applique les en-têtes d'authentification aux en-têtes de connexion STOMP
     * @param {Object} headers - Les en-têtes de connexion STOMP
     * @returns {Object} Les en-têtes avec authentification
     */
    applyAuthHeaders(headers = {}) {
        if (this.hasAuthToken()) {
            headers['Authorization'] = `${this.tokenType} ${this.authToken}`;
        }
        return headers;
    }
}

// Exporter une instance unique
export const authManager = new AuthenticationManager();
