/**
 * Access Control Service
 * Manages permissions and access rules for notes, folders, and tags
 */

import {
  IAccessControlService,
  AccessRule,
  PermissionLevel,
  SecurityError,
  SecurityErrorCode,
} from '../types';

/**
 * Action to permission mapping
 */
const ACTION_PERMISSIONS: Record<string, PermissionLevel[]> = {
  read: [PermissionLevel.READ, PermissionLevel.WRITE, PermissionLevel.ADMIN],
  write: [PermissionLevel.WRITE, PermissionLevel.ADMIN],
  delete: [PermissionLevel.ADMIN],
  share: [PermissionLevel.ADMIN],
};

export class AccessControlService implements IAccessControlService {
  private rules: Map<string, AccessRule> = new Map();

  /**
   * Check if action is allowed on a resource
   */
  async isAllowed(
    resourceType: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete' | 'share',
    principal?: string
  ): Promise<boolean> {
    try {
      // Get all rules that apply to this resource
      const applicableRules = this.getApplicableRules(resourceType, resourceId, principal);

      if (applicableRules.length === 0) {
        // No rules = default allow (for now)
        // In production, you might want default deny
        return true;
      }

      // Sort by priority (higher priority first)
      applicableRules.sort((a, b) => b.priority - a.priority);

      // Check highest priority rule
      const highestPriorityRule = applicableRules[0];

      // Check if the permission level allows this action
      const requiredPermissions = ACTION_PERMISSIONS[action] || [];
      return requiredPermissions.includes(highestPriorityRule.permission);
    } catch (error) {
      throw new SecurityError(
        `Access check failed for ${resourceType}:${resourceId}`,
        SecurityErrorCode.ACCESS_DENIED,
        error as Error
      );
    }
  }

  /**
   * Add a new access rule
   */
  async addRule(rule: Omit<AccessRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccessRule> {
    const id = this.generateRuleId();
    const now = Date.now();

    const newRule: AccessRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.rules.set(id, newRule);
    return newRule;
  }

  /**
   * Remove an access rule
   */
  async removeRule(ruleId: string): Promise<void> {
    if (!this.rules.has(ruleId)) {
      throw new SecurityError(`Rule not found: ${ruleId}`, SecurityErrorCode.ACCESS_DENIED);
    }

    this.rules.delete(ruleId);
  }

  /**
   * Get all rules for a resource
   */
  async getRules(resourceType: string, resourceId: string): Promise<AccessRule[]> {
    return Array.from(this.rules.values()).filter(
      rule =>
        rule.resourceType === resourceType &&
        (rule.resourceId === resourceId || this.matchesPattern(resourceId, rule.resourceId))
    );
  }

  /**
   * Update an existing rule
   */
  async updateRule(ruleId: string, updates: Partial<AccessRule>): Promise<AccessRule> {
    const rule = this.rules.get(ruleId);

    if (!rule) {
      throw new SecurityError(`Rule not found: ${ruleId}`, SecurityErrorCode.ACCESS_DENIED);
    }

    const updatedRule: AccessRule = {
      ...rule,
      ...updates,
      id: rule.id, // Prevent ID change
      createdAt: rule.createdAt, // Prevent creation time change
      updatedAt: Date.now(),
    };

    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Clear all rules
   */
  async clearRules(): Promise<void> {
    this.rules.clear();
  }

  /**
   * Get applicable rules for a resource
   */
  private getApplicableRules(
    resourceType: string,
    resourceId: string,
    principal?: string
  ): AccessRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      // Check resource type matches
      if (rule.resourceType !== resourceType) {
        return false;
      }

      // Check resource ID matches (exact or pattern)
      if (!this.matchesPattern(resourceId, rule.resourceId)) {
        return false;
      }

      // Check principal matches (if specified)
      if (rule.principal && principal && rule.principal !== principal) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if resource ID matches a pattern
   * Supports wildcards: * (any) and ** (recursive)
   */
  private matchesPattern(resourceId: string, pattern: string): boolean {
    // Exact match
    if (resourceId === pattern) {
      return true;
    }

    // Wildcard patterns
    if (pattern.includes('*')) {
      // Convert pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*') // ** matches anything
        .replace(/\*/g, '[^/]*'); // * matches anything except /

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(resourceId);
    }

    return false;
  }

  /**
   * Generate unique rule ID
   */
  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Add default rules for common scenarios
   */
  async addDefaultRules(): Promise<void> {
    // Example: Private notes are admin-only
    await this.addRule({
      resourceType: 'tag',
      resourceId: 'private',
      permission: PermissionLevel.ADMIN,
      priority: 100,
    });

    // Example: Shared notes are read-only by default
    await this.addRule({
      resourceType: 'tag',
      resourceId: 'shared',
      permission: PermissionLevel.READ,
      priority: 50,
    });
  }

  /**
   * Export rules to JSON
   */
  exportRules(): string {
    const rulesArray = Array.from(this.rules.values());
    return JSON.stringify(rulesArray, null, 2);
  }

  /**
   * Import rules from JSON
   */
  importRules(json: string): void {
    const rulesArray: AccessRule[] = JSON.parse(json);
    this.rules.clear();

    for (const rule of rulesArray) {
      this.rules.set(rule.id, rule);
    }
  }

  /**
   * Get rules count
   */
  getRulesCount(): number {
    return this.rules.size;
  }
}
