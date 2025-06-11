/**
 * Authentication module for managing JWT/OAuth2
 */

class AuthenticationManager {
    constructor() {
        this.authToken = localStorage.getItem('stomp_auth_token') || '';
        this.tokenType = localStorage.getItem('stomp_token_type') || 'Bearer';
    }

    /**
     * Sets the authentication token
     * @param {string} token - The JWT/OAuth2 token
     * @param {string} type - The token type (Bearer, etc.)
     */
    setAuthToken(token, type = 'Bearer') {
        this.authToken = token;
        this.tokenType = type;

        // Data persistence
        if (token) {
            localStorage.setItem('stomp_auth_token', token);
            localStorage.setItem('stomp_token_type', type);
        } else {
            localStorage.removeItem('stomp_auth_token');
            localStorage.removeItem('stomp_token_type');
        }
    }

    /**
     * Gets the authentication token
     * @returns {string} The token
     */
    getAuthToken() {
        return this.authToken;
    }

    /**
     * Gets the token type
     * @returns {string} The token type
     */
    getTokenType() {
        return this.tokenType;
    }

    /**
     * Checks if an authentication token is set
     * @returns {boolean} True if a token is set
     */
    hasAuthToken() {
        return !!this.authToken;
    }

    /**
     * Clears the authentication token
     */
    clearAuthToken() {
        this.authToken = '';
        this.tokenType = 'Bearer';
        localStorage.removeItem('stomp_auth_token');
        localStorage.removeItem('stomp_token_type');
    }

    /**
     * Applies authentication headers to STOMP connection headers
     * @param {Object} headers - STOMP connection headers
     * @returns {Object} Headers with authentication
     */
    applyAuthHeaders(headers = {}) {
        if (this.hasAuthToken()) {
            headers['Authorization'] = `${this.tokenType} ${this.authToken}`;
        }
        return headers;
    }
}

// Export a single instance
export const authManager = new AuthenticationManager();
