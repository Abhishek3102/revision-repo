import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DocumentViewer from './components/DocumentViewer';
import NotesSidebar from './components/NotesSidebar';
import data from './data.json';
import { Menu, BookOpen } from 'lucide-react';
import './index.css';

// Types
export interface Note {
  id: string;
  text: string;
  timestamp: number;
  docId: string;
  quote?: string;
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
  const location = useLocation();
  const navigate = useNavigate();

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

  // Determine current document based on URL
  const pathParts = location.pathname.split('/').filter(Boolean);
  const folderParam = pathParts[0] ? decodeURIComponent(pathParts[0]) : null;
  const docParam = pathParts[1] ? decodeURIComponent(pathParts[1]) : null;

  let currentDoc = null;
  if (folderParam && docParam) {
    const typedData = data as Record<string, any[]>;
    currentDoc = typedData[folderParam]?.find(d => d.id === docParam);
  }

  // Redirect to first doc if none selected
  useEffect(() => {
    if (!folderParam || !docParam) {
       const typedData = data as Record<string, any[]>;
       const firstFolder = Object.keys(typedData)[0];
       if (firstFolder && typedData[firstFolder].length > 0) {
         navigate(`/${encodeURIComponent(firstFolder)}/${encodeURIComponent(typedData[firstFolder][0].id)}`);
       }
    }
  }, [folderParam, docParam, navigate]);

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
        data={data} 
        isOpen={mobileNavOpen} 
        currentFolder={folderParam || ''}
        currentDoc={docParam || ''}
      />
      
      <NotesSidebar 
        isOpen={notesOpen} 
        notes={notes.filter(n => n.docId === docParam)} 
        highlights={highlights.filter(h => h.docId === docParam)}
        onClose={() => setNotesOpen(false)}
        onDeleteNote={deleteNote}
        onDeleteHighlight={deleteHighlight}
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
          />
        ) : (
          <div style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center'}}>
             <h2>Select a document to begin revision</h2>
          </div>
        )}
      </main>
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
