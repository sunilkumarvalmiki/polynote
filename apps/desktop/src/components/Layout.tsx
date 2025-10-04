import clsx from 'clsx';
import {
  FileText,
  Network,
  Settings,
  RefreshCw,
  Home,
  GitBranch,
  Download,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { SyncStatus } from './SyncStatus';


interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: <Home size={20} /> },
  { name: 'Notes', path: '/notes', icon: <FileText size={20} /> },
  { name: 'Graph', path: '/graph', icon: <Network size={20} /> },
  { name: 'Releases', path: '/releases', icon: <Download size={20} /> },
  { name: 'Rules', path: '/rules', icon: <GitBranch size={20} /> },
  { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load theme from settings
    window.electronAPI?.getSettings().then((settings) => {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    });
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await window.electronAPI?.startSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PolyNote
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Universal Note Sync</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sync Controls */}
        <div className="p-4 border-t border-border space-y-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors',
              isSyncing
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <RefreshCw size={16} className={clsx(isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <SyncStatus />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
