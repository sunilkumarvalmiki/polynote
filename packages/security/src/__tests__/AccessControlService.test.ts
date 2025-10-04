/**
 * Tests for Access Control Service
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { AccessControlService } from '../access/AccessControlService';
import { PermissionLevel } from '../types';

describe('AccessControlService', () => {
  let access: AccessControlService;

  beforeEach(() => {
    access = new AccessControlService();
  });

  describe('rule management', () => {
    it('should add access rule', async () => {
      const rule = await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      expect(rule.id).toBeTruthy();
      expect(rule.resourceType).toBe('note');
      expect(rule.resourceId).toBe('note-123');
      expect(rule.permission).toBe(PermissionLevel.READ);
      expect(rule.createdAt).toBeGreaterThan(0);
      expect(rule.updatedAt).toBe(rule.createdAt);
    });

    it('should generate unique rule IDs', async () => {
      const rule1 = await access.addRule({
        resourceType: 'note',
        resourceId: 'note-1',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const rule2 = await access.addRule({
        resourceType: 'note',
        resourceId: 'note-2',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      expect(rule1.id).not.toBe(rule2.id);
    });

    it('should remove access rule', async () => {
      const rule = await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      await access.removeRule(rule.id);

      const rules = await access.getRules('note', 'note-123');
      expect(rules.length).toBe(0);
    });

    it('should throw error when removing non-existent rule', async () => {
      await expect(
        access.removeRule('non-existent-id')
      ).rejects.toThrow('not found');
    });

    it('should get all rules for a resource', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.WRITE,
        priority: 50,
      });

      const rules = await access.getRules('note', 'note-123');
      expect(rules.length).toBe(2);
    });

    it('should update rule', async () => {
      const rule = await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));

      const updated = await access.updateRule(rule.id, {
        permission: PermissionLevel.WRITE,
      });

      expect(updated.permission).toBe(PermissionLevel.WRITE);
      expect(updated.updatedAt).toBeGreaterThanOrEqual(rule.createdAt);
    });

    it('should not change ID or createdAt when updating', async () => {
      const rule = await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const updated = await access.updateRule(rule.id, {
        id: 'new-id', // Should be ignored
        createdAt: 12345, // Should be ignored
        permission: PermissionLevel.WRITE,
      });

      expect(updated.id).toBe(rule.id);
      expect(updated.createdAt).toBe(rule.createdAt);
    });

    it('should clear all rules', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-1',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-2',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      await access.clearRules();

      expect(access.getRulesCount()).toBe(0);
    });
  });

  describe('permission checks', () => {
    it('should allow read with READ permission', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const allowed = await access.isAllowed('note', 'note-123', 'read');
      expect(allowed).toBe(true);
    });

    it('should not allow write with READ permission', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const allowed = await access.isAllowed('note', 'note-123', 'write');
      expect(allowed).toBe(false);
    });

    it('should allow read and write with WRITE permission', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.WRITE,
        priority: 100,
      });

      const canRead = await access.isAllowed('note', 'note-123', 'read');
      const canWrite = await access.isAllowed('note', 'note-123', 'write');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
    });

    it('should allow all actions with ADMIN permission', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.ADMIN,
        priority: 100,
      });

      const canRead = await access.isAllowed('note', 'note-123', 'read');
      const canWrite = await access.isAllowed('note', 'note-123', 'write');
      const canDelete = await access.isAllowed('note', 'note-123', 'delete');
      const canShare = await access.isAllowed('note', 'note-123', 'share');

      expect(canRead).toBe(true);
      expect(canWrite).toBe(true);
      expect(canDelete).toBe(true);
      expect(canShare).toBe(true);
    });

    it('should deny all actions with NONE permission', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.NONE,
        priority: 100,
      });

      const canRead = await access.isAllowed('note', 'note-123', 'read');
      const canWrite = await access.isAllowed('note', 'note-123', 'write');

      expect(canRead).toBe(false);
      expect(canWrite).toBe(false);
    });

    it('should default to allow when no rules exist', async () => {
      const allowed = await access.isAllowed('note', 'note-999', 'read');
      expect(allowed).toBe(true);
    });
  });

  describe('priority handling', () => {
    it('should use highest priority rule', async () => {
      // Lower priority - deny
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.NONE,
        priority: 50,
      });

      // Higher priority - allow
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const allowed = await access.isAllowed('note', 'note-123', 'read');
      expect(allowed).toBe(true);
    });

    it('should override lower priority rules', async () => {
      // Higher priority - deny
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.NONE,
        priority: 100,
      });

      // Lower priority - allow (should be ignored)
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.ADMIN,
        priority: 50,
      });

      const allowed = await access.isAllowed('note', 'note-123', 'read');
      expect(allowed).toBe(false);
    });
  });

  describe('wildcard patterns', () => {
    it('should match exact resource ID', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const allowed = await access.isAllowed('note', 'note-123', 'read');
      expect(allowed).toBe(true);
    });

    it('should match single wildcard pattern', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'private-*',
        permission: PermissionLevel.ADMIN,
        priority: 100,
      });

      const allowed = await access.isAllowed('note', 'private-123', 'delete');
      expect(allowed).toBe(true);
    });

    it('should match recursive wildcard pattern', async () => {
      await access.addRule({
        resourceType: 'folder',
        resourceId: 'work/**',
        permission: PermissionLevel.WRITE,
        priority: 100,
      });

      const allowed = await access.isAllowed('folder', 'work/projects/2024/notes', 'write');
      expect(allowed).toBe(true);
    });

    it('should not match different resource types', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const allowed = await access.isAllowed('folder', 'note-123', 'read');
      expect(allowed).toBe(true); // Default allow
    });
  });

  describe('principal-based access', () => {
    it('should check principal-specific rules', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        principal: 'user-alice',
        priority: 100,
      });

      const aliceAllowed = await access.isAllowed('note', 'note-123', 'read', 'user-alice');
      const bobAllowed = await access.isAllowed('note', 'note-123', 'read', 'user-bob');

      expect(aliceAllowed).toBe(true);
      expect(bobAllowed).toBe(true); // Default allow for Bob (no specific rule)
    });
  });

  describe('default rules', () => {
    it('should add default rules', async () => {
      await access.addDefaultRules();

      const rulesCount = access.getRulesCount();
      expect(rulesCount).toBeGreaterThan(0);
    });

    it('should enforce private tag rule', async () => {
      await access.addDefaultRules();

      const rules = await access.getRules('tag', 'private');
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].permission).toBe(PermissionLevel.ADMIN);
    });
  });

  describe('import/export', () => {
    it('should export rules to JSON', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      const json = access.exportRules();
      expect(json).toBeTruthy();
      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should import rules from JSON', () => {
      const rule = {
        id: 'test-rule-1',
        resourceType: 'note',
        resourceId: 'note-123',
        permission: PermissionLevel.READ,
        priority: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const json = JSON.stringify([rule]);
      access.importRules(json);

      expect(access.getRulesCount()).toBe(1);
    });

    it('should preserve rules after export/import', async () => {
      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-1',
        permission: PermissionLevel.READ,
        priority: 100,
      });

      await access.addRule({
        resourceType: 'note',
        resourceId: 'note-2',
        permission: PermissionLevel.WRITE,
        priority: 50,
      });

      const exported = access.exportRules();

      const newAccess = new AccessControlService();
      newAccess.importRules(exported);

      expect(newAccess.getRulesCount()).toBe(2);
    });
  });
});
