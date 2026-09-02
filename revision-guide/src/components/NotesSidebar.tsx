import { useState } from 'react';
import { X, Trash2, Download, Wand2, Loader2 } from 'lucide-react';
import type { Note, Highlight } from '../App';

interface NotesSidebarProps {
  isOpen: boolean;
  notes: Note[];
  highlights: Highlight[];
  onClose: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateNote: (updated: Note) => void;
  apiUrl: string;
}

export default function NotesSidebar({ isOpen, notes, highlights, onClose, onDeleteNote, onDeleteHighlight, onUpdateNote, apiUrl }: NotesSidebarProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'highlights'>('notes');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [taggingId, setTaggingId] = useState<string | null>(null);

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));
  const filteredNotes = tagFilter ? notes.filter(n => (n.tags || []).includes(tagFilter)) : notes;

  const scrollToText = (text?: string) => {
    if (text) {
      let queryText = text;
      const match = text.match(/Regarding: "(.*?)"/);
      if (match) queryText = match[1];
      window.dispatchEvent(new CustomEvent('scroll-to-text', { detail: queryText }));
    }
  };

  const autoTag = async (note: Note) => {
    if (taggingId) return;
    setTaggingId(note.id);
    try {
      const res = await fetch(`${apiUrl}/ai/tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: note.text })
      });
      const data = await res.json();
      if (res.ok && data.tags && data.tags.length) {
        onUpdateNote({ ...note, tags: data.tags.slice(0, 3) });
      }
    } catch (e) {
      console.error('Auto-tag failed:', e);
    } finally {
      setTaggingId(null);
    }
  };

  const exportData = () => {
    const lines: string[] = [
      '# Revision Notes & Highlights',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '## Notes',
    ];
    if (notes.length === 0) lines.push('_No notes_');
    notes.forEach(n => lines.push(`- [${new Date(n.timestamp).toLocaleString()}]${(n.tags || []).length ? ` [#${(n.tags || []).join(' #')}]` : ''} ${n.text}`));
    lines.push('', '## Highlights');
    if (highlights.length === 0) lines.push('_No highlights_');
    highlights.forEach(h => lines.push(`- [${h.color || 'yellow'}] "${h.text}"`));

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revision-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className={`notes-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="notes-sidebar-header" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Dashboard</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            onClick={exportData}
            title="Export notes & highlights as Markdown"
            aria-label="Export notes and highlights"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
          >
            <Download size={20} />
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
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

      {/* Tag filter chips */}
      {activeTab === 'notes' && allTags.length > 0 && (
        <div className="tag-filter">
          <button className={`tag-chip ${tagFilter === null ? 'active' : ''}`} onClick={() => setTagFilter(null)}>All</button>
          {allTags.map(t => (
            <button key={t} className={`tag-chip ${tagFilter === t ? 'active' : ''}`} onClick={() => setTagFilter(tagFilter === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="tab-content">
        {activeTab === 'notes' ? (
          filteredNotes.length === 0 ? (
            <p className="empty-state">{notes.length === 0 ? 'No notes for this page yet.' : `No notes with tag "${tagFilter}".`}</p>
          ) : (
            filteredNotes.map(note => (
              <div key={note.id} className="note-card clickable" onClick={() => scrollToText(note.quote || note.text)}>
                <div className="note-header">
                  <span className="note-timestamp">{new Date(note.timestamp).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      className="delete-btn"
                      title="Auto-tag with AI"
                      onClick={(e) => { e.stopPropagation(); autoTag(note); }}
                    >
                      {taggingId === note.id ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />}
                    </button>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {(note.tags || []).length > 0 && (
                  <div className="note-tags" onClick={e => e.stopPropagation()}>
                    {(note.tags || []).map(t => (
                      <span key={t} className={`tag-chip small ${tagFilter === t ? 'active' : ''}`} onClick={() => setTagFilter(tagFilter === t ? null : t)}>{t}</span>
                    ))}
                  </div>
                )}
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
