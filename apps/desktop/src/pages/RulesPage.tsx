import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Plus, Trash2, Edit, Clock, ToggleRight, ToggleLeft } from 'lucide-react';
import { useState } from 'react';

interface Condition {
  field: 'title' | 'content' | 'tags';
  operator: 'contains' | 'matches' | 'equals';
  value: string;
}

interface Action {
  type: 'addTag' | 'moveToFolder' | 'notify' | 'summarize';
  params: Record<string, any>;
}

interface Rule {
  id: string;
  name: string;
  trigger: 'onCreate' | 'onUpdate' | 'onTag';
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function RulesPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<{
    name: string;
    trigger: 'onCreate' | 'onUpdate' | 'onTag';
    conditions: Condition[];
    actions: Action[];
  }>({
    name: '',
    trigger: 'onCreate',
    conditions: [{ field: 'title', operator: 'contains', value: '' }],
    actions: [{ type: 'addTag', params: { tag: '' } }],
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const api = window.electronAPI;
      if (!api) return [];
      return await api.getRules();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (rule: any) => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      return await api.createRule({ ...rule, enabled: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
      setIsCreating(false);
      setNewRule({
        name: '',
        trigger: 'onCreate',
        conditions: [{ field: 'title', operator: 'contains', value: '' }],
        actions: [{ type: 'addTag', params: { tag: '' } }],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      await api.deleteRule(ruleId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
    },
  });

  const handleCreate = () => {
    if (newRule.name && newRule.trigger && newRule.conditions[0]?.value) {
      createMutation.mutate(newRule);
    }
  };

  const formatConditions = (conditions: Condition[]): string => {
    return conditions
      .map(c => `${c.field} ${c.operator} "${c.value}"`)
      .join(' AND ');
  };

  const formatActions = (actions: Action[]): string => {
    return actions
      .map(a => {
        switch (a.type) {
          case 'addTag':
            return `Add tag: ${a.params.tag}`;
          case 'moveToFolder':
            return `Move to: ${a.params.folderId}`;
          case 'notify':
            return `Notify: ${a.params.message}`;
          case 'summarize':
            return 'Generate summary';
          default:
            return a.type;
        }
      })
      .join(', ');
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sync Rules</h1>
            <p className="text-muted-foreground mt-1">
              Define rules to automate note organization and syncing
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            aria-label="Create new rule"
            title="Create new rule"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Create Rule Form */}
        {isCreating && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Create New Rule</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., Blog posts to Notion"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trigger</label>
                <select
                  value={newRule.trigger}
                  onChange={e => setNewRule({ ...newRule, trigger: e.target.value as any })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="onCreate">On Create</option>
                  <option value="onUpdate">On Update</option>
                  <option value="onTag">On Tag Change</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Condition</label>
                <div className="flex gap-2">
                  <select
                    value={newRule.conditions[0]?.field || 'title'}
                    onChange={e =>
                      setNewRule({
                        ...newRule,
                        conditions: [{ ...newRule.conditions[0], field: e.target.value as any }],
                      })
                    }
                    className="px-4 py-2 bg-muted border border-border rounded-lg"
                  >
                    <option value="title">Title</option>
                    <option value="content">Content</option>
                    <option value="tags">Tags</option>
                  </select>
                  <select
                    value={newRule.conditions[0]?.operator || 'contains'}
                    onChange={e =>
                      setNewRule({
                        ...newRule,
                        conditions: [{ ...newRule.conditions[0], operator: e.target.value as any }],
                      })
                    }
                    className="px-4 py-2 bg-muted border border-border rounded-lg"
                  >
                    <option value="contains">contains</option>
                    <option value="matches">matches</option>
                    <option value="equals">equals</option>
                  </select>
                  <input
                    type="text"
                    value={newRule.conditions[0]?.value || ''}
                    onChange={e =>
                      setNewRule({
                        ...newRule,
                        conditions: [{ ...newRule.conditions[0], value: e.target.value }],
                      })
                    }
                    placeholder="value"
                    className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <div className="flex gap-2">
                  <select
                    value={newRule.actions[0]?.type || 'addTag'}
                    onChange={e => {
                      const type = e.target.value as Action['type'];
                      const params =
                        type === 'addTag'
                          ? { tag: '' }
                          : type === 'moveToFolder'
                          ? { folderId: '' }
                          : type === 'notify'
                          ? { message: '' }
                          : {};
                      setNewRule({
                        ...newRule,
                        actions: [{ type, params }],
                      });
                    }}
                    className="px-4 py-2 bg-muted border border-border rounded-lg"
                  >
                    <option value="addTag">Add Tag</option>
                    <option value="moveToFolder">Move to Folder</option>
                    <option value="notify">Notify</option>
                    <option value="summarize">Summarize</option>
                  </select>
                  {newRule.actions[0]?.type === 'addTag' && (
                    <input
                      type="text"
                      value={newRule.actions[0]?.params?.tag || ''}
                      onChange={e =>
                        setNewRule({
                          ...newRule,
                          actions: [{ type: 'addTag', params: { tag: e.target.value } }],
                        })
                      }
                      placeholder="tag name"
                      className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg"
                    />
                  )}
                  {newRule.actions[0]?.type === 'moveToFolder' && (
                    <input
                      type="text"
                      value={newRule.actions[0]?.params?.folderId || ''}
                      onChange={e =>
                        setNewRule({
                          ...newRule,
                          actions: [{ type: 'moveToFolder', params: { folderId: e.target.value } }],
                        })
                      }
                      placeholder="folder ID"
                      className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg"
                    />
                  )}
                  {newRule.actions[0]?.type === 'notify' && (
                    <input
                      type="text"
                      value={newRule.actions[0]?.params?.message || ''}
                      onChange={e =>
                        setNewRule({
                          ...newRule,
                          actions: [{ type: 'notify', params: { message: e.target.value } }],
                        })
                      }
                      placeholder="notification message"
                      className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">
                No rules yet. Create your first rule to automate your workflow.
              </p>
            </div>
          ) : (
            rules.map(rule => (
              <div
                key={rule.id}
                className={clsx(
                  'bg-card border rounded-lg p-4',
                  rule.enabled
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-muted opacity-60'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{rule.name}</h3>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        rule.enabled
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                      )}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[60px]">Trigger:</span>
                        <code className="px-2 py-0.5 bg-muted rounded text-xs">{rule.trigger}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[60px]">When:</span>
                        <code className="px-2 py-0.5 bg-muted rounded text-xs">{formatConditions(rule.conditions)}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[60px]">Then:</span>
                        <code className="px-2 py-0.5 bg-muted rounded text-xs">{formatActions(rule.actions)}</code>
                      </div>
                      {rule.updatedAt && (
                        <div className="flex items-center gap-2 text-xs pt-1">
                          <Clock size={12} />
                          <span>Last updated: {new Date(rule.updatedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      className={clsx(
                        'p-2 rounded transition-colors',
                        rule.enabled
                          ? 'hover:bg-orange-500/10 text-orange-600'
                          : 'hover:bg-green-500/10 text-green-600'
                      )}
                      title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button className="p-2 hover:bg-muted rounded" title="Edit rule">
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded"
                      title="Delete rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
