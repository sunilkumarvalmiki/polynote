import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useState } from 'react';

export function RulesPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: '',
    actions: [''],
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
    mutationFn: async (rule: { name: string; trigger: string; actions: string[] }) => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      return await api.createRule({ ...rule, enabled: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rules'] });
      setIsCreating(false);
      setNewRule({ name: '', trigger: '', actions: [''] });
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
    if (newRule.name && newRule.trigger && newRule.actions[0]) {
      createMutation.mutate(newRule);
    }
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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Plus size={16} />
            New Rule
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
                <input
                  type="text"
                  value={newRule.trigger}
                  onChange={e => setNewRule({ ...newRule, trigger: e.target.value })}
                  placeholder="e.g., tag:blog"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Actions</label>
                <input
                  type="text"
                  value={newRule.actions[0]}
                  onChange={e => setNewRule({ ...newRule, actions: [e.target.value] })}
                  placeholder="e.g., sync-to:notion"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                  'bg-card border rounded-lg p-4 flex items-center justify-between',
                  rule.enabled ? 'border-border' : 'border-muted opacity-60'
                )}
              >
                <div className="flex-1">
                  <h3 className="font-medium">{rule.name}</h3>
                  <div className="text-sm text-muted-foreground mt-1 space-x-4">
                    <span>
                      <strong>When:</strong> {rule.trigger}
                    </span>
                    <span>
                      <strong>Do:</strong> {rule.actions.join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-muted rounded">
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
