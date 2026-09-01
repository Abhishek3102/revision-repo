import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { Upload } from 'lucide-react';

interface SidebarProps {
  data: Record<string, any[]>;
  isOpen: boolean;
  currentFolder: string;
  currentFolder: string;
  currentDoc: string;
  onUpload: (file: File) => void;
}

export default function Sidebar({ data, isOpen, currentFolder, currentDoc, onUpload }: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <h2>Revision Hub</h2>
      
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
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
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
      </div>

      {Object.entries(data).map(([folder, docs]) => (
        <div key={folder} className="nav-group">
          <div className="nav-title">{folder.replace(/-/g, ' ')}</div>
          {docs.map(doc => {
            const isActive = currentFolder === folder && currentDoc === doc.id;
            return (
              <Link 
                key={doc.id}
                to={`/${encodeURIComponent(folder)}/${encodeURIComponent(doc.id)}`}
                className={`nav-link ${isActive ? 'active' : ''}`}
                title={doc.title}
              >
                {doc.title.replace(/\.[^/.]+$/, "")} {/* Remove extension */}
              </Link>
            )
          })}
        </div>
      ))}
    </aside>
  );
}
