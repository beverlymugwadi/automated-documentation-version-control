import { useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../store/toastStore';

export function FeedbackWidget({ docId }: { docId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [done, setDone] = useState(false);

  async function submit(value: number) {
    setRating(value);
    try {
      await api.post('/feedback', { docId, rating: value });
      setDone(true);
      toast.success('Thanks for the feedback');
    } catch {
      toast.error('Could not submit feedback');
    }
  }

  if (done) {
    return <p className="faint" style={{ fontSize: 'var(--text-sm)' }}>Thanks — your rating helps us measure usefulness.</p>;
  }

  return (
    <div className="row" style={{ gap: 'var(--sp-3)' }}>
      <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>How useful is this document?</span>
      <div className="row" style={{ gap: 2 }} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            className="iconbtn"
            style={{ width: 28, height: 28 }}
            aria-label={`Rate ${v} out of 5`}
            onMouseEnter={() => setHover(v)}
            onClick={() => submit(v)}
          >
            <Star size={16} fill={(hover || rating) >= v ? 'var(--amber)' : 'none'} color={(hover || rating) >= v ? 'var(--amber)' : 'var(--muted)'} />
          </button>
        ))}
      </div>
    </div>
  );
}