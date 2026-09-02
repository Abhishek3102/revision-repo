import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { Upload, Search, X, Sun, Moon, Pencil, Trash2, Command, Sparkles } from 'lucide-react';

interface SidebarProps {
  data: Record<string, any[]>;
  isOpen: boolean;
  currentFolder: string;
  currentDoc: string;
  onUploadFiles: (files: File[]) => void;
  onRenameDoc: (doc: any, folder: string) => void;
  onDeleteDoc: (doc: any, folder: string) => void;
  recent: { folder: string; doc: any }[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  onAskAI: () => void;
}

export default function Sidebar({
  data, isOpen, currentFolder, currentDoc,
  onUploadFiles, onRenameDoc, onDeleteDoc, recent,
  theme, onToggleTheme, onOpenPalette, onAskAI
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files as ArrayLike<File>);
    onUploadFiles(arr);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const q = query.trim().toLowerCase();
  const entries = Object.entries(data)
    .map(([folder, docs]) => {
      const matching = q
        ? docs.filter(d => d.title.toLowerCase().includes(q) || folder.toLowerCase().includes(q))
        : docs;
      return [folder, matching] as [string, any[]];
    })
    .filter(([, docs]) => docs.length > 0);

  return (
    <aside
      className={`sidebar ${isOpen ? 'mobile-open' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
    >
      <div className="sidebar-topline">
        <h2>Revision Hub</h2>
        <div className="sidebar-top-actions">
          <button className="icon-btn" onClick={onOpenPalette} title="Search (Ctrl+K)" aria-label="Open search palette">
            <Command size={18} />
          </button>
          <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <Search size={16} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="Search documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search documents"
        />
        {query && (
          <button className="sidebar-clear" onClick={() => setQuery('')} title="Clear search" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={18} style={{ marginRight: '0.5rem' }} /> Upload Document
        </button>
        <input
          type="file"
          accept=".txt,.md"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <div className={`dropzone ${dragOver ? 'drag-over' : ''}`}>
          or drop .txt / .md files here
        </div>
      </div>

      <button className="btn btn-secondary ai-quick-btn" onClick={onAskAI}>
        <Sparkles size={16} style={{ marginRight: '0.5rem' }} /> Ask AI
      </button>

      {recent.length > 0 && !q && (
        <div className="nav-group">
          <div className="nav-title">Recently viewed</div>
          {recent.map((r) => (
            <Link
              key={r.doc.id + '-recent'}
              to={`/${encodeURIComponent(r.folder)}/${encodeURIComponent(r.doc.id)}`}
              className="nav-link"
              title={r.doc.title}
            >
              {r.doc.title.replace(/\.[^/.]+$/, "")}
            </Link>
          ))}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="empty-state" style={{ padding: '0 1rem' }}>No documents match your search.</p>
      ) : (
        entries.map(([folder, docs]) => (
          <div key={folder} className="nav-group">
            <div className="nav-title">{folder.replace(/-/g, ' ')}</div>
            {docs.map(doc => {
              const isActive = currentFolder === folder && currentDoc === doc.id;
              return (
                <div key={doc.id} className={`nav-row ${isActive ? 'active' : ''}`}>
                  <Link
                    to={`/${encodeURIComponent(folder)}/${encodeURIComponent(doc.id)}`}
                    className="nav-link nav-link-main"
                    title={doc.title}
                  >
                    {doc.title.replace(/\.[^/.]+$/, "")}
                  </Link>
                  <div className="nav-row-actions">
                    <button
                      className="icon-btn-sm"
                      onClick={e => { e.preventDefault(); onRenameDoc(doc, folder); }}
                      title="Rename"
                      aria-label="Rename document"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="icon-btn-sm danger"
                      onClick={e => { e.preventDefault(); onDeleteDoc(doc, folder); }}
                      title="Delete"
                      aria-label="Delete document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </aside>
  );
}
