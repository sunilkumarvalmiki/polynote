/**
 * AI Provider Registry
 * Manages AI providers with local-first policy and cloud fallback
 */
import { ClaudeProvider } from './providers/ClaudeProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { ProviderType, ProviderLocation, } from './types';
export class ProviderRegistry {
    providers = new Map();
    policy;
    initialized = false;
    constructor(policy) {
        this.policy = {
            preferLocal: true,
            cloudFallback: true,
            maxRetries: 3,
            timeoutMs: 30000,
            tokenBudget: {
                daily: 100000,
                perRequest: 4096,
            },
            ...policy,
        };
    }
    /**
     * Register a provider
     */
    async registerProvider(config) {
        const provider = this.createProvider(config);
        await provider.initialize();
        this.providers.set(config.name, provider);
    }
    /**
     * Create a provider instance based on type
     */
    createProvider(config) {
        switch (config.type) {
            case ProviderType.OLLAMA:
                return new OllamaProvider(config);
            case ProviderType.OPENAI:
                return new OpenAIProvider(config);
            case ProviderType.CLAUDE:
                return new ClaudeProvider(config);
            // Add more providers as implemented
            default:
                throw new Error(`Unsupported provider type: ${config.type}`);
        }
    }
    /**
     * Get a provider by name
     */
    getProvider(name) {
        return this.providers.get(name);
    }
    /**
     * Get all registered providers
     */
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    /**
     * Get local providers
     */
    getLocalProviders() {
        return this.getAllProviders().filter(p => p.location === ProviderLocation.LOCAL);
    }
    /**
     * Get cloud providers
     */
    getCloudProviders() {
        return this.getAllProviders().filter(p => p.location === ProviderLocation.CLOUD);
    }
    /**
     * Initialize all providers
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        const initPromises = this.getAllProviders().map(provider => provider.initialize().catch(error => {
            console.warn(`Failed to initialize provider ${provider.name}:`, error);
        }));
        await Promise.all(initPromises);
        this.initialized = true;
    }
    /**
     * Execute AI request using best available provider
     * Implements local-first policy with cloud fallback
     */
    async execute(request, onStream, preferredProvider) {
        // If specific provider requested, try it first
        if (preferredProvider) {
            const provider = this.getProvider(preferredProvider);
            if (provider) {
                try {
                    return await this.executeWithProvider(provider, request, onStream);
                }
                catch (error) {
                    console.warn(`Preferred provider ${preferredProvider} failed:`, error);
                    // Fall through to policy-based selection
                }
            }
        }
        // Get providers based on policy
        const providers = this.policy.preferLocal
            ? [...this.getLocalProviders(), ...this.getCloudProviders()]
            : [...this.getCloudProviders(), ...this.getLocalProviders()];
        if (providers.length === 0) {
            throw new Error('No providers registered');
        }
        // Try each provider in order
        let lastError;
        for (const provider of providers) {
            try {
                const available = await provider.isAvailable();
                if (!available) {
                    console.warn(`Provider ${provider.name} is not available, skipping`);
                    continue;
                }
                return await this.executeWithProvider(provider, request, onStream);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Provider ${provider.name} failed:`, lastError.message);
                // If cloud fallback is disabled and this was a local provider, stop
                if (!this.policy.cloudFallback && provider.location === ProviderLocation.LOCAL) {
                    break;
                }
                // Continue to next provider
                continue;
            }
        }
        throw lastError || new Error('All providers failed');
    }
    /**
     * Execute request with a specific provider
     */
    async executeWithProvider(provider, request, onStream) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), this.policy.timeoutMs);
        });
        const executePromise = provider.execute(request, onStream);
        return await Promise.race([executePromise, timeoutPromise]);
    }
    /**
     * Get health status of all providers
     */
    async getHealthStatus() {
        const healthPromises = this.getAllProviders().map(provider => provider.getHealth());
        return await Promise.all(healthPromises);
    }
    /**
     * Get the best available provider
     * Returns the first available provider based on policy
     */
    async getBestProvider() {
        const providers = this.policy.preferLocal
            ? [...this.getLocalProviders(), ...this.getCloudProviders()]
            : [...this.getCloudProviders(), ...this.getLocalProviders()];
        for (const provider of providers) {
            const available = await provider.isAvailable();
            if (available) {
                return provider;
            }
        }
        return null;
    }
    /**
     * Unregister a provider
     */
    async unregisterProvider(name) {
        const provider = this.providers.get(name);
        if (provider) {
            await provider.shutdown();
            this.providers.delete(name);
        }
    }
    /**
     * Shutdown all providers
     */
    async shutdown() {
        const shutdownPromises = this.getAllProviders().map(provider => provider.shutdown().catch(error => {
            console.warn(`Failed to shutdown provider ${provider.name}:`, error);
        }));
        await Promise.all(shutdownPromises);
        this.providers.clear();
        this.initialized = false;
    }
    /**
     * Update policy
     */
    updatePolicy(policy) {
        this.policy = { ...this.policy, ...policy };
    }
    /**
     * Get current policy
     */
    getPolicy() {
        return { ...this.policy };
    }
}
