export class ConnectorRegistry {
    connectors = new Map();
    /**
     * Register a connector
     */
    register(connector) {
        if (this.connectors.has(connector.name)) {
            throw new Error(`Connector ${connector.name} is already registered`);
        }
        this.connectors.set(connector.name, connector);
    }
    /**
     * Unregister a connector
     */
    unregister(name) {
        this.connectors.delete(name);
    }
    /**
     * Get a connector by name
     */
    get(name) {
        return this.connectors.get(name);
    }
    /**
     * Get all registered connectors
     */
    getAll() {
        return Array.from(this.connectors.values());
    }
    /**
     * Get all enabled connectors
     */
    getEnabled() {
        return this.getAll().filter(c => c.enabled);
    }
    /**
     * Check if a connector is registered
     */
    has(name) {
        return this.connectors.has(name);
    }
    /**
     * Initialize all connectors
     */
    async initializeAll() {
        const promises = this.getAll().map(c => c.initialize());
        await Promise.all(promises);
    }
    /**
     * Authenticate all enabled connectors
     */
    async authenticateAll() {
        const promises = this.getEnabled().map(c => c.authenticate());
        await Promise.all(promises);
    }
}
// Singleton instance
export const connectorRegistry = new ConnectorRegistry();
