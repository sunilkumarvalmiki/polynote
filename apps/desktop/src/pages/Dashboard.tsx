import { useQuery } from '@tanstack/react-query';
import { FileText, Database, GitBranch, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  link?: string;
}

function StatCard({ title, value, icon, trend, link }: StatCardProps) {
  const content = (
    <div className="bg-card border border-border rounded-lg p-6 hover:border-primary transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
              <TrendingUp size={12} />
              {trend}
            </p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

export function Dashboard() {
  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => window.electronAPI?.getNotes() || Promise.resolve([]),
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['rules'],
    queryFn: () => window.electronAPI?.getRules() || Promise.resolve([]),
  });

  const { data: syncStatus } = useQuery({
    queryKey: ['syncStatus'],
    queryFn: () => window.electronAPI?.getSyncStatus() || Promise.resolve(null),
    refetchInterval: 5000,
  });

  const enabledConnectors = syncStatus?.connectors.filter((c: any) => c.enabled).length || 0;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to PolyNote. Here's an overview of your notes and sync status.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Notes"
            value={notes.length}
            icon={<FileText size={24} />}
            trend="+12% from last week"
            link="/notes"
          />
          <StatCard
            title="Active Connectors"
            value={enabledConnectors}
            icon={<Database size={24} />}
            link="/settings"
          />
          <StatCard
            title="Active Rules"
            value={rules.length}
            icon={<GitBranch size={24} />}
            link="/rules"
          />
        </div>

        {/* Recent Notes */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Notes</h2>
            <Link
              to="/notes"
              className="text-sm text-primary hover:text-primary/80"
            >
              View all
            </Link>
          </div>
          {notes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No notes yet. Create your first note to get started.</p>
              <Link
                to="/notes"
                className="inline-block mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Create Note
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.slice(0, 5).map((note: any) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="block p-4 rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-medium">{note.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {note.body}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1">
                        {note.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary/10 text-primary rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
