import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText, CornerDownLeft } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  data: Record<string, any[]>;
  onClose: () => void;
  onSelect: (folder: string, docId: string) => void;
}

export default function CommandPalette({ open, data, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const flat: { folder: string; doc: any; snippet: string }[] = [];
    for (const [folder, docs] of Object.entries(data)) {
      for (const doc of docs) {
        const title = doc.title || '';
        const content = (doc.content || '');
        const titleHit = title.toLowerCase().includes(q);
        const idx = content.toLowerCase().indexOf(q);
        if (titleHit || idx !== -1) {
          let snippet = '';
          if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            snippet = (start > 0 ? '…' : '') +
              content.substring(start, idx + q.length + 60) + '…';
          }
          flat.push({ folder, doc, snippet });
        }
      }
    }
    return flat.slice(0, 30);
  }, [query, data]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { setQuery(''); setActive(0); }, [open]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const handleSelect = (folder: string, docId: string) => {
    onSelect(folder, docId);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      handleSelect(results[active].folder, results[active].doc.id);
    }
    else if (e.key === 'Escape') { onClose(); }
  };

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()} role="dialog" aria-label="Search documents">
        <div className="palette-input-wrap">
          <Search size={18} className="palette-icon" />
          <input
            autoFocus
            className="palette-input"
            placeholder="Search across all documents…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search across all documents"
          />
          <span className="palette-kbd">ESC</span>
        </div>
        {results.length === 0 ? (
          <p className="palette-empty">No matches{query ? ` for "${query}"` : ''}.</p>
        ) : (
          <ul className="palette-list" ref={listRef}>
            {results.map((r, i) => (
              <li key={r.doc.id} className={i === active ? 'active' : ''}>
                <button onClick={() => handleSelect(r.folder, r.doc.id)}>
                  <FileText size={16} className="palette-result-icon" />
                  <span className="palette-result-text">
                    <span className="palette-result-title">{r.doc.title.replace(/\.[^/.]+$/, '')}</span>
                    {r.snippet && <span className="palette-result-snippet">{r.snippet}</span>}
                  </span>
                  {i === active && <CornerDownLeft size={14} className="palette-enter" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}