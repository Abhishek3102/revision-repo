import { useState, useEffect, useRef } from 'react';
import type { Highlight, Note } from '../App';
import { MessageSquarePlus, Eraser, Eye, Search, X, ChevronUp, ChevronDown, Sparkles, Wand2 } from 'lucide-react';

interface DocumentViewerProps {
  doc: { id: string; title: string; content: string };
  notes: Note[];
  highlights: Highlight[];
  onAddHighlight: (text: string, start: number, end: number, color?: string) => void;
  onRemoveHighlight: (id: string) => void;
  onAddNote: (text: string, quote?: string) => void;
  onOpenNotes: () => void;
  onOpenAI: () => void;
  onExplainSelection: (text: string) => void;
}

export default function DocumentViewer({ doc, notes, highlights, onAddHighlight, onRemoveHighlight, onAddNote, onOpenNotes, onOpenAI, onExplainSelection }: DocumentViewerProps) {
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [activeHighlightId, setActiveHighlightId] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [pendingNoteQuote, setPendingNoteQuote] = useState("");
  const [progress, setProgress] = useState(0);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findIdx, setFindIdx] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const words = (doc.content || '').split(/\s+/).filter(Boolean).length;
  const readMins = Math.max(1, Math.round(words / 200));

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const el = contentRef.current;
      if (!el) return;
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), total);
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, true);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [doc]);

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

  // Find (Ctrl+F) helpers
  const computeMatches = (content: string, q: string) => {
    const lower = q.trim().toLowerCase();
    if (!lower) return 0;
    const hay = content.toLowerCase();
    let count = 0, i = 0;
    while ((i = hay.indexOf(lower, i)) !== -1) { count++; i += lower.length; }
    return count;
  };
  const findTotal = computeMatches(doc.content, findQuery);

  const goFind = (delta: number) => {
    if (findTotal === 0) return;
    setFindIdx(i => ((i + delta) % findTotal + findTotal) % findTotal);
  };

  // Keyboard shortcuts for search / navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(true);
        setTimeout(() => findInputRef.current?.select(), 0);
      }
      if (e.key === 'Enter' && findOpen) {
        e.preventDefault();
        goFind(e.shiftKey ? -1 : 1);
      }
      if (e.key === 'Escape' && findOpen) {
        setFindOpen(false);
        setFindQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [findOpen, findTotal]);

  // Scroll current find match into view
  useEffect(() => {
    const el = contentRef.current?.querySelector<HTMLElement>('.find-hit.current');
    el?.scrollIntoView({ block: 'center' });
  }, [findIdx]);

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
    let absCount = 0;
    const findLower = findQuery.trim().toLowerCase();
    const findEscaped = findLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    return paragraphs.map((para, idx) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;
      
      let processedHtml = trimmedPara;

      // Wrap find matches (before token substitution so they also cover highlighted text)
      if (findLower) {
        const findRegex = new RegExp(`(${findEscaped})`, 'gi');
        processedHtml = processedHtml.replace(findRegex, (m) => {
          const isCurrent = absCount === findIdx;
          const idxNow = absCount;
          absCount++;
          return `<mark class="find-hit${isCurrent ? ' current' : ''}" data-find-index="${idxNow}">${m}</mark>`;
        });
      }
      
      // Replace highlight tokens with actual HTML
      const tokenRegex = /%%HS_([a-zA-Z0-9]+)_([^_]+)_([^%]+)%%(.*?)%%HE%%/g;
      processedHtml = processedHtml.replace(tokenRegex, (_match, id, bgColor, borderColor, text) => {
        return `<span class="highlight-segment" data-id="${id}" style="background-color: ${bgColor}; border-bottom: 2px solid ${borderColor}; cursor: pointer; border-radius: 2px; padding: 0 2px;">${text}</span>`;
      });
      
      // Replace note tokens with actual HTML
      const noteTokenRegex = /%%NS_([a-zA-Z0-9]+)%%(.*?)%%NE%%/g;
      processedHtml = processedHtml.replace(noteTokenRegex, (_match, id, text) => {
        return `<span class="note-segment" data-note-id="${id}" style="border-bottom: 2px dashed var(--text-secondary); text-underline-offset: 4px; padding-bottom: 2px; cursor: pointer;">${text}</span>`;
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
      {/* Reading progress bar */}
      <div className="reading-progress" aria-hidden="true">
        <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ marginBottom: 0 }}>{doc.title.replace(/\.[^/.]+$/, "")}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => { setFindOpen(v => !v); setFindQuery(''); }} title="Find in page (Ctrl+F)">
            <Search size={18} /> Find
          </button>
          <button className="btn btn-secondary" onClick={onOpenAI} title="AI Study Tools">
            <Sparkles size={18} /> AI
          </button>
          <button className="btn btn-secondary" onClick={onOpenNotes}>
            <Eye size={18} /> Notes ({notes.length})
          </button>
          <button className="btn btn-primary" onClick={() => setIsNoteModalOpen(true)}>
            <MessageSquarePlus size={18} /> Add Note
          </button>
        </div>
      </div>

      {findOpen && (
        <div className="find-bar glass">
          <Search size={15} className="find-icon" />
          <input
            ref={findInputRef}
            className="find-input"
            placeholder="Find in this document…"
            value={findQuery}
            onChange={e => { setFindQuery(e.target.value); setFindIdx(0); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); goFind(e.shiftKey ? -1 : 1); }
            }}
          />
          <span className="find-count">{findQuery ? (findTotal ? `${findIdx + 1}/${findTotal}` : '0/0') : ''}</span>
          <button className="find-btn" onClick={() => goFind(-1)} title="Previous (Shift+Enter)"><ChevronUp size={16} /></button>
          <button className="find-btn" onClick={() => goFind(1)} title="Next (Enter)"><ChevronDown size={16} /></button>
          <button className="find-btn" onClick={() => { setFindOpen(false); setFindQuery(''); }} title="Close (Esc)"><X size={16} /></button>
        </div>
      )}
      <p className="reading-stats">
        {words.toLocaleString()} words · about {readMins} min read
      </p>

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
          <button className="toolbar-btn ai-toolbar-btn" onClick={(e) => { 
            e.preventDefault(); 
            onExplainSelection(selection.text);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}>
            <Wand2 size={16} /> Explain
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
