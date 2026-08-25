import { useState, useEffect, useRef } from 'react';
import type { Highlight, Note } from '../App';
import { Highlighter, MessageSquarePlus, Eraser, Eye } from 'lucide-react';

interface DocumentViewerProps {
  doc: { id: string; title: string; content: string };
  notes: Note[];
  highlights: Highlight[];
  onAddHighlight: (text: string, start: number, end: number, color?: string) => void;
  onRemoveHighlight: (id: string) => void;
  onAddNote: (text: string, quote?: string) => void;
  onOpenNotes: () => void;
}

export default function DocumentViewer({ doc, notes, highlights, onAddHighlight, onRemoveHighlight, onAddNote, onOpenNotes }: DocumentViewerProps) {
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pendingNoteQuote, setPendingNoteQuote] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle Text Selection
  useEffect(() => {
    const handleMouseUp = () => {
      // Don't clear selection if modal is open
      if (isNoteModalOpen) return;
      
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0 && contentRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: sel.toString().trim(),
          rect: rect
        });
        setActiveHighlightId(null);
      } else {
        setTimeout(() => {
          setSelection(current => {
             // Check if modal was opened in the meantime
             return document.querySelector('.modal-overlay') ? current : null;
          });
        }, 150);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isNoteModalOpen]);

  // Listen for scroll-to-text events from the sidebar
  useEffect(() => {
    const handleScrollEvent = (e: CustomEvent) => {
      const textToFind = e.detail;
      if (!textToFind || !contentRef.current) return;
      
      // Find the text node or element containing this text
      const elements = Array.from(contentRef.current.querySelectorAll('p, li, h1, h2, h3, span'));
      const targetEl = elements.find(el => el.textContent?.includes(textToFind));
      
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash effect
        (targetEl as HTMLElement).style.transition = 'background-color 0.5s';
        (targetEl as HTMLElement).style.backgroundColor = 'rgba(250, 204, 21, 0.4)';
        setTimeout(() => {
          (targetEl as HTMLElement).style.backgroundColor = 'transparent';
        }, 1500);
      }
    };

    window.addEventListener('scroll-to-text', handleScrollEvent as EventListener);
    return () => {
      window.removeEventListener('scroll-to-text', handleScrollEvent as EventListener);
    };
  }, []);

  const handleHighlight = (color: string) => {
    if (selection) {
      onAddHighlight(selection.text, 0, 0, color); 
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText, pendingNoteQuote);
      setNoteText("");
      setPendingNoteQuote("");
      setIsNoteModalOpen(false);
      setSelection(null);
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const highlightSegment = target.closest('.highlight-segment');
    
    if (highlightSegment) {
      const id = highlightSegment.getAttribute('data-id');
      if (id) {
        const rect = highlightSegment.getBoundingClientRect();
        setActiveHighlightId({ id, rect });
        setSelection(null);
      }
    } else {
      setActiveHighlightId(null);
    }
  };

  // Render text with highlights
  const renderHighlightedContent = () => {
    let content = doc.content;
    
    // Process notes for white underlines
    const sortedNotes = [...notes].filter(n => n.quote).sort((a, b) => b.quote!.length - a.quote!.length);
    sortedNotes.forEach(n => {
      if (n.quote) {
        const escaped = n.quote.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'g');
        content = content.replace(regex, `%%NS_${n.id}%%$1%%NE%%`);
      }
    });

    // Sort highlights by length descending to prevent shorter highlights from breaking longer ones
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
    
    sortedHighlights.forEach(h => {
      if (h.text) {
        const escaped = h.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'g');
        const bgColor = h.color === 'yellow' ? 'rgba(250, 204, 21, 0.4)' : 
                       h.color === 'pink' ? 'rgba(244, 114, 182, 0.4)' : 
                       h.color === 'green' ? 'rgba(74, 222, 128, 0.4)' : 
                       h.color === 'blue' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(250, 204, 21, 0.4)';
        const borderColor = h.color === 'yellow' ? '#facc15' : 
                           h.color === 'pink' ? '#f472b6' : 
                           h.color === 'green' ? '#4ade80' : 
                           h.color === 'blue' ? '#60a5fa' : '#facc15';

        content = content.replace(regex, `%%HS_${h.id}_${bgColor}_${borderColor}%%$1%%HE%%`);
      }
    });

    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const paragraphs = content.split('\n');

    return paragraphs.map((para, idx) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;
      
      let processedHtml = trimmedPara;
      
      // Replace highlight tokens with actual HTML
      const tokenRegex = /%%HS_([a-zA-Z0-9]+)_([^_]+)_([^%]+)%%(.*?)%%HE%%/g;
      processedHtml = processedHtml.replace(tokenRegex, (match, id, bgColor, borderColor, text) => {
        return `<span class="highlight-segment" data-id="${id}" style="background-color: ${bgColor}; border-bottom: 2px solid ${borderColor}; cursor: pointer; border-radius: 2px; padding: 0 2px;">${text}</span>`;
      });
      
      // Replace note tokens with actual HTML
      const noteTokenRegex = /%%NS_([a-zA-Z0-9]+)%%(.*?)%%NE%%/g;
      processedHtml = processedHtml.replace(noteTokenRegex, (match, id, text) => {
        return `<span class="note-segment" data-note-id="${id}" style="border-bottom: 2px dashed rgba(255, 255, 255, 0.7); text-underline-offset: 4px; padding-bottom: 2px; cursor: pointer;">${text}</span>`;
      });

      if (trimmedPara.startsWith('### ')) return <h3 key={idx} dangerouslySetInnerHTML={{__html: processedHtml.substring(4)}} />;
      if (trimmedPara.startsWith('## ')) return <h2 key={idx} dangerouslySetInnerHTML={{__html: processedHtml.substring(3)}} />;
      if (trimmedPara.startsWith('# ')) return <h1 key={idx} dangerouslySetInnerHTML={{__html: processedHtml.substring(2)}} />;
      
      if (trimmedPara.startsWith('- ') || trimmedPara.startsWith('• ') || trimmedPara.startsWith('▼ ')) {
        return <li style={{marginLeft: '1.5rem', marginBottom: '0.5rem', listStyleType: 'disc'}} key={idx} dangerouslySetInnerHTML={{__html: processedHtml.substring(2)}} />;
      }
      
      if (/^\d+\.\s/.test(trimmedPara)) {
         const dotIndex = trimmedPara.indexOf('.');
         return <li style={{marginLeft: '1.5rem', marginBottom: '0.5rem', listStyleType: 'decimal'}} key={idx} dangerouslySetInnerHTML={{__html: processedHtml.substring(dotIndex + 1).trim()}} />;
      }
      
      const imageMatch = trimmedPara.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
         return (
           <div key={idx} style={{ margin: '2rem 0', textAlign: 'center' }}>
             <img src={imageMatch[2]} alt={imageMatch[1]} className="doc-image" />
             {imageMatch[1] && <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem'}}>{imageMatch[1]}</p>}
           </div>
         );
      }
      
      return <p key={idx} style={{ marginBottom: '1rem', lineHeight: '1.7' }} dangerouslySetInnerHTML={{ __html: processedHtml }} />;
    });
  };

  return (
    <div className="document-viewer">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: 0 }}>{doc.title.replace(/\.[^/.]+$/, "")}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onOpenNotes}>
            <Eye size={18} /> Notes ({notes.length})
          </button>
          <button className="btn btn-primary" onClick={() => setIsNoteModalOpen(true)}>
            <MessageSquarePlus size={18} /> Add Note
          </button>
        </div>
      </div>

      <div ref={contentRef} className="document-content glass" style={{ padding: '2rem', borderRadius: '12px' }} onClick={handleContentClick}>
        {renderHighlightedContent()}
      </div>

      {/* Floating Toolbar for Selection */}
      {selection && (
        <div 
          className="selection-toolbar"
          style={{
            top: `${selection.rect.top + window.scrollY}px`,
            left: `${selection.rect.left + (selection.rect.width / 2)}px`
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid var(--border-color)', paddingRight: '8px', marginRight: '4px'}}>
             <button className="color-btn" style={{backgroundColor: '#facc15'}} onClick={(e) => { e.preventDefault(); handleHighlight('yellow'); }} title="Yellow"></button>
             <button className="color-btn" style={{backgroundColor: '#f472b6'}} onClick={(e) => { e.preventDefault(); handleHighlight('pink'); }} title="Pink"></button>
             <button className="color-btn" style={{backgroundColor: '#4ade80'}} onClick={(e) => { e.preventDefault(); handleHighlight('green'); }} title="Green"></button>
             <button className="color-btn" style={{backgroundColor: '#60a5fa'}} onClick={(e) => { e.preventDefault(); handleHighlight('blue'); }} title="Blue"></button>
          </div>
          <button className="toolbar-btn" onClick={(e) => { 
            e.preventDefault(); 
            setIsNoteModalOpen(true); 
            setPendingNoteQuote(selection.text);
            setNoteText(`Regarding: "${selection.text}"\n\n`);
          }}>
            <MessageSquarePlus size={16} color="var(--text-primary)" /> Note
          </button>
        </div>
      )}

      {/* Eraser Toolbar for Active Highlight */}
      {activeHighlightId && (
        <div 
          className="selection-toolbar"
          style={{
            top: `${activeHighlightId.rect.top + window.scrollY}px`,
            left: `${activeHighlightId.rect.left + (activeHighlightId.rect.width / 2)}px`
          }}
        >
          <button className="toolbar-btn" style={{color: '#ef4444'}} onClick={(e) => { 
            e.preventDefault(); 
            onRemoveHighlight(activeHighlightId.id);
            setActiveHighlightId(null);
          }}>
            <Eraser size={16} /> Remove Highlight
          </button>
        </div>
      )}

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNoteModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">New Sticky Note</h3>
            <textarea 
              className="modal-textarea"
              placeholder="Type your revision note here..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsNoteModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveNote}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
