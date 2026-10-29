// Framework-agnostic animation engine behind <v-rolling-number>. Reimplements the
// "rolling digits" mechanism: every glyph of a number is its own absolutely-positioned
// cell, diffed by place value (not by character identity) between old and new text, and
// moved/rotated into place with real spring physics sampled into WAAPI keyframes.
//
// The engine never reads glyph positions back out of the DOM for its own cells — each
// cell's current x/width is cached JS state carried across commits, so there is no need
// to snapshot "before" layout for the diff itself. The engine does not manage the host's
// own box width at all — see v-rolling-number.ts for why that's a caller concern, not an
// engine one.

export type RollingNumberMode = 'swap' | 'morph' | 'rolling';

interface GlyphFrame {
  readonly x: number;
  readonly width: number;
}

interface SpringSpec {
  readonly mass: number;
  readonly stiffness: number;
  readonly damping: number;
}

interface Timing {
  readonly spring: SpringSpec;
  readonly staggerMs: number;
  readonly fadeMs: number;
  readonly digitMs: number;
}

// Baseline timing, tuned by feel; `speedMs` scales every duration in it by a factor
// s = speedMs / BASE_SPEED_MS. Stiffness and damping are rescaled together (not just
// duration) so the spring keeps the same damping ratio — a slower speed plays out like
// slow motion of the same motion, not a differently-shaped one.
const BASE_SPEED_MS = 260;
const BASE_SPRING: SpringSpec = { mass: 1, stiffness: 350, damping: 30 };
const BASE_STAGGER_MS = 15;
const BASE_FADE_MS = 150;

export const DEFAULT_ROLLING_NUMBER_SPEED_MS = BASE_SPEED_MS;

function buildTiming(speedMs: number): Timing {
  const s = speedMs / BASE_SPEED_MS;
  return {
    spring: { mass: BASE_SPRING.mass, stiffness: BASE_SPRING.stiffness / (s * s), damping: BASE_SPRING.damping / s },
    staggerMs: BASE_STAGGER_MS * s,
    fadeMs: BASE_FADE_MS * s,
    digitMs: speedMs,
  };
}

// A digit cell's strip holds one row per digit, 9 at the top down to 0 (see digitOffset).
const STRIP_DIGITS = ['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'];

// Row pitch (the distance between two digit rows, also the rows' line-height) rounded up
// to a whole number of *device* pixels. Text is snapped to the device-pixel grid when
// painted, so rows sitting at fractional device offsets from each other (any non-integer
// page zoom / dpr, e.g. 26px * 1.6 = 41.6) land on different snapped baselines and the
// settled digits end up at visibly different heights. With an integer-device pitch every
// row — and every translateY offset of the strip, which is a multiple of the pitch —
// shares the same fractional part, so all of them snap identically. The +2 is the gap
// that keeps neighbouring digits out of the cell's clip box.
function rowPitchPx(hostHeight: number, dpr: number): number {
  return Math.ceil((hostHeight + 2) * dpr) / dpr;
}

// A cell's width is the glyph's exact advance width (see measureFrames), but a glyph's
// painted ink can overhang that advance box by a hair — bold digits with a diagonal
// stroke (e.g. "7") are the common case. .rn-cell clips at its own box edge, so with zero
// slack that overhang gets cropped. This pad widens the clip box a little on each side
// without moving its visual center (.rn-strip/.rn-glyph stay centered inside it).
const CELL_INK_PAD_PX = 1.5;

function applyCellBox(el: HTMLElement, frame: GlyphFrame): void {
  el.style.left = `${frame.x - CELL_INK_PAD_PX}px`;
  el.style.width = `${frame.width + 2 * CELL_INK_PAD_PX}px`;
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;

function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return Array.from(text);
}

// Reads an element whose index is valid by construction (parallel arrays, DP tables): a bad index is a bug here, not data.
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Index ${index} is out of range (length ${items.length})`);
  return item;
}

function isDigit(ch: string): boolean {
  return ch.length === 1 && ch >= '0' && ch <= '9';
}

// Thousands separator: a literal comma, or any Unicode "Space Separator" (Zs) character —
// covers THIN_SPACE (number-format.ts) without hardcoding which exact narrow space it is.
function isSeparator(ch: string): boolean {
  return ch === ',' || /\p{Zs}/u.test(ch);
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- measuring ----------

function measureFrames(hostEl: HTMLElement, textEl: HTMLElement, chars: readonly string[]): GlyphFrame[] {
  const node = textEl.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE || chars.length === 0) return [];

  const hostBox = hostEl.getBoundingClientRect();
  const range = document.createRange();
  const starts: number[] = [];
  let pos = 0;
  for (const ch of chars) {
    range.setStart(node, pos);
    pos += ch.length; // UTF-16 length — a grapheme can span multiple code units
    range.setEnd(node, pos);
    starts.push(range.getBoundingClientRect().left - hostBox.left);
  }
  range.setStart(node, 0);
  range.setEnd(node, pos);
  const right = range.getBoundingClientRect().right - hostBox.left;

  return starts.map((x, i) => {
    const next = starts[i + 1] ?? right;
    return { x, width: Math.max(next - x, 0) };
  });
}

// ---------- digit-aware diff ----------

interface NumberShape {
  readonly prefix: readonly number[];
  readonly whole: readonly number[];
  readonly seps: readonly number[];
  readonly decimalAt: number | null;
  readonly frac: readonly number[];
  readonly suffix: readonly number[];
}

function indexRange(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
}

function parseNumberShape(chars: readonly string[]): NumberShape | null {
  const first = chars.findIndex(isDigit);
  if (first === -1) return null;

  const whole: number[] = [];
  const frac: number[] = [];
  const seps: number[] = [];
  let decimalAt: number | null = null;
  let i = first;
  for (; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === undefined) break;
    if (isDigit(ch)) {
      (decimalAt === null ? whole : frac).push(i);
    } else if (ch === '.' && decimalAt === null) {
      decimalAt = i;
    } else if (isSeparator(ch) && decimalAt === null) {
      seps.push(i);
    } else {
      break;
    }
  }
  return { prefix: indexRange(0, first), whole, seps, decimalAt, frac, suffix: indexRange(i, chars.length) };
}

// Longest common subsequence over index ranges — fallback for non-numeric text (or the
// literal prefix/suffix around a number, e.g. a currency symbol), where place value
// doesn't apply and matching by character identity is the best available heuristic.
function lcsMatch(
  oldChars: readonly string[],
  newChars: readonly string[],
  oldIdx: readonly number[],
  newIdx: readonly number[],
  out: Map<number, number>,
): void {
  const n = oldIdx.length;
  const m = newIdx.length;
  const sameChar = (i: number, j: number): boolean => oldChars[at(oldIdx, i - 1)] === newChars[at(newIdx, j - 1)];
  const dp: Uint16Array[] = [new Uint16Array(m + 1)];
  const lcs = (i: number, j: number): number => dp[i]?.[j] ?? 0;
  for (let i = 1; i <= n; i++) {
    const row = new Uint16Array(m + 1);
    dp.push(row);
    for (let j = 1; j <= m; j++) {
      row[j] = sameChar(i, j) ? lcs(i - 1, j - 1) + 1 : Math.max(lcs(i - 1, j), lcs(i, j - 1));
    }
  }
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (sameChar(i, j)) {
      out.set(at(newIdx, j - 1), at(oldIdx, i - 1));
      i--;
      j--;
    } else if (lcs(i - 1, j) >= lcs(i, j - 1)) {
      i--;
    } else {
      j--;
    }
  }
}

// Whole-digit runs align from the ones place outward (right-to-left); fractional-digit
// runs align from the tenths place outward (left-to-right) — that's what keeps a place
// value's cell the same logical cell across a value change instead of sliding.
function matchFromEnd(oldIdx: readonly number[], newIdx: readonly number[], out: Map<number, number>): void {
  const n = Math.min(oldIdx.length, newIdx.length);
  for (let k = 0; k < n; k++) out.set(at(newIdx, newIdx.length - 1 - k), at(oldIdx, oldIdx.length - 1 - k));
}

function matchFromStart(oldIdx: readonly number[], newIdx: readonly number[], out: Map<number, number>): void {
  const n = Math.min(oldIdx.length, newIdx.length);
  for (let k = 0; k < n; k++) out.set(at(newIdx, k), at(oldIdx, k));
}

// Maps each index in newChars to the index in oldChars it should be treated as "the same
// cell" as. An index missing from the map is entering (no prior cell); an oldChars index
// that never appears as a value is exiting (its cell has nothing to become).
function diffChars(
  oldChars: readonly string[],
  newChars: readonly string[],
  mode: RollingNumberMode,
): Map<number, number> {
  const map = new Map<number, number>();

  if (mode === 'swap') {
    const n = Math.min(oldChars.length, newChars.length);
    for (let i = 0; i < n; i++) map.set(i, i);
    return map;
  }

  if (mode === 'morph') {
    lcsMatch(oldChars, newChars, indexRange(0, oldChars.length), indexRange(0, newChars.length), map);
    return map;
  }

  const oldShape = parseNumberShape(oldChars);
  const newShape = parseNumberShape(newChars);
  if (!oldShape || !newShape) {
    lcsMatch(oldChars, newChars, indexRange(0, oldChars.length), indexRange(0, newChars.length), map);
    return map;
  }

  lcsMatch(oldChars, newChars, oldShape.prefix, newShape.prefix, map);
  matchFromEnd(oldShape.whole, newShape.whole, map);
  matchFromEnd(oldShape.seps, newShape.seps, map);
  if (oldShape.decimalAt !== null && newShape.decimalAt !== null) map.set(newShape.decimalAt, oldShape.decimalAt);
  matchFromStart(oldShape.frac, newShape.frac, map);
  lcsMatch(oldChars, newChars, oldShape.suffix, newShape.suffix, map);
  return map;
}

// ---------- spring physics ----------

// Closed-form position/velocity of a damped harmonic oscillator at time t, starting at
// offset x0 with velocity v0, pulled toward 0. Because it's closed-form (not a fixed
// easing curve), a spring in flight can be interrupted and re-aimed from wherever it
// currently is, moving at whatever speed it was already moving — see SpringAnimator.
function springStateAt(spec: SpringSpec, x0: number, v0: number, t: number): { x: number; v: number } {
  const omega0 = Math.sqrt(spec.stiffness / spec.mass);
  const zeta = spec.damping / (2 * Math.sqrt(spec.stiffness * spec.mass));

  if (zeta < 1) {
    const wd = omega0 * Math.sqrt(1 - zeta * zeta);
    const a = (v0 + zeta * omega0 * x0) / wd;
    const decay = Math.exp(-zeta * omega0 * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return {
      x: decay * (x0 * cos + a * sin),
      v: decay * ((a * wd - zeta * omega0 * x0) * cos - (zeta * omega0 * a + x0 * wd) * sin),
    };
  }
  if (zeta === 1) {
    const term = v0 + omega0 * x0;
    const decay = Math.exp(-omega0 * t);
    return { x: (x0 + term * t) * decay, v: (v0 - omega0 * term * t) * decay };
  }
  const wd = omega0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * omega0 + wd;
  const r2 = -zeta * omega0 - wd;
  const c2 = (v0 - r1 * x0) / (r2 - r1);
  const c1 = x0 - c2;
  return {
    x: c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t),
    v: c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t),
  };
}

// Duration (ms) until the spring settles within 0.5px of rest, capped at 3s.
function springDuration(spec: SpringSpec, x0: number, v0: number): number {
  if (Math.abs(x0) < 0.5 && Math.abs(v0) < 0.5) return 0;
  const dt = 1 / 240;
  const maxT = 3;
  let lastAbove = 0;
  for (let t = 0; t < maxT; t += dt) {
    if (Math.abs(springStateAt(spec, x0, v0, t).x) >= 0.5) lastAbove = t;
  }
  return Math.round((lastAbove + dt) * 1000);
}

// Plays (or velocity-preserving-ly redirects) a spring-driven translateX on an element,
// keyed by element so concurrent callers never fight over the same node's transform.
class SpringAnimator {
  private readonly active = new WeakMap<
    HTMLElement,
    { spec: SpringSpec; x0: number; v0: number; duration: number; anim: Animation }
  >();

  public play(el: HTMLElement, dx: number, spec: SpringSpec): void {
    let x0 = dx;
    let v0 = 0;
    const prev = this.active.get(el);
    if (prev) {
      const elapsedMs = typeof prev.anim.currentTime === 'number' ? prev.anim.currentTime : prev.duration;
      const t = Math.min(elapsedMs, prev.duration) / 1000;
      const state = springStateAt(prev.spec, prev.x0, prev.v0, t);
      prev.anim.cancel();
      x0 = state.x + dx;
      v0 = state.v;
    }

    const duration = springDuration(spec, x0, v0);
    if (duration === 0) return;

    const steps = Math.min(Math.max(Math.round(duration / 16), 8), 90);
    const frames: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (duration / 1000) * (i / steps);
      frames.push({ transform: `translateX(${springStateAt(spec, x0, v0, t).x}px)` });
    }
    frames[steps] = { transform: 'translateX(0px)' };

    const anim = el.animate(frames, { duration, easing: 'linear' });
    this.active.set(el, { spec, x0, v0, duration, anim });
    anim.finished
      .then(() => {
        if (this.active.get(el)?.anim === anim) this.active.delete(el);
      })
      .catch(() => {});
  }
}

// ---------- cell lifecycle ----------

interface Cell {
  char: string;
  x: number;
  width: number;
  readonly el: HTMLSpanElement;
  readonly strip: HTMLSpanElement | null;
  digitAnim: Animation | null;
}

function digitOffset(digit: string, rowHeight: number): number {
  return -(9 - Number(digit)) * rowHeight;
}

interface Measurement {
  readonly newChars: string[];
  readonly rowHeight: number;
  readonly frames: GlyphFrame[];
}

// A commit writes DOM and then needs layout to measure it. Done per instance, N instances
// updating in one tick means N write→read pairs, each forcing a synchronous reflow. Instead
// every commit of the tick is queued, then one flush does all the reads before any of the
// writes — the first read pays for the layout, the rest hit a clean one. The microtask runs
// right after the tick's callback, before the browser renders, so nothing paints in between.
const pendingCommits = new Set<RollingNumberEngine>();

function schedulePendingCommit(engine: RollingNumberEngine): void {
  if (pendingCommits.size === 0) queueMicrotask(flushPendingCommits);
  pendingCommits.add(engine);
}

function flushPendingCommits(): void {
  const engines = [...pendingCommits];
  pendingCommits.clear();
  const measured = engines.map((engine) => ({ engine, measurement: engine.measurePending() }));
  for (const { engine, measurement } of measured) engine.applyPending(measurement);
}

export interface RollingNumberOptions {
  readonly mode?: RollingNumberMode;
  readonly speedMs?: number;
}

export class RollingNumberEngine {
  private readonly springs = new SpringAnimator();
  private readonly mode: RollingNumberMode;
  private readonly timing: Timing;
  private chars: string[] = [];
  private cells: Cell[] = [];
  private rowHeight = 0;
  private pendingText = '';
  private pendingSnap = false;

  public constructor(
    private readonly hostEl: HTMLElement,
    private readonly overlayEl: HTMLElement,
    private readonly staticTextEl: HTMLElement,
    options: RollingNumberOptions = {},
  ) {
    this.mode = options.mode ?? 'rolling';
    this.timing = buildTiming(options.speedMs ?? DEFAULT_ROLLING_NUMBER_SPEED_MS);
  }

  // Diffs `text` against whatever was last committed and animates the difference. Pass
  // `snap: true` to mount instantly with no animation (initial render, or a structural
  // reconfiguration where animating the transition wouldn't mean anything).
  //
  // Only the static text is written here; measuring and animating happen in the shared
  // microtask flush (see flushPendingCommits), so commits from many instances in one tick
  // cost one layout instead of one each. Commits to the same instance within a tick
  // coalesce — only the latest text is animated to.
  public commit(text: string, snap = false): void {
    this.staticTextEl.textContent = text;
    this.pendingText = text;
    this.pendingSnap ||= snap;
    schedulePendingCommit(this);
  }

  // Reads only (layout geometry of the already-written static text) — must never be
  // interleaved with apply() writes of another instance, see flushPendingCommits.
  public measurePending(): Measurement {
    const newChars = graphemes(this.pendingText);
    return {
      newChars,
      rowHeight: rowPitchPx(this.hostEl.getBoundingClientRect().height, window.devicePixelRatio),
      frames: measureFrames(this.hostEl, this.staticTextEl, newChars),
    };
  }

  public applyPending({ newChars, rowHeight, frames }: Measurement): void {
    const snap = this.pendingSnap;
    this.pendingSnap = false;
    // Cells bake the pitch into their rows at mount, so a changed pitch (page zoom, font
    // size) invalidates them all — remount instead of mixing pitches.
    const pitchChanged = rowHeight !== this.rowHeight;
    this.rowHeight = rowHeight;
    const reduced = prefersReducedMotion();

    if (snap || pitchChanged || this.chars.length === 0) {
      this.overlayEl.replaceChildren();
      this.cells = newChars.map((ch, i) => this.mountCell(ch, at(frames, i)));
      this.chars = newChars;
      return;
    }

    const map = diffChars(this.chars, newChars, this.mode);
    const usedOld = new Set(map.values());
    const nextCells = new Array<Cell>(newChars.length);
    let enterCount = 0;

    for (const [ni, newChar] of newChars.entries()) {
      const oi = map.get(ni);
      if (oi === undefined) continue;
      const cell = at(this.cells, oi);
      const frame = at(frames, ni);
      const isRollingDigit = this.mode === 'rolling' && cell.strip !== null && isDigit(newChar);
      if (newChar !== cell.char && !isRollingDigit) {
        this.exitCell(cell, reduced);
        nextCells[ni] = this.enterCell(newChar, frame, enterCount++, reduced);
      } else {
        this.moveCell(cell, newChar, frame, reduced);
        nextCells[ni] = cell;
      }
    }
    for (const [oi, cell] of this.cells.entries()) {
      if (!usedOld.has(oi)) this.exitCell(cell, reduced);
    }
    for (const [ni, newChar] of newChars.entries()) {
      if (!map.has(ni)) nextCells[ni] = this.enterCell(newChar, at(frames, ni), enterCount++, reduced);
    }

    this.chars = newChars;
    this.cells = nextCells;
  }

  // Cancels every in-flight animation this engine owns. The overlay DOM is torn down
  // along with the host element itself, so nothing else needs cleanup here.
  public destroy(): void {
    pendingCommits.delete(this);
    for (const cell of this.cells) {
      cell.digitAnim?.cancel();
      cell.el.getAnimations().forEach((anim) => anim.cancel());
    }
  }

  private mountCell(ch: string, frame: GlyphFrame): Cell {
    const el = document.createElement('span');
    el.className = 'rn-cell';
    applyCellBox(el, frame);
    this.copyAngularScopeAttrs(el);

    const rolling = this.mode === 'rolling' && isDigit(ch);
    let strip: HTMLSpanElement | null = null;
    if (rolling) {
      strip = document.createElement('span');
      strip.className = 'rn-strip';
      strip.style.lineHeight = `${this.rowHeight}px`;
      // Rows are placed with transforms, not stacked by line-height: layout rounds lengths
      // to 1/64px, which would break the whole-device-pixel pitch (see rowPitchPx).
      for (const [i, digit] of STRIP_DIGITS.entries()) {
        const row = document.createElement('span');
        row.className = 'rn-row';
        row.textContent = digit;
        row.style.transform = `translateY(${i * this.rowHeight}px)`;
        this.copyAngularScopeAttrs(row);
        strip.appendChild(row);
      }
      strip.style.transform = `translateY(${digitOffset(ch, this.rowHeight)}px)`;
      this.copyAngularScopeAttrs(strip);
      el.appendChild(strip);
    } else {
      const glyph = document.createElement('span');
      glyph.className = 'rn-glyph';
      glyph.textContent = ch;
      glyph.style.lineHeight = `${this.rowHeight}px`;
      this.copyAngularScopeAttrs(glyph);
      el.appendChild(glyph);
    }

    this.overlayEl.appendChild(el);
    return { char: ch, x: frame.x, width: frame.width, el, strip, digitAnim: null };
  }

  // Angular's Emulated view encapsulation (the project default) scopes this component's
  // CSS by stamping an `_ngcontent-*` attribute on every element its template compiler
  // renders, then rewriting selectors to require that attribute. Cells are created with
  // raw document.createElement instead, outside the compiler's reach, so without this
  // they'd carry none of the scoping attributes — the .rn-cell/.rn-strip/.rn-glyph rules
  // would silently never match, leaving cells completely unstyled (unclipped, static-
  // positioned digit strips stacking down the page). overlayEl is real template-rendered
  // markup, so whatever scoping attribute Angular gave it is copied onto each new cell.
  // A no-op outside Angular or under ViewEncapsulation.None, so the engine stays reusable.
  private copyAngularScopeAttrs(target: HTMLElement): void {
    for (const attr of Array.from(this.overlayEl.attributes)) {
      if (attr.name.startsWith('_ng')) target.setAttribute(attr.name, attr.value);
    }
  }

  private moveCell(cell: Cell, newChar: string, frame: GlyphFrame, reduced: boolean): void {
    const dx = cell.x - frame.x;
    applyCellBox(cell.el, frame);
    cell.x = frame.x;
    cell.width = frame.width;
    if (!reduced && Math.abs(dx) >= 0.5) this.springs.play(cell.el, dx, this.timing.spring);

    if (cell.strip && newChar !== cell.char && isDigit(newChar)) {
      const target = digitOffset(newChar, this.rowHeight);
      cell.digitAnim?.cancel();
      if (!reduced) {
        cell.digitAnim = cell.strip.animate(
          [
            { transform: `translateY(${digitOffset(cell.char, this.rowHeight)}px)` },
            { transform: `translateY(${target}px)` },
          ],
          { duration: this.timing.digitMs, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
        );
      }
      cell.strip.style.transform = `translateY(${target}px)`;
    }
    cell.char = newChar;
  }

  private enterCell(ch: string, frame: GlyphFrame, staggerIndex: number, reduced: boolean): Cell {
    const cell = this.mountCell(ch, frame);
    cell.el.style.opacity = reduced ? '1' : '0';
    if (!reduced) {
      cell.el.animate(
        [
          { transform: 'scale(0.8)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        {
          duration: this.timing.fadeMs,
          delay: staggerIndex * this.timing.staggerMs,
          easing: 'ease-out',
          fill: 'both',
        },
      );
    }
    return cell;
  }

  private exitCell(cell: Cell, reduced: boolean): void {
    cell.digitAnim?.cancel();
    if (reduced) {
      cell.el.remove();
      return;
    }
    const anim = cell.el.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'scale(0.8)', opacity: 0 },
      ],
      {
        duration: this.timing.fadeMs,
        easing: 'ease-in',
        fill: 'forwards',
      },
    );
    const cleanup = (): void => cell.el.remove();
    anim.finished.then(cleanup).catch(cleanup);
  }
}

export const __testing = {
  rowPitchPx,
  graphemes,
  isDigit,
  isSeparator,
  parseNumberShape,
  diffChars,
  springStateAt,
  springDuration,
};
