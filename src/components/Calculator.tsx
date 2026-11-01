import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, Moon, Sun, Copy, Check, Delete, Trash2, X } from "lucide-react";
import { CalcError, applyKey, backspace, evaluateLoose, formatResult } from "@/lib/calc";
import { cn } from "@/lib/utils";

type Entry = { id: number; expr: string; result: string };
const HISTORY_KEY = "easycalc.history";
const THEME_KEY = "easycalc.theme";

type KeyDef = { label: string; key: string; kind: "num" | "op" | "fn" | "eq"; aria: string };
const KEYS: KeyDef[] = [
  { label: "AC", key: "C", kind: "fn", aria: "Clear" },
  { label: "( )", key: "()", kind: "fn", aria: "Parentheses" },
  { label: "%", key: "%", kind: "fn", aria: "Percent" },
  { label: "÷", key: "÷", kind: "op", aria: "Divide" },
  { label: "7", key: "7", kind: "num", aria: "7" },
  { label: "8", key: "8", kind: "num", aria: "8" },
  { label: "9", key: "9", kind: "num", aria: "9" },
  { label: "×", key: "×", kind: "op", aria: "Multiply" },
  { label: "4", key: "4", kind: "num", aria: "4" },
  { label: "5", key: "5", kind: "num", aria: "5" },
  { label: "6", key: "6", kind: "num", aria: "6" },
  { label: "−", key: "−", kind: "op", aria: "Subtract" },
  { label: "1", key: "1", kind: "num", aria: "1" },
  { label: "2", key: "2", kind: "num", aria: "2" },
  { label: "3", key: "3", kind: "num", aria: "3" },
  { label: "+", key: "+", kind: "op", aria: "Add" },
  { label: "±", key: "±", kind: "num", aria: "Toggle sign" },
  { label: "0", key: "0", kind: "num", aria: "0" },
  { label: ".", key: ".", kind: "num", aria: "Decimal point" },
  { label: "=", key: "=", kind: "eq", aria: "Equals" },
];

const kindClass: Record<KeyDef["kind"], string> = {
  num: "bg-key text-key-foreground",
  op: "bg-key-op text-key-op-foreground text-3xl",
  fn: "bg-key-fn text-key-fn-foreground",
  eq: "bg-sunny text-sunny-foreground text-3xl",
};

export function Calculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dark, setDark] = useState(false);
  const [copied, setCopied] = useState(false);
  const exprRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
      const t = localStorage.getItem(THEME_KEY);
      setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  const saveHistory = (h: Entry[]) => {
    setHistory(h);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    } catch {
      /* ignore */
    }
  };

  const preview = useMemo(() => {
    if (!expr || /^[−(]*$/.test(expr)) return null;
    try {
      const v = formatResult(evaluateLoose(expr));
      return v === expr ? null : v;
    } catch {
      return null;
    }
  }, [expr]);

  useEffect(() => {
    exprRef.current?.scrollTo({ left: exprRef.current.scrollWidth });
  }, [expr]);

  const press = useCallback(
    (key: string) => {
      setCopied(false);
      if (key === "C") {
        setExpr("");
        setResult(null);
        setError(null);
        return;
      }
      if (key === "⌫") {
        setError(null);
        setResult(null);
        setExpr((e) => backspace(e));
        return;
      }
      if (key === "=") {
        if (!expr) return;
        try {
          const r = formatResult(evaluateLoose(expr));
          const open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
          const full = expr + ")".repeat(Math.max(0, open));
          saveHistory([{ id: Date.now(), expr: full, result: r }, ...history].slice(0, 50));
          setResult(r);
          setError(null);
          setExpr(r.replace(/^-/, "−"));
        } catch (e) {
          setError(e instanceof CalcError ? e.message : "Error");
        }
        return;
      }
      setError(null);
      setExpr((e) => {
        // typing a digit right after "=" starts fresh
        if (result !== null && /^[0-9.]$/.test(key)) return applyKey("", key);
        return applyKey(e, key);
      });
      setResult(null);
    },
    [expr, history, result],
  );

  useEffect(() => {
    const map: Record<string, string> = {
      "*": "×", "/": "÷", "-": "−", "+": "+", Enter: "=", "=": "=",
      Backspace: "⌫", Escape: "C", Delete: "C", "%": "%", "(": "(", ")": ")", ".": ".", ",": ".",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
      if (k) {
        e.preventDefault();
        press(k);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const copy = async () => {
    const text = result ?? preview ?? expr.replace(/−/g, "-");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const iconBtn =
    "grid h-11 w-11 place-items-center rounded-full bg-card text-foreground shadow-soft transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="bg-app flex min-h-[100dvh] justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <main className="flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Easy<span className="text-primary">Calc</span> <span className="rounded-full bg-sunny px-2 py-0.5 align-middle text-sm text-sunny-foreground">Plus</span>
          </h1>
          <div className="flex gap-2">
            <button className={iconBtn} onClick={() => setShowHistory(true)} aria-label="Show history">
              <History className="h-5 w-5" />
            </button>
            <button className={iconBtn} onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <section
          className="flex flex-1 flex-col justify-end rounded-3xl bg-card p-5 shadow-soft min-h-[11rem]"
          aria-label="Display"
        >
          <div
            ref={exprRef}
            className="overflow-x-auto whitespace-nowrap text-right font-display text-4xl font-medium leading-tight sm:text-5xl [scrollbar-width:none]"
            aria-label="Expression"
            data-testid="expression"
          >
            {expr || <span className="text-muted-foreground">0</span>}
          </div>
          <div className="mt-2 flex min-h-9 items-center justify-between gap-3">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground transition active:scale-95"
              aria-label="Copy result"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <div
              role="status"
              aria-live="polite"
              data-testid="result"
              className={cn(
                "truncate text-right text-2xl font-semibold",
                error ? "text-destructive text-lg" : "text-muted-foreground",
              )}
            >
              {error ?? (preview ? `= ${preview}` : "")}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-4 gap-3" aria-label="Keypad">
          <div className="col-span-3" />
          <button
            onClick={() => press("⌫")}
            aria-label="Backspace"
            className="grid h-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground transition active:scale-95"
          >
            <Delete className="h-6 w-6" />
          </button>
          {KEYS.map((k) => (
            <button
              key={k.key}
              onClick={() => press(k.key)}
              aria-label={k.aria}
              className={cn(
                "aspect-square min-h-16 rounded-3xl font-display text-2xl font-semibold shadow-key transition select-none active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                kindClass[k.kind],
              )}
            >
              {k.label}
            </button>
          ))}
        </section>
      </main>

      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center"
          onClick={() => setShowHistory(false)}
        >
          <div
            role="dialog"
            aria-label="History"
            className="flex max-h-[75dvh] w-full max-w-md flex-col rounded-t-3xl bg-card p-5 shadow-soft animate-in slide-in-from-bottom sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">History</h2>
              <div className="flex gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => saveHistory([])}
                    className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground"
                  >
                    <Trash2 className="h-4 w-4" /> Clear
                  </button>
                )}
                <button onClick={() => setShowHistory(false)} aria-label="Close history" className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">No calculations yet.</p>
            ) : (
              <ul className="-mx-2 overflow-y-auto">
                {history.map((h) => (
                  <li key={h.id}>
                    <button
                      onClick={() => {
                        setExpr(h.result.replace(/^-/, "−"));
                        setResult(h.result);
                        setError(null);
                        setShowHistory(false);
                      }}
                      className="w-full rounded-2xl px-3 py-3 text-right transition hover:bg-muted"
                    >
                      <div className="truncate text-sm text-muted-foreground">{h.expr}</div>
                      <div className="truncate font-display text-2xl font-semibold">= {h.result}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}