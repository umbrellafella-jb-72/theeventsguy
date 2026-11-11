'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QUIZ } from '@/lib/award-quiz';

/** Five quick questions, one at a time. The answers go into the address, so results can be revisited. */
export function AwardsQuiz() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Record<string, string[]>>({});
  const q = QUIZ[step];
  const chosen = ans[q.key] ?? [];
  const toggle = (v: string) => setAns(a => {
    const cur = a[q.key] ?? [];
    if (!q.multi) return { ...a, [q.key]: [v] };
    return { ...a, [q.key]: cur.includes(v) ? cur.filter(x => x !== v) : cur.length >= 3 ? cur : [...cur, v] };
  });
  const next = () => {
    if (step < QUIZ.length - 1) { setStep(step + 1); return; }
    const p = new URLSearchParams();
    for (const x of QUIZ) p.set(x.key, (ans[x.key] ?? []).join(','));
    router.push(`/awards/finder?${p}#results`);
  };
  // Single-choice questions move on as soon as you pick.
  const pickOne = (v: string) => { toggle(v); if (!q.multi) setTimeout(() => (step < QUIZ.length - 1 ? setStep(s => s + 1) : null), 180); };

  return (
    <div className="quiz">
      <div className="quiz-progress" aria-hidden="true"><i style={{ width: `${((step + (chosen.length ? 1 : 0)) / QUIZ.length) * 100}%` }} /></div>
      <p className="quiz-step">Question {step + 1} of {QUIZ.length}</p>
      <fieldset>
        <legend><h2>{q.q}</h2>{'hint' in q && q.hint && <span className="muted">{q.hint}</span>}</legend>
        <div className="quiz-options">
          {q.options.map(o => (
            <button type="button" key={o.v} className="quiz-opt" aria-pressed={chosen.includes(o.v)} onClick={() => pickOne(o.v)}>
              <b>{o.label}</b>{'hint' in o && o.hint && <span>{o.hint}</span>}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="quiz-nav">
        {step > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>← Back</button>}
        {(q.multi || step === QUIZ.length - 1) && (
          <button type="button" className="btn btn-primary" disabled={!chosen.length} onClick={next}>{step === QUIZ.length - 1 ? 'Show my awards' : 'Next →'}</button>
        )}
      </div>
    </div>
  );
}
