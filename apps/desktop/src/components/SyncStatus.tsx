import clsx from 'clsx';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SyncStatusData {
  isRunning: boolean;
  lastSync: string;
  connectors: Array<{
    id: string;
    name: string;
    status: 'idle' | 'syncing' | 'error';
    enabled: boolean;
  }>;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);

  useEffect(() => {
    loadStatus();

    // Listen for sync progress updates
    const unsubscribe = window.electronAPI?.onSyncProgress?.((progress) => {
      console.log('Sync progress:', progress);
      loadStatus();
    });

    return () => unsubscribe?.();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await window.electronAPI?.getSyncStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  if (!status) {
    return (
      <div className="text-xs text-muted-foreground">
        Loading sync status...
      </div>
    );
  }

  const formatLastSync = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-2">
      {/* Last Sync */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock size={12} />
        <span>Last sync: {formatLastSync(status.lastSync)}</span>
      </div>

      {/* Connectors */}
      <div className="space-y-1">
        {status.connectors.filter(c => c.enabled).map((connector) => (
          <div
            key={connector.id}
            className={clsx(
              'flex items-center gap-2 text-xs px-2 py-1.5 rounded',
              connector.status === 'syncing' && 'bg-primary/10 text-primary',
              connector.status === 'error' && 'bg-destructive/10 text-destructive',
              connector.status === 'idle' && 'bg-muted/50 text-muted-foreground'
            )}
          >
            {connector.status === 'syncing' && <Clock size={12} className="animate-spin" />}
            {connector.status === 'error' && <AlertCircle size={12} />}
            {connector.status === 'idle' && <CheckCircle size={12} />}
            <span>{connector.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
