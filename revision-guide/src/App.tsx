import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DocumentViewer from './components/DocumentViewer';
import NotesSidebar from './components/NotesSidebar';
import CommandPalette from './components/CommandPalette';
import OnboardingModal from './components/OnboardingModal';
import AIPanel from './components/AIPanel';
import data from './data.json';
import { Menu, BookOpen, Loader2, X, Wand2 } from 'lucide-react';
import './index.css';

// Types
export interface Note {
  id: string;
  text: string;
  timestamp: number;
  docId: string;
  quote?: string;
  tags?: string[];
}

export interface Highlight {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  docId: string;
  color?: string;
}

function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('rh-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [recent, setRecent] = useState<{ folder: string; doc: any }[]>(() => {
    try { return JSON.parse(localStorage.getItem('rh-recent') || '[]'); } catch { return []; }
  });
  const [editDoc, setEditDoc] = useState<{ doc: any; folder: string } | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [explain, setExplain] = useState<{ text: string; answer: string; loading: boolean } | null>(null);
  const [uploadNotice, setUploadNotice] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch data from MongoDB Backend
  useEffect(() => {
    fetch(`${API_URL}/notes`)
      .then(res => res.json())
      .then(data => setNotes(data))
      .catch(err => console.error('Error fetching notes:', err));
      
    fetch(`${API_URL}/highlights`)
      .then(res => res.json())
      .then(data => setHighlights(data))
      .catch(err => console.error('Error fetching highlights:', err));
      
    fetch(`${API_URL}/documents`)
      .then(res => res.json())
      .then(data => setUploadedDocs(data))
      .catch(err => console.error('Error fetching docs:', err));
  }, []);

  // Handle Note actions
  const addNote = async (docId: string, text: string, quote?: string) => {
    const newNote: Note = { id: Date.now().toString(), text, timestamp: Date.now(), docId, quote };
    
    // Optimistic UI update
    setNotes([...notes, newNote]);
    setNotesOpen(true);
    
    // Save to DB
    try {
      await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNote)
      });
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const deleteNote = async (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    try {
      await fetch(`${API_URL}/notes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Handle Highlight actions
  const addHighlight = async (docId: string, text: string, startIndex: number, endIndex: number, color?: string) => {
    const newHighlight: Highlight = { id: Date.now().toString(), text, startIndex, endIndex, docId, color: color || 'yellow' };
    setHighlights([...highlights, newHighlight]);
    
    try {
      await fetch(`${API_URL}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHighlight)
      });
    } catch (err) {
      console.error('Error saving highlight:', err);
    }
  };

  const deleteHighlight = async (id: string) => {
    setHighlights(highlights.filter(h => h.id !== id));
    try {
      await fetch(`${API_URL}/highlights/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting highlight:', err);
    }
  };

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Apply theme to <html> when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rh-theme', theme);
  }, [theme]);

  // Show onboarding on first visit
  useEffect(() => {
    if (!localStorage.getItem('rh-onboarded')) {
      setOnboardOpen(true);
    }
  }, []);

  // Ctrl/Cmd + K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Record recently viewed documents
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const folder = decodeURIComponent(parts[0]);
      const docId = decodeURIComponent(parts[1]);
      const folders = JSON.parse(JSON.stringify(data)) as Record<string, any[]>;
      const doc = folders[folder]?.find((d: any) => d.id === docId);
      if (doc) {
        setRecent(prev => {
          const next = [{ folder, doc }, ...prev.filter(r => r.doc.id !== docId)].slice(0, 5);
          localStorage.setItem('rh-recent', JSON.stringify(next));
          return next;
        });
      }
    }
  }, [location.pathname]);

  // Merge static data with dynamic uploaded docs
  const typedData = JSON.parse(JSON.stringify(data)) as Record<string, any[]>;
  uploadedDocs.forEach(doc => {
    const folder = doc.folder || 'Uploaded Documents';
    if (!typedData[folder]) {
      typedData[folder] = [];
    }
    // Avoid duplicates if same ID
    if (!typedData[folder].find(d => d.id === doc.id)) {
      typedData[folder].push(doc);
    }
  });

  // Determine current document based on URL
  const pathParts = location.pathname.split('/').filter(Boolean);
  const folderParam = pathParts[0] ? decodeURIComponent(pathParts[0]) : null;
  const docParam = pathParts[1] ? decodeURIComponent(pathParts[1]) : null;

  let currentDoc = null;
  if (folderParam && docParam) {
    currentDoc = typedData[folderParam]?.find(d => d.id === docParam);
  }

  // Redirect to first doc if none selected
  useEffect(() => {
    if (!folderParam || !docParam) {
       const firstFolder = Object.keys(typedData)[0];
       if (firstFolder && typedData[firstFolder].length > 0) {
         navigate(`/${encodeURIComponent(firstFolder)}/${encodeURIComponent(typedData[firstFolder][0].id)}`);
       }
    }
  }, [folderParam, docParam, navigate, typedData]);

  // Handle Document Upload (multiple files)
  const handleUploadFiles = (files: File[]) => {
    const textFiles = files.filter(f => /\.(txt|md|markdown)$/i.test(f.name));
    const skipped = files.length - textFiles.length;
    if (skipped > 0) {
      setUploadNotice(`${skipped} file(s) skipped — only .txt and .md are previewable right now.`);
      setTimeout(() => setUploadNotice(''), 5000);
    }
    textFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const newDoc = {
          id: file.name + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          title: file.name,
          content: content,
          folder: 'Uploaded Documents'
        };
        try {
          const res = await fetch(`${API_URL}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newDoc)
          });
          const savedDoc = await res.json();
          setUploadedDocs(prev => [...prev, savedDoc]);
        } catch (err) {
          console.error('Error uploading doc:', err);
        }
      };
      reader.readAsText(file);
    });
  };

  // Rename a document
  const openRename = (doc: any, folder: string) => {
    setEditDoc({ doc, folder });
    setEditTitle(doc.title);
  };
  const submitRename = async () => {
    if (!editDoc || !editTitle.trim()) return;
    const newTitle = editTitle.trim();
    const updated = { ...editDoc.doc, title: newTitle };
    setUploadedDocs(prev => prev.map(d => d.id === editDoc.doc.id ? updated : d));
    try {
      await fetch(`${API_URL}/documents/${editDoc.doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
    } catch (err) {
      console.error('Error renaming doc:', err);
    }
    setEditDoc(null);
    // Refresh current view if we renamed the open document
    setUploadedDocs(prev => prev.slice());
  };

  // Delete a document
  const handleDeleteDoc = async (doc: any, _folder: string) => {
    const ok = window.confirm(`Delete "${doc.title.replace(/\.[^/.]+$/, "")}"? Its notes & highlights will also be removed.`);
    if (!ok) return;
    setUploadedDocs(prev => prev.filter(d => d.id !== doc.id));
    try {
      await fetch(`${API_URL}/documents/${doc.id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting doc:', err);
    }
    if (docParam === doc.id) {
      navigate('/');
    }
  };

  // Update a note (tags) — optimistic + persisted
  const updateNote = async (updated: Note) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    try {
      await fetch(`${API_URL}/notes/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updated.tags })
      });
    } catch (err) {
      console.error('Error updating note:', err);
    }
  };

  // Explain selected text with AI
  const handleExplain = async (text: string) => {
    setExplain({ text, answer: '', loading: true });
    try {
      const res = await fetch(`${API_URL}/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json().catch(() => ({}));
      setExplain(prev => prev ? { ...prev, answer: data.answer || (data.error || 'AI is not configured on the backend.'), loading: false } : prev);
    } catch (err) {
      setExplain(prev => prev ? { ...prev, answer: 'Could not reach the AI service.', loading: false } : prev);
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Nav Toggle */}
      <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
        <Menu size={24} />
      </button>

      {/* Mobile Notes Toggle */}
      <button className="mobile-notes-toggle" onClick={() => setNotesOpen(!notesOpen)}>
        <BookOpen size={24} />
      </button>

      {/* Sidebars */}
      <Sidebar 
        data={typedData} 
        isOpen={mobileNavOpen} 
        currentFolder={folderParam || ''}
        currentDoc={docParam || ''}
        onUploadFiles={handleUploadFiles}
        onRenameDoc={openRename}
        onDeleteDoc={handleDeleteDoc}
        recent={recent}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onOpenPalette={() => setPaletteOpen(true)}
        onAskAI={() => { if (currentDoc) setAiPanelOpen(true); else alert('Open a document first to use AI tools.'); }}
      />
      
      <NotesSidebar 
        isOpen={notesOpen} 
        notes={notes.filter(n => n.docId === docParam)} 
        highlights={highlights.filter(h => h.docId === docParam)}
        onClose={() => setNotesOpen(false)}
        onDeleteNote={deleteNote}
        onDeleteHighlight={deleteHighlight}
        onUpdateNote={updateNote}
        apiUrl={API_URL}
      />

      {/* Main Content */}
      <main className="main-content">
        {currentDoc ? (
          <DocumentViewer 
            doc={currentDoc} 
            notes={notes.filter(n => n.docId === docParam)}
            highlights={highlights.filter(h => h.docId === docParam)}
            onAddHighlight={(text, start, end, color) => addHighlight(currentDoc.id, text, start, end, color)}
            onRemoveHighlight={deleteHighlight}
            onAddNote={(text, quote) => addNote(currentDoc.id, text, quote)}
            onOpenNotes={() => setNotesOpen(true)}
            onOpenAI={() => setAiPanelOpen(true)}
            onExplainSelection={handleExplain}
          />
        ) : (
          <div style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem'}}>
             <h2>Select a document to begin revision</h2>
             <p style={{ color: 'var(--text-secondary)' }}>Press Ctrl+K to search, or upload a document.</p>
          </div>
        )}
      </main>

      {/* Upload notice */}
      {uploadNotice && <div className="upload-notice">{uploadNotice}</div>}

      {/* Command palette */}
      <CommandPalette
        open={paletteOpen}
        data={typedData}
        onClose={() => setPaletteOpen(false)}
        onSelect={(folder, docId) => navigate(`/${encodeURIComponent(folder)}/${encodeURIComponent(docId)}`)}
      />

      {/* Onboarding */}
      <OnboardingModal
        open={onboardOpen}
        onClose={() => { setOnboardOpen(false); localStorage.setItem('rh-onboarded', '1'); }}
      />

      {/* AI Panel */}
      <AIPanel open={aiPanelOpen} apiUrl={API_URL} doc={currentDoc} onClose={() => setAiPanelOpen(false)} />

      {/* Explain selection modal */}
      {explain && (
        <div className="modal-overlay" onClick={() => setExplain(null)}>
          <div className="modal-content ai-panel" onClick={e => e.stopPropagation()}>
            <div className="onboarding-head">
              <h3 className="modal-title"><Wand2 size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Explain</h3>
              <button aria-label="Close" onClick={() => setExplain(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <blockquote className="ai-quote">&ldquo;{explain.text}&rdquo;</blockquote>
            {explain.loading ? (
              <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="spin" /> Explaining…
              </p>
            ) : (
              <p className="ai-summary" style={{ whiteSpace: 'pre-wrap' }}>{explain.answer}</p>
            )}
          </div>
        </div>
      )}

      {/* Rename modal */}
      {editDoc && (
        <div className="modal-overlay" onClick={() => setEditDoc(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Rename document</h3>
            <input
              className="modal-input"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') submitRename(); }}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditDoc(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRename}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
