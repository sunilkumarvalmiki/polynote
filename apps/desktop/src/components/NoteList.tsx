import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { FileText } from 'lucide-react';
import { useRef } from 'react';

interface NoteListProps {
  searchQuery: string;
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
}

interface Note {
  id: string;
  title: string;
  body: string;
  tags?: string[];
  updatedAt: string;
}

export function NoteList({ searchQuery, selectedNoteId, onNoteSelect }: NoteListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Fetch notes with optional search filter
  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ['notes', searchQuery],
    queryFn: async () => {
      if (searchQuery) {
        return window.electronAPI?.searchNotes(searchQuery) || [];
      }
      return window.electronAPI?.getNotes() || [];
    },
  });

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: notes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height per note item
    overscan: 5, // Number of items to render outside of visible area
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center px-4">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {searchQuery ? 'No notes found matching your search' : 'No notes yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const note = notes[virtualItem.index];
          const isSelected = note.id === selectedNoteId;

          return (
            <div
              key={note.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <button
                onClick={() => onNoteSelect(note.id)}
                className={clsx(
                  'w-full p-4 text-left border-b border-border transition-colors',
                  isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted'
                )}
              >
                <h3
                  className={clsx(
                    'font-medium mb-1 truncate',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {note.title || 'Untitled'}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {note.body || 'No content'}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {new Date(note.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1">
                      {note.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
