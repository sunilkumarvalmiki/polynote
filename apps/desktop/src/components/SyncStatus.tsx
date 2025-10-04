import clsx from 'clsx';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SyncStatusData {
  isActive: boolean;
  lastSync?: string;
  connectorId?: string;
  progress?: number;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);

  useEffect(() => {
    void loadStatus();

    // Listen for sync progress updates
    const unsubscribe = window.electronAPI?.onSyncProgress?.(progress => {
      console.log('Sync progress:', progress);
      void loadStatus();
    });

    return () => unsubscribe?.();
  }, []);

  const loadStatus = async () => {
    try {
      const api = window.electronAPI;
      if (!api) return;
      const data = await api.getSyncStatus();
      if (data) setStatus(data);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  if (!status) {
    return <div className="text-xs text-muted-foreground">Loading sync status...</div>;
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
        <span>
          Last sync: {status.lastSync ? formatLastSync(status.lastSync) : 'Never'}
        </span>
      </div>

      {/* Sync Status */}
      <div className="space-y-1">
        <div
          className={clsx(
            'flex items-center gap-2 text-xs px-2 py-1.5 rounded',
            status.isActive ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
          )}
        >
          {status.isActive ? (
            <>
              <Clock size={12} className="animate-spin" />
              <span>Syncing{status.connectorId ? ` (${status.connectorId})` : ''}...</span>
              {status.progress !== undefined && <span>{Math.round(status.progress * 100)}%</span>}
            </>
          ) : (
            <>
              <CheckCircle size={12} />
              <span>Idle</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
