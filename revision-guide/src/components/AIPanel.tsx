import { useState } from 'react';
import { X, Loader2, Sparkles, FileText, Layers, MessageSquareText, AlertTriangle } from 'lucide-react';

interface AIPanelProps {
  open: boolean;
  apiUrl: string;
  doc: any;
  onClose: () => void;
}

type Tab = 'ask' | 'summarize' | 'cards';

export default function AIPanel({ open, apiUrl, doc, onClose }: AIPanelProps) {
  const [tab, setTab] = useState<Tab>('summarize');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notConfigured, setNotConfigured] = useState(false);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const [summary, setSummary] = useState<{ summary: string; keyPoints: string[]; headings: string[] } | null>(null);
  const [cards, setCards] = useState<{ front: string; back: string }[]>([]);
  const [flipped, setFlipped] = useState<number | null>(null);

  if (!open) return null;

  const content = doc?.content || '';
  const title = doc?.title?.replace(/\.[^/.]+$/, '') || 'Untitled';

  const run = async (path: string, body: any) => {
    setLoading(true);
    setError('');
    setNotConfigured(false);
    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.aiConfigured === false) setNotConfigured(true);
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const doSummarize = async () => {
    try {
      const data = await run('/ai/summarize', { title, content });
      setSummary({ summary: data.summary || '', keyPoints: data.keyPoints || [], headings: data.headings || [] });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doCards = async () => {
    try {
      const data = await run('/ai/quiz', { content });
      setCards(data.cards || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doAsk = async () => {
    if (!question.trim()) return;
    try {
      const data = await run('/ai/ask', { question, content });
      setAnswer(data.answer || '');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const configNotice = notConfigured && (
    <div className="ai-notice">
      <AlertTriangle size={16} />
      <span>AI isn't configured on the backend yet. Add <code>OPENAI_API_KEY</code> to <code>revision-guide/.env.local</code> and redeploy the server.</span>
    </div>
  );
return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-panel" onClick={e => e.stopPropagation()}>
        <div className="onboarding-head">
          <h3 className="modal-title">
            <Sparkles size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            AI Study Tools — {title}
          </h3>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="tabs ai-tabs">
          <button className={`tab ${tab === 'summarize' ? 'active' : ''}`} onClick={() => { setTab('summarize'); setError(''); }}>
            <FileText size={16} /> Summarize
          </button>
          <button className={`tab ${tab === 'cards' ? 'active' : ''}`} onClick={() => { setTab('cards'); setError(''); }}>
            <Layers size={16} /> Flashcards
          </button>
          <button className={`tab ${tab === 'ask' ? 'active' : ''}`} onClick={() => { setTab('ask'); setError(''); }}>
            <MessageSquareText size={16} /> Ask
          </button>
        </div>

        {configNotice}

        <div className="ai-body">
          {tab === 'summarize' && (
            <div>
              {!summary && (
                <button className="btn btn-primary" onClick={doSummarize} disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Generate summary
                </button>
              )}
              {summary && (
                <div className="ai-result">
                  <p className="ai-summary">{summary.summary}</p>
                  {summary.keyPoints.length > 0 && (
                    <>
                      <h4 className="ai-subtitle">Key points</h4>
                      <ul className="ai-list">
                        {summary.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
                      </ul>
                    </>
                  )}
                  {summary.headings.length > 0 && (
                    <>
                      <h4 className="ai-subtitle">Headings</h4>
                      <div className="ai-chips">
                        {summary.headings.map((h, i) => <span key={i} className="ai-chip">{h}</span>)}
                      </div>
                    </>
                  )}
                  <button className="btn btn-secondary" onClick={() => setSummary(null)}>Regenerate</button>
                </div>
              )}
            </div>
          )}

          {tab === 'cards' && (
            <div>
              {cards.length === 0 && (
                <button className="btn btn-primary" onClick={doCards} disabled={loading}>
                  {loading ? <Loader2 size={16} className="spin" /> : <Layers size={16} />} Generate flashcards
                </button>
              )}
              {cards.length > 0 && (
                <div className="flashcards">
                  {cards.map((c, i) => (
                    <div
                      key={i}
                      className={`flashcard ${flipped === i ? 'flipped' : ''}`}
                      onClick={() => setFlipped(flipped === i ? null : i)}
                    >
                      <div className="flashcard-inner">
                        <div className="flashcard-face flashcard-front">{c.front}</div>
                        <div className="flashcard-face flashcard-back">{c.back}</div>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-secondary" onClick={() => setCards([])}>Regenerate</button>
                </div>
              )}
            </div>
          )}

          {tab === 'ask' && (
            <div>
              <textarea
                className="modal-textarea"
                placeholder="Ask anything about this document… e.g. What is the main difference between X and Y?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />
              <button className="btn btn-primary" onClick={doAsk} disabled={loading || !question.trim()}>
                {loading ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Ask
              </button>
              {answer && (
                <div className="ai-result">
                  <p className="ai-answer">{answer}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {error && !notConfigured && <p className="ai-error">⚠ {error}</p>}
      </div>
    </div>
  );
}
