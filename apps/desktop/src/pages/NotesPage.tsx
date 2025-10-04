import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { NoteEditor } from '../components/NoteEditor';
import { NoteList } from '../components/NoteList';
import { SearchBar } from '../components/SearchBar';

export function NotesPage() {
  const { noteId } = useParams<{ noteId?: string }>();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(noteId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNoteSelect = (id: string) => {
    setSelectedNoteId(id);
  };

  const handleNoteCreate = async () => {
    try {
      const newNote = await window.electronAPI?.createNote({
        title: 'Untitled Note',
        body: '',
        tags: [],
      });
      if (newNote) {
        setSelectedNoteId(newNote.id);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - Note List */}
      <div className="w-96 border-r border-border flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search notes..." />
          <button
            onClick={handleNoteCreate}
            className="w-full mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            + New Note
          </button>
        </div>

        {/* Note List */}
        <NoteList
          searchQuery={searchQuery}
          selectedNoteId={selectedNoteId}
          onNoteSelect={handleNoteSelect}
        />
      </div>

      {/* Right Panel - Note Editor */}
      <div className="flex-1">
        {selectedNoteId ? (
          <NoteEditor noteId={selectedNoteId} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">No note selected</p>
              <p className="text-sm">Select a note from the list or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
