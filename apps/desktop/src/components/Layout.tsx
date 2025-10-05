import { clsx } from 'clsx';
import { FileText, Network, Settings, RefreshCw, Home, GitBranch, Share2, ChevronLeft, ChevronRight, EyeOff, Menu } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import type {} from '../electron.d.ts';

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
  { name: 'Rules', path: '/rules', icon: <GitBranch size={20} /> },
  { name: 'Share', path: '/share', icon: <Share2 size={20} /> },
  { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [sidebarState, setSidebarState] = useState<'expanded' | 'collapsed' | 'hidden'>('expanded');

  useEffect(() => {
    // Load theme from settings
    const api = window.electronAPI;
    if (api) {
      void api
        .getSettings()
        .then((settings) => {
          document.documentElement.classList.toggle('dark', settings.theme === 'dark');
        })
        .catch((err: unknown) => {
          console.error('Failed to load settings:', err);
        });
    }
  }, []);

  // Keyboard shortcuts for sidebar control
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B: Toggle collapse
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarState(state =>
          state === 'expanded' ? 'collapsed' : 'expanded'
        );
      }
      
      // Ctrl/Cmd + Shift + B: Toggle hide
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setSidebarState(state =>
          state === 'hidden' ? 'expanded' : 'hidden'
        );
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const api = window.electronAPI;
      if (api) {
        await api.startSync();
      }
    } catch (error: unknown) {
      console.error('Sync failed:', error);
    } finally {
      setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      {sidebarState !== 'hidden' && (
        <aside className={clsx(
          "border-r border-border bg-card flex flex-col transition-all duration-300",
          sidebarState === 'expanded' ? "w-64" : "w-20"
        )}>
          {/* Logo */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            {sidebarState === 'expanded' ? (
              <>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    PolyNote
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">Universal Note Sync</p>
                </div>
                <button
                  onClick={() => setSidebarState('collapsed')}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setSidebarState('expanded')}
                className="p-1.5 hover:bg-muted rounded transition-colors mx-auto"
                aria-label="Expand sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    sidebarState === 'collapsed' && 'justify-center',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={sidebarState === 'collapsed' ? item.name : undefined}
                >
                  {item.icon}
                  {sidebarState === 'expanded' && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
          
          {/* Sync Controls */}
          <div className="p-4 border-t border-border space-y-3">
            <button
              onClick={() => void handleSync()}
              disabled={isSyncing}
              className={clsx(
                'w-full flex items-center gap-2 px-4 py-3 rounded-lg transition-colors',
                sidebarState === 'collapsed' && 'justify-center',
                isSyncing
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              title={sidebarState === 'collapsed' ? (isSyncing ? 'Syncing...' : 'Sync Now') : undefined}
            >
              <RefreshCw size={16} className={clsx(isSyncing && 'animate-spin')} />
              {sidebarState === 'expanded' && (
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              )}
            </button>
            
            {sidebarState === 'expanded' && <SyncStatus />}
          </div>
          
          {/* Hide/Show Toggle */}
          <div className="p-4 border-t border-border">
            <button
              onClick={() => setSidebarState('hidden')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <EyeOff size={16} />
              {sidebarState === 'expanded' && <span>Hide Sidebar</span>}
            </button>
          </div>
        </aside>
      )}
      
      {/* Show Sidebar Button (when hidden) */}
      {sidebarState === 'hidden' && (
        <button
          onClick={() => setSidebarState('expanded')}
          className="fixed top-4 left-4 z-50 p-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Show sidebar"
        >
          <Menu size={20} />
        </button>
      )}
      
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
