/**
 * Automatic reconnection management module with exponential backoff
 */

class ReconnectionManager {
    constructor() {
        this.initialDelay = 1000; // 1 second
        this.maxDelay = 30000;    // 30 seconds
        this.currentDelay = this.initialDelay;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectTimer = null;
        this.reconnectCallback = null;
        this.isReconnecting = false;
    }

    /**
     * Configure the reconnection strategy
     * @param {Object} options - Configuration options
     */
    configure(options = {}) {
        if (options.initialDelay) this.initialDelay = options.initialDelay;
        if (options.maxDelay) this.maxDelay = options.maxDelay;
        if (options.maxReconnectAttempts) this.maxReconnectAttempts = options.maxReconnectAttempts;
    }

    /**
     * Sets the callback function for reconnection
     * @param {Function} callback - Function to call to attempt reconnection
     */
    setReconnectCallback(callback) {
        this.reconnectCallback = callback;
    }

    /**
     * Starts the automatic reconnection process
     */
    startReconnection() {
        if (this.isReconnecting) return;

        this.isReconnecting = true;
        this.reconnectAttempts = 0;
        this.currentDelay = this.initialDelay;
        this.scheduleReconnect();
    }

    /**
     * Schedules the next reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.stopReconnection();
            console.warn('Maximum number of reconnection attempts reached');
            return;
        }

        console.log(`Reconnection attempt in ${this.currentDelay/1000} seconds...`);

        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.attemptReconnect();
        }, this.currentDelay);

        // Apply exponential backoff (but capped)
        this.currentDelay = Math.min(this.currentDelay * 1.5, this.maxDelay);
    }

    /**
     * Attempts a reconnection
     */
    attemptReconnect() {
        this.reconnectAttempts++;

        if (typeof this.reconnectCallback === 'function') {
            console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            this.reconnectCallback(this.reconnectAttempts);
        }
    }

    /**
     * Stops the automatic reconnection process
     */
    stopReconnection() {
        this.isReconnecting = false;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    /**
     * Resets reconnection parameters
     */
    reset() {
        this.stopReconnection();
        this.currentDelay = this.initialDelay;
        this.reconnectAttempts = 0;
    }
}

// Export a single instance
export const reconnectManager = new ReconnectionManager();
