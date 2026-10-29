import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ProgressBarStyle } from '@ui-kit/components/types';
import { CssUnitOrRawValue, CssUnitValue, resolveCssUnitOrRawValue } from '@ui-kit/types';

export type VSliderRangeValue = [number, number];

type ActiveThumb = 'start' | 'end';

type DragMode = 'single' | 'range-start' | 'range-end' | 'range-shift';

type DragState = {
  mode: DragMode;
  startX: number;
  startValue: number;
  startRange: VSliderRangeValue;
};

@Component({
  selector: 'v-slider',
  templateUrl: './v-slider.html',
  styleUrl: './v-slider.css',
  host: {
    '[class.touch-mode]': 'isTouchMode()',
    '[class.dragging]': 'isDragging$$()',
    '[class.disabled]': 'isDisabled()',
    '[style.--v-slider-height]': 'heightString$$()',
    '[style.--v-slider-border-radius]': 'borderRadiusString$$()',
    '[style.--v-slider-track-color]': 'trackColor()',
    '[style.--v-slider-fill-color]': 'fillColor()',
    '[style.--v-slider-thumb-size]': 'thumbSizeString$$()',
    '[style.--v-slider-thumb-border-radius]': 'thumbBorderRadiusString$$()',
    '[style.--v-slider-touch-size]': 'touchAreaSizeString$$()',
    '[style.--v-slider-track-margin]': 'trackMarginString$$()',
    '[style.--v-slider-fill-radius]': 'fillRadiusString$$()',
    '[style.--v-slider-fill-start]': 'fillStart$$()',
    '[style.--v-slider-fill-end]': 'fillEnd$$()',
    '[attr.bar-style]': 'barStyle()',
  },
})
export class VSlider {
  public readonly valueList = input<number[]>([]);
  public readonly isDisabled = input<boolean>(false);
  public readonly isRange = input<boolean>(false);
  public readonly isTouchMode = input<boolean>(false);
  public readonly min = input<number>(0);
  public readonly max = input<number>(100);
  public readonly height = input<CssUnitValue>(3);
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly thumbBorderRadius = input<CssUnitOrRawValue>('50%');
  public readonly thumbSize = input<CssUnitValue>(6);
  public readonly touchAreaSize = input<CssUnitOrRawValue>(12);
  public readonly minSpan = input<number>(0);
  public readonly trackColor = input<string>('var(--v-color-surface)');
  public readonly fillColor = input<string>('var(--v-color-primary)');
  public readonly barStyle = input<ProgressBarStyle>(ProgressBarStyle.Flat);

  public readonly value = model<number>(0);
  public readonly range = model<VSliderRangeValue>([0, 100]);

  protected readonly rootElement = viewChild.required<ElementRef<HTMLDivElement>>('root');
  protected readonly trackElement = viewChild.required<ElementRef<HTMLDivElement>>('track');
  protected readonly thumbStartElem = viewChild.required<ElementRef<HTMLDivElement>>('thumbStart');
  protected readonly thumbEndElem = viewChild<ElementRef<HTMLDivElement>>('thumbEnd');

  protected readonly touchAreaSizeString$$ = computed(() => resolveCssUnitOrRawValue(this.touchAreaSize()));

  protected readonly valueListSorted$$ = computed(() => {
    const list = this.valueList();
    if (!Array.isArray(list)) return [];
    const filtered = list.filter((value) => Number.isFinite(value));
    if (filtered.length <= 1) return [];
    return [...filtered].sort((a, b) => a - b);
  });

  protected readonly min$$ = computed(() => {
    const list = this.valueListSorted$$();
    if (list.length > 0) return list[0];
    return Math.min(this.min(), this.max());
  });

  protected readonly max$$ = computed(() => {
    const list = this.valueListSorted$$();
    if (list.length > 0) return list[list.length - 1];
    return Math.max(this.min(), this.max());
  });

  protected readonly heightString$$ = computed(() => resolveCssUnitOrRawValue(this.height()));
  protected readonly borderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.borderRadius()));

  protected readonly thumbBorderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.thumbBorderRadius()));

  protected readonly fillRadiusString$$ = computed(() => {
    if (!this.isRange()) return '0px';
    return resolveCssUnitOrRawValue(this.borderRadius());
  });

  protected readonly thumbSizeString$$ = computed(() => resolveCssUnitOrRawValue(this.thumbSize()));

  protected readonly trackMarginString$$ = computed(() => {
    const trackHeightPx = this.unitToPx(this.height());
    const thumbSizePx = this.unitToPx(this.thumbSize());
    const thumbOuterPx = thumbSizePx + 4;
    const marginPx = Math.max(0, (thumbOuterPx - trackHeightPx) / 2);
    return `${marginPx}px`;
  });

  protected readonly displayValue$$ = computed(() => this.normalizeValue(this.value()));

  protected readonly displayRange$$ = computed(() => {
    const [start, end] = this.range();
    const clampedStart = this.normalizeValue(start);
    const clampedEnd = this.normalizeValue(end);
    const lower = Math.min(clampedStart, clampedEnd);
    const upper = Math.max(clampedStart, clampedEnd);

    return [lower, upper] as VSliderRangeValue;
  });

  protected readonly thumbStartPosition$$ = computed(() => {
    const isRange = this.isRange();
    const value = isRange ? this.displayRange$$()[0] : this.displayValue$$();
    return isRange ? this.valueToPercentForRangeStart(value) : this.valueToPercentSingle(value);
  });

  protected readonly thumbEndPosition$$ = computed(() => {
    const isRange = this.isRange();
    const value = isRange ? this.displayRange$$()[1] : this.displayValue$$();
    return isRange ? this.valueToPercentForRangeEnd(value) : this.valueToPercentSingle(value);
  });

  protected readonly fillStart$$ = computed(() => {
    if (!this.isRange()) return '0%';
    return this.valueToPercentForRangeEdge(this.displayRange$$()[0]);
  });

  protected readonly fillEnd$$ = computed(() => {
    if (this.isRange()) return this.valueToPercentForRangeEdge(this.displayRange$$()[1]);
    return this.valueToPercentSingle(this.displayValue$$());
  });

  protected readonly isDragging$$ = signal(false);
  private readonly pointerId$$ = signal<number | null>(null);
  private readonly dragState$$ = signal<DragState | null>(null);
  protected readonly touchActive$$ = signal(false);
  protected readonly activeTouchThumb$$ = signal<ActiveThumb | null>(null);

  private readonly trackWidth$$ = signal(0);
  private readonly destroyRef = inject(DestroyRef);

  private readonly normalizeEffect = effect(() => {
    if (this.isRange()) {
      const current = this.range();
      const clampedStart = this.normalizeValue(current[0]);
      const clampedEnd = this.normalizeValue(current[1]);
      const minSpan = this.minSpan();
      let nextStart = Math.min(clampedStart, clampedEnd);
      let nextEnd = Math.max(clampedStart, clampedEnd);

      if (minSpan > 0 && nextEnd - nextStart < minSpan) {
        const pushed = this.normalizeValue(nextStart + minSpan);
        if (pushed <= this.max$$()) {
          nextEnd = pushed;
        } else {
          nextStart = Math.max(this.normalizeValue(nextEnd - minSpan), this.min$$());
        }
      }

      if (current[0] !== nextStart || current[1] !== nextEnd) {
        this.range.set([nextStart, nextEnd]);
      }

      return;
    }

    const currentValue = this.value();
    const clampedValue = this.normalizeValue(currentValue);

    if (currentValue !== clampedValue) {
      this.value.set(clampedValue);
    }
  });

  public constructor() {
    afterNextRender(() => {
      const track = this.trackElement().nativeElement;
      const observer = new ResizeObserver(() => this.trackWidth$$.set(track.clientWidth));
      observer.observe(track);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onTrackPointerDown(event: PointerEvent): void {
    if (!this.isRange()) return;
    if (this.isDisabled()) return;
    if (event.button !== 0) return;

    event.preventDefault();
    const value = this.positionToValueForRangeEdge(event);
    const thumb = this.getClosestThumb(value);
    this.startDrag(event, thumb === 'start' ? 'range-start' : 'range-end');
  }

  protected onFillPointerDown(event: PointerEvent): void {
    if (!this.isRange()) return;
    if (this.isDisabled()) return;
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    this.startDrag(event, 'range-shift');
  }

  protected onThumbPointerDown(event: PointerEvent, thumb: ActiveThumb): void {
    if (this.isDisabled()) return;
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    if (this.isTouchMode() && event.pointerType === 'touch') {
      this.touchActive$$.set(true);
      this.activeTouchThumb$$.set(thumb);
    }
    if (this.isRange()) {
      this.startDrag(event, thumb === 'start' ? 'range-start' : 'range-end');
      return;
    }
    this.startDrag(event, 'single');
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.isDragging$$()) return;

    if (this.pointerId$$() !== event.pointerId) return;

    const dragState = this.dragState$$();
    if (!dragState) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaValue = this.deltaToValue(deltaX, dragState.mode);
    const { min, max } = this.getRangeMetrics();

    if (dragState.mode === 'single') {
      const nextValue = this.normalizeValue(dragState.startValue + deltaValue);
      this.value.set(nextValue);
      return;
    }

    const [start, end] = dragState.startRange;

    if (dragState.mode === 'range-start') {
      const minSpan = this.minSpan();
      const cap = minSpan > 0 ? this.normalizeValue(end - minSpan) : end;
      const nextStart = Math.min(this.normalizeValue(start + deltaValue), cap);
      this.range.set([nextStart, end]);
      return;
    }

    if (dragState.mode === 'range-end') {
      const minSpan = this.minSpan();
      const floor = minSpan > 0 ? this.normalizeValue(start + minSpan) : start;
      const nextEnd = Math.max(this.normalizeValue(end + deltaValue), floor);
      this.range.set([start, nextEnd]);
      return;
    }

    const length = end - start;
    let nextStart = start + deltaValue;
    let nextEnd = end + deltaValue;

    if (nextStart < min) {
      nextStart = min;
      nextEnd = min + length;
    }

    if (nextEnd > max) {
      nextEnd = max;
      nextStart = max - length;
    }

    const snappedStart = this.normalizeValue(nextStart);
    const snappedEnd = this.normalizeValue(nextEnd);
    const lower = Math.min(snappedStart, snappedEnd);
    const upper = Math.max(snappedStart, snappedEnd);
    this.range.set([lower, upper]);
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.isDragging$$()) return;

    if (this.pointerId$$() !== event.pointerId) return;

    this.isDragging$$.set(false);
    this.pointerId$$.set(null);
    this.dragState$$.set(null);
    this.touchActive$$.set(false);
    this.activeTouchThumb$$.set(null);
    const root = this.rootElement().nativeElement;

    if (root.hasPointerCapture(event.pointerId)) {
      root.releasePointerCapture(event.pointerId);
    }
  }

  protected onThumbKeydown(event: KeyboardEvent, thumb: ActiveThumb): void {
    if (this.isDisabled()) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();

    const dir = event.key === 'ArrowRight' ? 1 : -1;

    if (!this.isRange()) {
      this.value.set(this.stepValue(this.displayValue$$(), dir));
      return;
    }

    const [start, end] = this.displayRange$$();

    if (thumb === 'start') {
      this.range.set([Math.min(this.stepValue(start, dir), end), end]);
      return;
    }

    this.range.set([start, Math.max(this.stepValue(end, dir), start)]);
  }

  private startDrag(event: PointerEvent, mode: DragMode): void {
    this.isDragging$$.set(true);
    this.pointerId$$.set(event.pointerId);
    this.rootElement().nativeElement.setPointerCapture(event.pointerId);
    const startValue = this.displayValue$$();
    const startRange = this.displayRange$$();
    this.dragState$$.set({
      mode,
      startX: event.clientX,
      startValue,
      startRange,
    });
    this.focusActiveThumb(mode);
  }

  private getClosestThumb(value: number): ActiveThumb {
    const [start, end] = this.displayRange$$();
    const distStart = Math.abs(value - start);
    const distEnd = Math.abs(value - end);

    return distStart <= distEnd ? 'start' : 'end';
  }

  private positionToValueForRangeEdge(event: PointerEvent): number {
    const rect = this.getTrackRect();
    if (rect.width <= 0) return this.min$$();

    const trackWidth = rect.width;
    const borderWidth = rect.borderWidth;
    const thumbSize = this.getThumbSizePx();
    const edgeMin = thumbSize - borderWidth;
    const edgeMax = trackWidth - thumbSize + borderWidth;
    const edgeWidth = Math.max(0, edgeMax - edgeMin);
    const clickPos = event.clientX - rect.left - borderWidth;
    const edgePos = Math.min(edgeMax, Math.max(edgeMin, clickPos));

    const { min, range } = this.getRangeMetrics();
    const ratio = edgeWidth === 0 ? 0 : (edgePos - edgeMin) / edgeWidth;
    return min + ratio * range;
  }

  private valueToPercentSingle(value: number): string {
    const { min, range } = this.getRangeMetrics();
    if (range === 0) return '0%';

    const { width, borderWidth } = this.getTrackRect();
    if (width <= 0) return '0%';

    const thumbSize = this.getThumbSizePx();
    const halfThumb = thumbSize / 2;
    const effectiveWidth = Math.max(0, width - thumbSize + borderWidth * 2);
    const ratio = (value - min) / range;
    const position = halfThumb - borderWidth + ratio * effectiveWidth;
    const percent = (position / width) * 100;

    return `${percent}%`;
  }

  private valueToPercentForRangeStart(value: number): string {
    return this.valueToPercentWithEdge(value, -1);
  }

  private valueToPercentForRangeEnd(value: number): string {
    return this.valueToPercentWithEdge(value, 1);
  }

  private valueToPercentForRangeEdge(value: number): string {
    return this.valueToPercentWithEdge(value, 0);
  }

  private valueToPercentWithEdge(value: number, edgeDirection: -1 | 0 | 1): string {
    const { min, range } = this.getRangeMetrics();
    if (range === 0) return '0%';

    const { width, borderWidth } = this.getTrackRect();
    if (width <= 0) return '0%';

    const thumbSize = this.getThumbSizePx();
    const halfThumb = thumbSize / 2;
    const edgeMin = thumbSize - borderWidth;
    const edgeMax = width - thumbSize + borderWidth;
    const edgeWidth = Math.max(0, edgeMax - edgeMin);
    const ratio = (value - min) / range;
    const edgePos = edgeMin + ratio * edgeWidth;
    const position = edgePos + edgeDirection * halfThumb;
    const percent = (position / width) * 100;
    return `${percent}%`;
  }

  private getRangeMetrics(): { min: number; max: number; range: number } {
    const min = this.min$$();
    const max = this.max$$();
    return { min, max, range: max - min };
  }

  private normalizeValue(value: number): number {
    const clamped = this.clampToBounds(value, this.min$$(), this.max$$());
    return this.snapToList(clamped);
  }

  private snapToList(value: number): number {
    const list = this.valueListSorted$$();
    if (list.length === 0) return value;
    if (value <= list[0]) return list[0];
    if (value >= list[list.length - 1]) return list[list.length - 1];

    let low = 0;
    let high = list.length - 1;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const midValue = list[mid];
      if (value === midValue) return midValue;
      if (value < midValue) {
        high = mid;
      } else {
        low = mid;
      }
    }

    const lowValue = list[low];
    const highValue = list[high];
    return Math.abs(value - lowValue) <= Math.abs(highValue - value) ? lowValue : highValue;
  }

  private deltaToValue(deltaX: number, mode: DragMode): number {
    const rect = this.getTrackRect();
    if (rect.width <= 0) return 0;

    const { range } = this.getRangeMetrics();
    if (range === 0) return 0;

    const thumbSize = this.getThumbSizePx();
    const borderWidth = rect.borderWidth;
    const availableWidth =
      mode === 'single'
        ? Math.max(0, rect.width - thumbSize + borderWidth * 2)
        : Math.max(0, rect.width - thumbSize * 2 + borderWidth * 2);

    if (availableWidth === 0) return 0;

    return (deltaX / availableWidth) * range;
  }

  private getTrackRect(): {
    width: number;
    height: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    borderWidth: number;
  } {
    const width = this.trackWidth$$();
    if (width <= 0) {
      return { width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0, borderWidth: 0 };
    }

    const element = this.trackElement().nativeElement;
    const rect = element.getBoundingClientRect();
    const borderWidth = (element.offsetWidth - element.clientWidth) / 2;

    return {
      width,
      height: element.clientHeight,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      borderWidth,
    };
  }

  private getThumbSizePx(): number {
    return this.unitToPx(this.thumbSize());
  }

  private unitToPx(value: CssUnitValue): number {
    return value * 4;
  }

  private clampToBounds(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private stepValue(current: number, dir: 1 | -1): number {
    const list = this.valueListSorted$$();
    if (list.length > 0) {
      const idx = list.indexOf(current);
      return list[Math.max(0, Math.min(list.length - 1, idx + dir))];
    }
    return this.clampToBounds(current + dir, this.min$$(), this.max$$());
  }

  private focusActiveThumb(mode: DragMode): void {
    if (mode === 'range-shift') return;
    const elem = mode === 'range-end' ? this.thumbEndElem()?.nativeElement : this.thumbStartElem().nativeElement;
    elem?.focus({ preventScroll: true });
  }
}
