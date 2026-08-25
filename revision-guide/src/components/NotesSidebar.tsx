import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Note, Highlight } from '../App';

interface NotesSidebarProps {
  isOpen: boolean;
  notes: Note[];
  highlights: Highlight[];
  onClose: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
}

export default function NotesSidebar({ isOpen, notes, highlights, onClose, onDeleteNote, onDeleteHighlight }: NotesSidebarProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'highlights'>('notes');

  const scrollToText = (text?: string) => {
    if (text) {
      // In case the note contains the "Regarding: " prefix, extract the quote
      let queryText = text;
      const match = text.match(/Regarding: "(.*?)"/);
      if (match) queryText = match[1];

      window.dispatchEvent(new CustomEvent('scroll-to-text', { detail: queryText }));
    }
  };

  return (
    <aside className={`notes-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="notes-sidebar-header" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Dashboard</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
          Notes ({notes.length})
        </button>
        <button className={`tab ${activeTab === 'highlights' ? 'active' : ''}`} onClick={() => setActiveTab('highlights')}>
          Highlights ({highlights.length})
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'notes' ? (
          notes.length === 0 ? (
            <p className="empty-state">No notes for this page yet.</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="note-card clickable" onClick={() => scrollToText(note.quote || note.text)}>
                <div className="note-header">
                  <span className="note-timestamp">{new Date(note.timestamp).toLocaleDateString()}</span>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <p>{note.text}</p>
              </div>
            ))
          )
        ) : (
          highlights.length === 0 ? (
            <p className="empty-state">No highlights for this page yet.</p>
          ) : (
            highlights.map(highlight => (
              <div key={highlight.id} className="note-card clickable highlight-card" style={{borderLeftColor: `var(--${highlight.color || 'yellow'})`}} onClick={() => scrollToText(highlight.text)}>
                <div className="note-header">
                  <span className="note-timestamp" style={{textTransform: 'capitalize'}}>{highlight.color || 'yellow'} Highlight</span>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteHighlight(highlight.id); }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <p>"{highlight.text.length > 80 ? highlight.text.substring(0, 80) + '...' : highlight.text}"</p>
              </div>
            ))
          )
        )}
      </div>
    </aside>
  );
}
