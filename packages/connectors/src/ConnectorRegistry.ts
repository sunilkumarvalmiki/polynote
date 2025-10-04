import { IConnector } from '@polynote/shared';

export class ConnectorRegistry {
  private connectors: Map<string, IConnector> = new Map();

  /**
   * Register a connector
   */
  register(connector: IConnector): void {
    if (this.connectors.has(connector.name)) {
      throw new Error(`Connector ${connector.name} is already registered`);
    }
    this.connectors.set(connector.name, connector);
  }

  /**
   * Unregister a connector
   */
  unregister(name: string): void {
    this.connectors.delete(name);
  }

  /**
   * Get a connector by name
   */
  get(name: string): IConnector | undefined {
    return this.connectors.get(name);
  }

  /**
   * Get all registered connectors
   */
  getAll(): IConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * Get all enabled connectors
   */
  getEnabled(): IConnector[] {
    return this.getAll().filter(c => c.enabled);
  }

  /**
   * Check if a connector is registered
   */
  has(name: string): boolean {
    return this.connectors.has(name);
  }

  /**
   * Initialize all connectors
   */
  async initializeAll(): Promise<void> {
    const promises = this.getAll().map(c => c.initialize());
    await Promise.all(promises);
  }

  /**
   * Authenticate all enabled connectors
   */
  async authenticateAll(): Promise<void> {
    const promises = this.getEnabled().map(c => c.authenticate());
    await Promise.all(promises);
  }
}

// Singleton instance
export const connectorRegistry = new ConnectorRegistry();
