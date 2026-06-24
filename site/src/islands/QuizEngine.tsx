/** @jsxImportSource preact */
import { useEffect, useRef, useState } from "preact/hooks";
import { store } from "../lib/store";

// Enhances the Apply beat's CSS-only floor (the [data-aq] form keeps working with
// no JS). On the reader's first choice it records first-try correctness for the
// readiness meter, announces an elaborated verdict through an aria-live region
// (the CSS reveal alone is silent to a screen reader), and opens the answer key.
// Correctness is never color-only: a glyph and a bold label carry it too. The
// `mode` only reframes the verdict copy; the mechanic is identical.
interface Option {
  id: string;
  label: string;
  feedback?: string;
}
interface Props {
  targetId: string;
  correct: string;
  options: Option[];
  mode?: "outcome" | "assertion-reason" | "confidence" | "misconception";
}

const FRAME: Record<string, { right: string; wrong: string }> = {
  outcome: { right: "Correct.", wrong: "Not quite." },
  "assertion-reason": {
    right: "The reason holds.",
    wrong: "The reason does not hold.",
  },
  confidence: {
    right: "Correct, and worth being sure of.",
    wrong: "Confidently wrong is the expensive kind.",
  },
  misconception: {
    right: "Correct, and you stepped around the trap.",
    wrong: "That is the common trap.",
  },
};

export default function QuizEngine({
  targetId,
  correct,
  options,
  mode = "outcome",
}: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const recorded = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frame = FRAME[mode] ?? FRAME.outcome;

  useEffect(() => {
    rootRef.current?.setAttribute("data-ready", "");
    const form = document.querySelector<HTMLFormElement>(
      `form[data-aq="${targetId}"]`,
    );
    if (!form) return;
    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t?.type !== "radio") return;
      setChosen(t.value);
      if (!recorded.current) {
        recorded.current = true;
        store.recordQuiz(targetId, t.value === correct);
      }
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [targetId, correct]);

  const isCorrect = chosen === correct;
  const chosenOpt = options.find((o) => o.id === chosen);
  const correctOpt = options.find((o) => o.id === correct);

  return (
    <div class="qe" data-qe={targetId} ref={rootRef}>
      <div class="qe-live" role="status" aria-live="polite">
        {chosen && (
          <p class={`qe-verdict ${isCorrect ? "is-correct" : "is-wrong"}`}>
            <span class="qe-mark mono" aria-hidden="true">
              {isCorrect ? "✓" : "✕"}
            </span>
            <span class="qe-verdict-text">
              <strong>{isCorrect ? frame.right : frame.wrong}</strong>{" "}
              {chosenOpt?.feedback ?? (isCorrect ? correctOpt?.feedback : "")}
            </span>
          </p>
        )}
      </div>
      {chosen && (
        <details class="qe-key">
          <summary>Answer key</summary>
          <p>
            The answer is <strong>{correctOpt?.label}</strong>.{" "}
            {correctOpt?.feedback}
          </p>
        </details>
      )}
    </div>
  );
}
