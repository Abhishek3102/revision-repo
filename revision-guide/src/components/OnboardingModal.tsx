import { useState } from 'react';
import { X, MousePointerClick, Search, Sparkles, Highlighter } from 'lucide-react';

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'Select text to do something',
    body: 'Select any passage to highlight it in a color, attach a sticky note, or ask AI to explain it.'
  },
  {
    icon: Highlighter,
    title: 'Highlight & annotate',
    body: 'Your highlights and notes open in the Dashboard (bottom-right on mobile). Click any entry to jump back to that spot in the document.'
  },
  {
    icon: Search,
    title: 'Search anywhere',
    body: 'Press Ctrl/Cmd + K for a full-text search across all documents, or Ctrl/Cmd + F to find within the current page.'
  },
  {
    icon: Sparkles,
    title: 'AI study tools',
    body: 'Turn on Summarize, Flashcards and Ask about this document from the buttons above the content. Note: AI needs OPENAI_API_KEY set on the backend.'
  }
];

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;
  const S = STEPS[step];

  return (
    <div className="modal-overlay">
      <div className="modal-content onboarding" onClick={e => e.stopPropagation()}>
        <div className="onboarding-head">
          <h3 className="modal-title">Welcome to Revision Hub 👋</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="onboarding-step">
          <S.icon size={40} className="onboarding-icon" />
          <h4>{S.title}</h4>
          <p>{S.body}</p>
        </div>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => { if (step === 0) onClose(); else setStep(step - 1); }}>
            {step === 0 ? 'Skip' : 'Back'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => (step === STEPS.length - 1 ? onClose() : setStep(step + 1))}
          >
            {step === STEPS.length - 1 ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}