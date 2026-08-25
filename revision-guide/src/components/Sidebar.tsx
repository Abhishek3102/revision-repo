import { Link } from 'react-router-dom';

interface SidebarProps {
  data: Record<string, any[]>;
  isOpen: boolean;
  currentFolder: string;
  currentDoc: string;
}

export default function Sidebar({ data, isOpen, currentFolder, currentDoc }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <h2>Revision Hub</h2>
      
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
