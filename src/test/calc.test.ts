import { describe, expect, it } from "vitest";
import { applyKey, evaluate, evaluateLoose, formatResult, toggleSign } from "@/lib/calc";

const calc = (s: string) => formatResult(evaluate(s));

describe("calculation engine", () => {
  it("basic operations", () => {
    expect(calc("2+3")).toBe("5");
    expect(calc("9−4")).toBe("5");
    expect(calc("6×7")).toBe("42");
    expect(calc("8÷2")).toBe("4");
  });
  it("operator precedence", () => {
    expect(calc("2+3×4")).toBe("14");
    expect(calc("10−6÷2")).toBe("7");
    expect(calc("2×3+4×5")).toBe("26");
    expect(calc("8÷4÷2")).toBe("1");
    expect(calc("10−3−2")).toBe("5");
  });
  it("parentheses", () => {
    expect(calc("(2+3)×4")).toBe("20");
    expect(calc("2(3+1)")).toBe("8");
    expect(calc("((1+2)×(3+4))")).toBe("21");
    expect(formatResult(evaluateLoose("(2+3"))).toBe("5");
  });
  it("decimals avoid float noise", () => {
    expect(calc("0.1+0.2")).toBe("0.3");
    expect(calc("1.5×2")).toBe("3");
  });
  it("percent", () => {
    expect(calc("50%")).toBe("0.5");
    expect(calc("200×10%")).toBe("20");
  });
  it("negatives", () => {
    expect(calc("−5+2")).toBe("-3");
    expect(calc("3×−2")).toBe("-6");
    expect(calc("−(2+3)")).toBe("-5");
  });
  it("divide by zero errors", () => {
    expect(() => evaluate("5÷0")).toThrow("Cannot divide by zero");
    expect(() => evaluate("1÷(2−2)")).toThrow("Cannot divide by zero");
  });
  it("syntax errors", () => {
    expect(() => evaluate("2+")).toThrow();
    expect(() => evaluate("×2")).toThrow();
    expect(() => evaluate("1.2.3")).toThrow();
    expect(() => evaluate("(2+3")).toThrow();
  });
});

describe("key input", () => {
  const type = (keys: string[]) => keys.reduce(applyKey, "");
  it("replaces repeated operators", () => {
    expect(type(["5", "+", "×", "2"])).toBe("5×2");
  });
  it("blocks second decimal point", () => {
    expect(type(["1", ".", "2", ".", "3"])).toBe("1.23");
  });
  it("leading decimal becomes 0.", () => {
    expect(type(["."])).toBe("0.");
  });
  it("no leading zeros", () => {
    expect(type(["0", "0", "7"])).toBe("7");
  });
  it("sign toggle", () => {
    expect(toggleSign("5")).toBe("−5");
    expect(toggleSign("−5")).toBe("5");
    expect(toggleSign("3+5")).toBe("3+(−5");
    expect(toggleSign("3+(−5")).toBe("3+5");
  });
});

describe("robustness", () => {
  it("mixed precedence with brackets and decimals", () => {
    expect(calc("2+3×(4−1)÷2")).toBe("6.5");
    expect(calc("(1.5+2.5)×(10%)")).toBe("0.4");
  });
  it("double negative", () => {
    expect(calc("5−−3")).toBe("8");
  });
  it("very large and tiny numbers use exponent form", () => {
    expect(calc("12345678×100000000")).toBe("1.2345678e+15");
    expect(calc("1÷1000000000000")).toBe("1e-12");
    expect(calc("1÷3")).toBe("0.333333333333");
  });
  it("rejects empty and unknown input", () => {
    expect(() => evaluate("")).toThrow();
    expect(() => evaluate("2^3")).toThrow();
  });
});