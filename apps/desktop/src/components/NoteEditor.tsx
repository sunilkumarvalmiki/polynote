import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Save, Eye, EyeOff, Sparkles, Languages, RefreshCw, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

interface NoteEditorProps {
  noteId: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch note data
  const { data: note, isLoading } = useQuery<Note>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      return await api.getNote(noteId);
    },
    enabled: !!noteId,
  });

  // Update mutation
  const updateMutation = useMutation<Note, Error, Partial<Note>>({
    mutationFn: async (updates) => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      return await api.updateNote(noteId, updates);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
      void queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setHasChanges(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const api = window.electronAPI;
      if (!api) throw new Error('Electron API not available');
      return await api.deleteNote(noteId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  // Initialize form with note data
  useEffect(() => {
    if (note) {
      setTitle(note.title ?? '');
      setContent(note.content ?? '');
      setTags(note.tags ?? []);
      setHasChanges(false);
    }
  }, [note]);

  // Track changes
  useEffect(() => {
    if (note) {
      const changed =
        title !== note.title ||
        content !== note.content ||
        JSON.stringify(tags) !== JSON.stringify(note.tags);
      setHasChanges(changed);
    }
  }, [title, content, tags, note]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ title, content, tags });
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to delete note:', error);
      }
    }
  };

  const handleAISummarize = async () => {
    setAiLoading(true);
    try {
      const api = window.electronAPI;
      if (!api) return;
      const summary = await api.summarizeNote(noteId);
      if (summary) setContent(prev => `${prev}\n\n## AI Summary\n\n${summary}`);
    } catch (error) {
      console.error('Failed to summarize:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAITranslate = async (targetLang: string) => {
    setAiLoading(true);
    try {
      const api = window.electronAPI;
      if (!api) return;
      const translation = await api.translateNote(noteId, targetLang);
      if (translation) setContent(translation);
    } catch (error) {
      console.error('Failed to translate:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIRewrite = async (style: string) => {
    setAiLoading(true);
    try {
      const api = window.electronAPI;
      if (!api) return;
      const rewritten = await api.rewriteNote(noteId, style);
      if (rewritten) setContent(rewritten);
    } catch (error) {
      console.error('Failed to rewrite:', error);
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Note not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={!hasChanges || updateMutation.isPending}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
              hasChanges && !updateMutation.isPending
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Save size={16} />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            onClick={() => setIsPreview(!isPreview)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            {isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Actions */}
          <div className="relative group">
            <button
              disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>AI</span>
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleAISummarize}
                className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Sparkles size={14} />
                Summarize
              </button>
              <button
                onClick={() => handleAITranslate('te')}
                className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Languages size={14} />
                Translate to Telugu
              </button>
              <button
                onClick={() => handleAITranslate('hi')}
                className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Languages size={14} />
                Translate to Hindi
              </button>
              <button
                onClick={() => handleAIRewrite('formal')}
                className="w-full px-4 py-2 text-left hover:bg-muted transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Rewrite (Formal)
              </button>
            </div>
          </div>

          <button
            onClick={() => void handleDelete()}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-auto">
        {isPreview ? (
          /* Preview Mode */
          <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-4xl font-bold mb-8">{title || 'Untitled'}</h1>
            {tags.length > 0 && (
              <div className="flex gap-2 mb-8">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkFrontmatter]}>{content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="h-full p-6 space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none"
            />

            {/* Tags */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add tags (comma-separated)..."
                value={tags.join(', ')}
                onChange={e =>
                  setTags(
                    e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(Boolean)
                  )
                }
                className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Start writing..."
              className="w-full flex-1 min-h-[500px] p-4 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm resize-none"
              spellCheck={false}
            />

            {/* Metadata Info */}
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(note.updatedAt).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
