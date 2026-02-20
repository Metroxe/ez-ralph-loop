/**
 * ANSI SGR → OpenTUI JSX converter.
 *
 * Parses chalk's SGR codes (\x1b[...m) into OpenTUI text modifier
 * elements (<span>, <b>, etc.) that the React reconciler understands.
 */

import { TextAttributes } from "@opentui/core";

// ─── SGR Parser ─────────────────────────────────────────────────────

interface Style {
  fg?: string;
  bg?: string;
  attrs: number; // TextAttributes bitfield
}

/** Basic 8-color palette (SGR 30-37 / 40-47). */
const BASIC_COLORS = [
  "#000000", "#CC0000", "#00CC00", "#CCCC00",
  "#0000CC", "#CC00CC", "#00CCCC", "#CCCCCC",
];

/** Bright 8-color palette (SGR 90-97 / 100-107). */
const BRIGHT_COLORS = [
  "#555555", "#FF5555", "#55FF55", "#FFFF55",
  "#5555FF", "#FF55FF", "#55FFFF", "#FFFFFF",
];

interface Segment {
  text: string;
  style: Style;
}

/**
 * Parse a string containing ANSI SGR codes into styled segments.
 */
function parseAnsi(input: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\x1b\[([\d;]*)m/g;
  let style: Style = { attrs: 0 };
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    // Flush text before this escape
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), style: { ...style } });
    }
    lastIndex = re.lastIndex;

    // Parse the SGR parameters
    const params = (match[1] || "0").split(";").map(Number);
    let i = 0;
    while (i < params.length) {
      const p = params[i]!;
      if (p === 0) {
        // Reset
        style = { attrs: 0 };
      } else if (p === 1) {
        style.attrs |= TextAttributes.BOLD;
      } else if (p === 2) {
        style.attrs |= TextAttributes.DIM;
      } else if (p === 3) {
        style.attrs |= TextAttributes.ITALIC;
      } else if (p === 4) {
        style.attrs |= TextAttributes.UNDERLINE;
      } else if (p === 7) {
        style.attrs |= TextAttributes.INVERSE;
      } else if (p === 9) {
        style.attrs |= TextAttributes.STRIKETHROUGH;
      } else if (p === 22) {
        // Normal intensity (reset bold + dim)
        style.attrs &= ~(TextAttributes.BOLD | TextAttributes.DIM);
      } else if (p === 23) {
        style.attrs &= ~TextAttributes.ITALIC;
      } else if (p === 24) {
        style.attrs &= ~TextAttributes.UNDERLINE;
      } else if (p === 27) {
        style.attrs &= ~TextAttributes.INVERSE;
      } else if (p === 29) {
        style.attrs &= ~TextAttributes.STRIKETHROUGH;
      } else if (p >= 30 && p <= 37) {
        style.fg = BASIC_COLORS[p - 30];
      } else if (p === 38) {
        // Extended foreground
        const next = params[i + 1];
        if (next === 5 && i + 2 < params.length) {
          style.fg = color256(params[i + 2]!);
          i += 2;
        } else if (next === 2 && i + 4 < params.length) {
          style.fg = `#${hex(params[i + 2]!)}${hex(params[i + 3]!)}${hex(params[i + 4]!)}`;
          i += 4;
        }
      } else if (p === 39) {
        style.fg = undefined;
      } else if (p >= 40 && p <= 47) {
        style.bg = BASIC_COLORS[p - 40];
      } else if (p === 48) {
        // Extended background
        const next = params[i + 1];
        if (next === 5 && i + 2 < params.length) {
          style.bg = color256(params[i + 2]!);
          i += 2;
        } else if (next === 2 && i + 4 < params.length) {
          style.bg = `#${hex(params[i + 2]!)}${hex(params[i + 3]!)}${hex(params[i + 4]!)}`;
          i += 4;
        }
      } else if (p === 49) {
        style.bg = undefined;
      } else if (p >= 90 && p <= 97) {
        style.fg = BRIGHT_COLORS[p - 90];
      } else if (p >= 100 && p <= 107) {
        style.bg = BRIGHT_COLORS[p - 100];
      }
      i++;
    }
  }

  // Flush remaining text
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), style: { ...style } });
  }

  return segments;
}

function hex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

/** Convert a 256-color index to a hex string. */
function color256(n: number): string {
  if (n < 8) return BASIC_COLORS[n]!;
  if (n < 16) return BRIGHT_COLORS[n - 8]!;
  if (n < 232) {
    // 6×6×6 color cube
    const idx = n - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const toHex = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `#${hex(toHex(r))}${hex(toHex(g))}${hex(toHex(b))}`;
  }
  // Grayscale ramp (232-255)
  const v = 8 + (n - 232) * 10;
  return `#${hex(v)}${hex(v)}${hex(v)}`;
}

// ─── React Component ────────────────────────────────────────────────

/**
 * Convert ANSI-styled text to OpenTUI JSX elements.
 * Must be used as a child of <text>.
 */
export function AnsiText({ text }: { text: string }) {
  // Fast path: no escape codes
  if (!text.includes("\x1b[")) {
    return <>{text}</>;
  }

  const segments = parseAnsi(text);

  return (
    <>
      {segments.map((seg, i) => {
        const { style } = seg;
        const hasStyle = style.fg || style.bg || style.attrs !== 0;

        if (!hasStyle) {
          return <span key={i}>{seg.text}</span>;
        }

        return (
          <span
            key={i}
            fg={style.fg}
            bg={style.bg}
            attributes={style.attrs || undefined}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );
}
