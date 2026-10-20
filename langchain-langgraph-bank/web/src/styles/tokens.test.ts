import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * WCAG 2.2 contrast checks on the design tokens (jsdom can't compute real styles, so the
 * axe color-contrast rule is disabled in component tests; this covers it at the source).
 */
const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf-8");

function themeTokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5; // normal text
const UI = 3; // large text, icons, focus rings, component boundaries

/** [foreground, background, minimum ratio] pairs actually used in app.css. */
const PAIRS: [string, string, number][] = [
  ["text", "bg", TEXT],
  ["text", "surface", TEXT],
  ["text", "surface-2", TEXT],
  ["text", "surface-3", TEXT],
  ["text-muted", "bg", TEXT],
  ["text-muted", "surface", TEXT],
  ["text-muted", "surface-2", TEXT],
  ["primary", "surface", TEXT], // links, eyebrow
  ["primary", "bg", TEXT],
  ["on-primary", "primary", TEXT], // primary buttons, current nav cell
  ["primary-soft-text", "primary-soft", TEXT], // chips, theory buttons, answered cells
  ["success", "success-soft", TEXT],
  ["success", "surface", TEXT],
  ["danger", "danger-soft", TEXT],
  ["danger", "surface", TEXT],
  ["warning", "warning-soft", TEXT],
  ["flag", "warning-soft", TEXT],
  ["primary", "surface", UI], // focus ring
  ["border-strong", "surface", UI - 1.5], // decorative borders; controls also have labels/fill
];

describe.each([
  ["light", ":root,"],
  ["dark", '[data-theme="dark"]'],
])("%s theme tokens", (_name, selector) => {
  const t = themeTokens(selector);

  it.each(PAIRS)("%s on %s meets %d:1", (fg, bg, min) => {
    expect(t[fg], `missing --${fg}`).toBeDefined();
    expect(t[bg], `missing --${bg}`).toBeDefined();
    const ratio = contrast(t[fg] as string, t[bg] as string);
    expect(ratio, `--${fg} ${t[fg]} on --${bg} ${t[bg]} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });
});

it("danger button text (fixed colors) meets 4.5:1", () => {
  expect(contrast("#ffffff", "#b42318")).toBeGreaterThanOrEqual(TEXT);
});
