/** @jsxImportSource preact */
import { useMemo, useRef, useState } from "preact/hooks";
import type { Bin, BinId, SortItem } from "../lib/sorter";

// The third genuinely stateful teaching island. It holds the real app state of
// the exercise: where each item is placed, which item is selected, and whether
// the reader has checked. Select-then-place is the primary path — a tray of
// item buttons with roving focus; Enter selects, then activating a bin places
// the selected item. Drag is an additive listener on the same place(). On mount
// it hides the SSR matching-form floor (which carries the lesson JS-off); when
// it never mounts, that floor is all the reader needs.
interface Props {
  items: SortItem[];
  bins: Bin[];
}

export default function ScenarioSorter({ items, bins }: Props) {
  const [placed, setPlaced] = useState<Record<string, BinId | null>>(() =>
    Object.fromEntries(items.map((i) => [i.id, null])),
  );
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null);
  const [checked, setChecked] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  // Mark the wrapper enhanced (the JS-off floor lives in <noscript>, so it is
  // already absent here) and flag readiness for tests once mounted.
  function onRoot(el: HTMLDivElement | null) {
    rootRef.current = el;
    if (el) {
      el.closest(".sorter")?.classList.add("is-enhanced");
      el.setAttribute("data-ready", "");
    }
  }

  function announce(msg: string) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  function place(itemId: string, bin: BinId) {
    setPlaced((p) => ({ ...p, [itemId]: bin }));
    setChecked(false);
    const it = items.find((i) => i.id === itemId);
    const b = bins.find((x) => x.id === bin);
    announce(`${it?.label ?? itemId} placed in ${b?.label ?? bin}.`);
  }

  // The unplaced tray and each bin's contents derive from one placement map.
  const tray = items.filter((i) => placed[i.id] == null);
  const inBin = (bin: BinId) => items.filter((i) => placed[i.id] === bin);

  const allPlaced = tray.length === 0;
  const correctCount = useMemo(
    () => items.filter((i) => placed[i.id] === i.bin).length,
    [placed, items],
  );

  function selectItem(id: string) {
    setSelected(id);
    const it = items.find((i) => i.id === id);
    announce(`${it?.label ?? id} selected. Choose a bin to place it.`);
  }

  // Roving focus across the tray: arrows move, Enter/Space selects.
  function onTrayKey(e: KeyboardEvent, idx: number) {
    const ids = tray.map((t) => t.id);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = ids[(idx + 1) % ids.length];
      if (next) {
        setSelected(next);
        focusItem(next);
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = ids[(idx - 1 + ids.length) % ids.length];
      if (prev) {
        setSelected(prev);
        focusItem(prev);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectItem(tray[idx]!.id);
    }
  }

  function focusItem(id: string) {
    requestAnimationFrame(() => {
      rootRef.current
        ?.querySelector<HTMLButtonElement>(`[data-item="${id}"]`)
        ?.focus();
    });
  }

  function onBinActivate(bin: BinId) {
    if (selected && placed[selected] == null) {
      place(selected, bin);
      // Advance selection to the next unplaced item for fluent placing.
      const rest = items.filter(
        (i) => placed[i.id] == null && i.id !== selected,
      );
      setSelected(rest[0]?.id ?? null);
    } else {
      announce("Select an item from the tray first.");
    }
  }

  return (
    <div class="sorter-live" ref={onRoot}>
      <p class="sorter-help">
        Select a request, then choose a bin. You can also drag.
      </p>

      <div class="sorter-board">
        <div class="sorter-tray" role="group" aria-label="Requests to sort">
          {tray.length === 0 && (
            <p class="sorter-empty">Every request placed.</p>
          )}
          {tray.map((it, idx) => (
            <button
              type="button"
              key={it.id}
              data-item={it.id}
              class={`sorter-chip ${selected === it.id ? "is-selected" : ""}`}
              aria-pressed={selected === it.id}
              tabIndex={
                selected === it.id || (selected == null && idx === 0) ? 0 : -1
              }
              draggable
              onClick={() => selectItem(it.id)}
              onKeyDown={(e) => onTrayKey(e, idx)}
              onDragStart={(e) => e.dataTransfer?.setData("text/plain", it.id)}
            >
              {it.label}
            </button>
          ))}
        </div>

        <div class="sorter-bins">
          {bins.map((bin) => (
            <div
              key={bin.id}
              class="sorter-bin"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer?.getData("text/plain");
                if (id) place(id, bin.id);
              }}
            >
              <button
                type="button"
                class="sorter-bin-head"
                onClick={() => onBinActivate(bin.id)}
                aria-label={`Place selected request in ${bin.label}`}
              >
                <span class="sorter-bin-name">{bin.label}</span>
                <span class="sorter-bin-hint">{bin.hint}</span>
              </button>
              <ul class="sorter-bin-items">
                {inBin(bin.id).map((it) => {
                  const right = it.bin === bin.id;
                  return (
                    <li
                      key={it.id}
                      class={`sorter-placed ${
                        checked ? (right ? "is-right" : "is-wrong") : ""
                      }`}
                    >
                      <span class="sorter-placed-label">
                        {checked && (
                          <span class="sorter-verdict mono" aria-hidden="true">
                            {right ? "✓" : "✕"}
                          </span>
                        )}
                        {it.label}
                      </span>
                      <button
                        type="button"
                        class="sorter-return"
                        aria-label={`Return ${it.label} to the tray`}
                        onClick={() => {
                          setPlaced((p) => ({ ...p, [it.id]: null }));
                          setChecked(false);
                        }}
                      >
                        return
                      </button>
                      {checked && (
                        <span class="sorter-feedback">{it.feedback}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div class="sorter-foot">
        <button
          type="button"
          class="sorter-check"
          disabled={!allPlaced}
          onClick={() => {
            setChecked(true);
            announce(
              `${correctCount} of ${items.length} placed correctly. Each placement now shows why.`,
            );
          }}
        >
          Check placements
        </button>
        {/* MasteryMeter: honest count, shown only once checked. */}
        <div
          class="mastery-meter"
          role="group"
          aria-label="Sorting mastery"
          data-checked={checked ? "true" : "false"}
        >
          <span class="mastery-track" aria-hidden="true">
            <span
              class="mastery-fill"
              style={{
                width: `${checked ? (correctCount / items.length) * 100 : 0}%`,
              }}
            />
          </span>
          <span class="mastery-label mono">
            {checked
              ? `${correctCount} / ${items.length} correct`
              : "not checked"}
          </span>
        </div>
      </div>

      <p ref={liveRef} class="sorter-sr" role="status" aria-live="polite" />
    </div>
  );
}
