import { __testing } from './rolling-number-engine';

const { graphemes, parseNumberShape, diffChars, springStateAt, springDuration, rowPitchPx } = __testing;

describe('rolling-number-engine', () => {
  describe('rowPitchPx', () => {
    // Browser zoom 50%..200% on 1x and 2x displays.
    const dprs = [0.5, 0.6, 0.75, 0.8, 1, 1.1, 1.25, 1.34, 1.5, 1.6, 1.8, 2, 2.2, 2.5, 3, 3.5, 4];
    const hostHeights = [14, 20.8, 23.994, 24, 31.5];

    it('puts every digit row on a whole device pixel and keeps the 2px gap', () => {
      for (const dpr of dprs) {
        for (const height of hostHeights) {
          const pitch = rowPitchPx(height, dpr);
          expect(pitch).toBeGreaterThanOrEqual(height + 2);
          expect(pitch).toBeLessThan(height + 2 + 1 / dpr + 1e-9);
          for (let row = 0; row < 10; row++) {
            const deviceOffset = row * pitch * dpr;
            expect(Math.abs(deviceOffset - Math.round(deviceOffset))).toBeLessThan(1e-9);
          }
        }
      }
    });
  });

  describe('parseNumberShape', () => {
    it('returns null for text with no digits', () => {
      expect(parseNumberShape(graphemes('--'))).toBeNull();
    });

    it('splits a plain integer into prefix and whole digits only', () => {
      const shape = parseNumberShape(graphemes('42'));
      expect(shape).toEqual({ prefix: [], whole: [0, 1], seps: [], decimalAt: null, frac: [], suffix: [] });
    });

    it('splits a signed money value into prefix, whole, decimal and frac', () => {
      const shape = parseNumberShape(graphemes('$-12.35'));
      expect(shape).toEqual({ prefix: [0, 1], whole: [2, 3], seps: [], decimalAt: 4, frac: [5, 6], suffix: [] });
    });

    it('recognizes a comma as a thousands separator', () => {
      const shape = parseNumberShape(graphemes('1,234'));
      expect(shape).toEqual({ prefix: [], whole: [0, 2, 3, 4], seps: [1], decimalAt: null, frac: [], suffix: [] });
    });

    it('recognizes any Unicode space-separator character as a thousands separator', () => {
      const shape = parseNumberShape(graphemes('1 234'));
      expect(shape?.seps).toEqual([1]);
      expect(shape?.whole).toEqual([0, 2, 3, 4]);
    });
  });

  describe('diffChars', () => {
    it('matches whole-digit runs from the ones place outward when a leading digit appears', () => {
      const oldChars = graphemes('284');
      const newChars = graphemes('1299');
      const map = diffChars(oldChars, newChars, 'rolling');
      // ones/tens/hundreds place carry over; the new leading "1" has nothing to match
      expect(map.get(3)).toBe(2); // new "9" (ones) <- old "4" (ones)
      expect(map.get(2)).toBe(1); // new "9" (tens) <- old "8" (tens)
      expect(map.get(1)).toBe(0); // new "2" (hundreds) <- old "2" (hundreds)
      expect(map.has(0)).toBe(false); // new leading "1" is a fresh cell
    });

    it('matches fractional digits from the tenths place inward when a trailing digit appears', () => {
      const oldChars = graphemes('6.4');
      const newChars = graphemes('6.45');
      const map = diffChars(oldChars, newChars, 'rolling');
      expect(map.get(0)).toBe(0); // "6"
      expect(map.get(1)).toBe(1); // "."
      expect(map.get(2)).toBe(2); // "4" (tenths)
      expect(map.has(3)).toBe(false); // new "5" (hundredths) is a fresh cell
    });

    it('keeps a stable currency prefix matched across a value change', () => {
      const oldChars = graphemes('$284.06');
      const newChars = graphemes('$1,299.15');
      const map = diffChars(oldChars, newChars, 'rolling');
      expect(map.get(0)).toBe(0); // "$"
    });

    it('in swap mode matches purely by position, ignoring place value', () => {
      const map = diffChars(graphemes('284'), graphemes('1299'), 'swap');
      expect(map.get(0)).toBe(0);
      expect(map.get(1)).toBe(1);
      expect(map.get(2)).toBe(2);
      expect(map.has(3)).toBe(false);
    });
  });

  describe('spring physics', () => {
    it('settles to rest (x=0) as t grows large, for an underdamped spring', () => {
      const spec = { mass: 1, stiffness: 350, damping: 30 };
      const state = springStateAt(spec, 100, 0, 5);
      expect(Math.abs(state.x)).toBeLessThan(0.01);
    });

    it('starts exactly at x0 with velocity v0 at t=0', () => {
      const spec = { mass: 1, stiffness: 170, damping: 26 };
      const state = springStateAt(spec, 50, 12, 0);
      expect(state.x).toBeCloseTo(50);
      expect(state.v).toBeCloseTo(12);
    });

    it('returns 0 duration for a spring already at rest', () => {
      const spec = { mass: 1, stiffness: 350, damping: 30 };
      expect(springDuration(spec, 0, 0)).toBe(0);
    });

    it('returns a positive duration for a displaced spring, longer for a bigger displacement', () => {
      const spec = { mass: 1, stiffness: 350, damping: 30 };
      const small = springDuration(spec, 10, 0);
      const large = springDuration(spec, 400, 0);
      expect(small).toBeGreaterThan(0);
      expect(large).toBeGreaterThanOrEqual(small);
    });

    it('handles the critically-damped case (zeta === 1) without NaN', () => {
      // damping = 2*sqrt(stiffness*mass) => zeta === 1 exactly
      const spec = { mass: 1, stiffness: 100, damping: 20 };
      const state = springStateAt(spec, 30, 0, 0.5);
      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.v)).toBe(true);
    });

    it('handles the overdamped case (zeta > 1) without NaN', () => {
      const spec = { mass: 1, stiffness: 100, damping: 40 };
      const state = springStateAt(spec, 30, 0, 0.5);
      expect(Number.isFinite(state.x)).toBe(true);
      expect(Number.isFinite(state.v)).toBe(true);
    });
  });
});
