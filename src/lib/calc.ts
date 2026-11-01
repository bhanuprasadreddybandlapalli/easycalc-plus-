// Pure expression engine for EasyCalc. Display symbols: + − × ÷ % ( )
export type Token =
  | { t: "num"; v: number }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "neg" }
  | { t: "pct" }
  | { t: "lp" }
  | { t: "rp" };

export class CalcError extends Error {}

const normalize = (s: string) =>
  s.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");

export function tokenize(input: string): Token[] {
  const s = normalize(input);
  const out: Token[] = [];
  let i = 0;
  const prevIsValue = () => {
    const p = out[out.length - 1];
    return !!p && (p.t === "num" || p.t === "rp" || p.t === "pct");
  };
  while (i < s.length) {
    const c = s.charAt(i);
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s.charAt(j))) j++;
      const raw = s.slice(i, j);
      if ((raw.match(/\./g) || []).length > 1 || raw === ".") throw new CalcError("Invalid number");
      if (prevIsValue()) out.push({ t: "op", v: "*" });
      out.push({ t: "num", v: parseFloat(raw) });
      i = j;
      continue;
    }
    if (c === "(") {
      if (prevIsValue()) out.push({ t: "op", v: "*" });
      out.push({ t: "lp" });
    } else if (c === ")") out.push({ t: "rp" });
    else if (c === "%") {
      if (!prevIsValue()) throw new CalcError("Invalid %");
      out.push({ t: "pct" });
    } else if ("+-*/".includes(c)) {
      if (!prevIsValue()) {
        if (c === "-") out.push({ t: "neg" });
        else if (c === "+") {
          /* unary plus: ignore */
        } else throw new CalcError("Syntax error");
      } else out.push({ t: "op", v: c as "+" | "-" | "*" | "/" });
    } else throw new CalcError("Invalid character");
    i++;
  }
  return out;
}

// Recursive-descent parser: expr = term (+|- term)*, term = unary (*|/ unary)*,
// unary = -unary | postfix, postfix = primary %*, primary = num | ( expr )
export function evaluate(input: string): number {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new CalcError("Empty");
  let pos = 0;
  const peek = () => tokens[pos];

  function expr(): number {
    let v = term();
    for (;;) {
      const p = peek();
      if (p?.t === "op" && (p.v === "+" || p.v === "-")) {
        pos++;
        const r = term();
        v = p.v === "+" ? v + r : v - r;
      } else return v;
    }
  }
  function term(): number {
    let v = unary();
    for (;;) {
      const p = peek();
      if (p?.t === "op" && (p.v === "*" || p.v === "/")) {
        pos++;
        const r = unary();
        if (p.v === "/") {
          if (r === 0) throw new CalcError("Cannot divide by zero");
          v = v / r;
        } else v = v * r;
      } else return v;
    }
  }
  function unary(): number {
    if (peek()?.t === "neg") {
      pos++;
      return -unary();
    }
    return postfix();
  }
  function postfix(): number {
    let v = primary();
    while (peek()?.t === "pct") {
      pos++;
      v = v / 100;
    }
    return v;
  }
  function primary(): number {
    const p = peek();
    if (!p) throw new CalcError("Incomplete expression");
    if (p.t === "num") {
      pos++;
      return p.v;
    }
    if (p.t === "lp") {
      pos++;
      const v = expr();
      if (peek()?.t !== "rp") throw new CalcError("Missing )");
      pos++;
      return v;
    }
    throw new CalcError("Syntax error");
  }

  const result = expr();
  if (pos !== tokens.length) throw new CalcError("Syntax error");
  if (!Number.isFinite(result)) throw new CalcError("Result too large");
  return result;
}

/** Evaluate, auto-closing any open parentheses (used for live preview and =). */
export function evaluateLoose(input: string): number {
  const open = (input.match(/\(/g) || []).length - (input.match(/\)/g) || []).length;
  return evaluate(input + ")".repeat(Math.max(0, open)));
}

export function formatResult(n: number): string {
  if (Object.is(n, -0)) n = 0;
  const rounded = parseFloat(n.toPrecision(12));
  if (Math.abs(rounded) >= 1e15 || (rounded !== 0 && Math.abs(rounded) < 1e-9))
    return rounded.toExponential(10).replace(/\.?0+e/, "e");
  return String(rounded);
}

const OPS = ["+", "−", "×", "÷"];

/** Apply a key to the current expression string. Returns new expression. */
export function applyKey(expr: string, key: string): string {
  const last = expr.slice(-1);
  if (/[0-9]/.test(key)) {
    if (last === ")" || last === "%") return expr + "×" + key;
    // avoid leading zeros like "007"
    const m = expr.match(/(\d*\.?\d*)$/);
    if (m && m[1] === "0") return expr.slice(0, -1) + key;
    return expr + key;
  }
  if (key === ".") {
    const m = expr.match(/(\d*\.?\d*)$/);
    if (m?.[1]?.includes(".")) return expr;
    if (!m || m[1] === "") return expr + (last === ")" || last === "%" ? "×0." : "0.");
    return expr + ".";
  }
  if (OPS.includes(key)) {
    if (expr === "") return key === "−" ? "−" : expr;
    if (last === "(") return key === "−" ? expr + "−" : expr;
    if (OPS.includes(last)) {
      // allow "×−" for negative operand, else replace operator
      if (key === "−" && (last === "×" || last === "÷")) return expr + key;
      let base = expr;
      while (OPS.includes(base.slice(-1))) base = base.slice(0, -1);
      if (base === "" || base.endsWith("(")) return key === "−" ? base + "−" : base;
      return base + key;
    }
    if (last === ".") return expr + "0" + key;
    return expr + key;
  }
  if (key === "%") {
    if (/[0-9)%]/.test(last)) return expr + "%";
    return expr;
  }
  if (key === "(") {
    if (/[0-9).%]/.test(last)) return expr + "×(";
    return expr + "(";
  }
  if (key === ")") {
    const open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
    if (open > 0 && /[0-9)%]/.test(last)) return expr + ")";
    return expr;
  }
  if (key === "()") {
    const open = (expr.match(/\(/g) || []).length - (expr.match(/\)/g) || []).length;
    if (open > 0 && /[0-9)%]/.test(last)) return expr + ")";
    return applyKey(expr, "(");
  }
  if (key === "±") return toggleSign(expr);
  return expr;
}

/** Toggle sign of the trailing number (or parenthesised group). */
export function toggleSign(expr: string): string {
  if (expr === "") return "−";
  const m = expr.match(/(\d*\.?\d+%*|\d+\.%*)$/);
  if (!m) {
    if (expr.endsWith("−") && (expr.length === 1 || /[(×÷+−]/.test(expr.slice(-2, -1))))
      return expr.slice(0, -1);
    return expr + "−";
  }
  const start = expr.length - m[0].length;
  const before = expr.slice(0, start);
  if (before.endsWith("(−")) return before.slice(0, -2) + m[0];
  if (before.endsWith("−") && (before.length === 1 || /[(×÷]/.test(before.slice(-2, -1))))
    return before.slice(0, -1) + m[0];
  if (before === "" || /[(×÷]$/.test(before)) return before + "−" + m[0];
  return before + "(−" + m[0];
}

export function backspace(expr: string): string {
  return expr.slice(0, -1);
}