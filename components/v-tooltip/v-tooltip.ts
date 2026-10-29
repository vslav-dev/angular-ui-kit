import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { LayerController, PARENT_LAYER_ID, ZLayerService } from '@ui-kit/services/z-layer.service';
import { computeTooltipPosition } from './tooltip-position';

@Component({
  selector: 'v-tooltip',
  templateUrl: './v-tooltip.html',
  styleUrl: './v-tooltip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--v-tooltip-z-index]': 'zIndex$$()',
    '[class.fill]': 'fill()',
    '[class.no-wrap]': 'noWrap()',
  },
})
export class VTooltip implements OnDestroy {
  // When true, the trigger stretches to fill its positioned parent instead
  // of sizing to its content — for wrapping an already-sized container
  // (e.g. a timeline segment too small to show its own label).
  public readonly fill = input(false);
  // When true, the panel is forced to a single line regardless of maxWidth
  // instead of wrapping.
  public readonly noWrap = input(false);
  public readonly maxWidth = input<string>('280px');

  protected readonly triggerElem = viewChild.required<ElementRef<HTMLElement>>('triggerElem');
  protected readonly panelElem = viewChild<ElementRef<HTMLElement>>('panelElem');

  protected readonly isOpen$$ = signal(false);
  protected readonly isPositioned$$ = signal(false);
  protected readonly placement$$ = signal<'top' | 'bottom'>('top');
  protected readonly fixedTop$$ = signal(0);
  protected readonly fixedLeft$$ = signal(0);
  protected readonly zIndex$$ = computed(() => this.layerController.zIndex);

  private readonly zLayerService = inject(ZLayerService);
  private readonly layerController: LayerController = this.zLayerService.registerLayer(
    'tooltip',
    inject(PARENT_LAYER_ID, { optional: true }) ?? undefined,
  );
  private outsideTouchListener: ((event: TouchEvent) => void) | null = null;

  public ngOnDestroy(): void {
    this.stopWatchingOutsideTouch();
    this.layerController.destroy();
  }

  protected open(): void {
    this.isOpen$$.set(true);
    this.isPositioned$$.set(false);
    setTimeout(() => this.updatePosition(), 0);
    this.watchOutsideTouch();
  }

  protected close(): void {
    this.isOpen$$.set(false);
    this.isPositioned$$.set(false);
    this.stopWatchingOutsideTouch();
    // Closing via the outside-touch listener doesn't move DOM focus off the trigger. Left
    // focused, a later tap on it won't re-fire `focus` (it's already focused), so open() would
    // never run again. Blurring keeps DOM focus state and isOpen$$ in sync — a no-op when close()
    // runs from an actual blur event, since the element is already unfocused by then.
    this.triggerElem().nativeElement.blur();
  }

  // Closes the instant a new touch starts elsewhere, not on touchend/blur — otherwise, since the
  // panel is position: fixed, dragging the page to scroll leaves it floating in place, detached
  // from its trigger, until the drag ends.
  private watchOutsideTouch(): void {
    this.outsideTouchListener = (event: TouchEvent) => {
      if (this.triggerElem().nativeElement.contains(event.target as Node)) return;
      this.close();
    };
    document.addEventListener('touchstart', this.outsideTouchListener, { capture: true, passive: true });
  }

  private stopWatchingOutsideTouch(): void {
    if (!this.outsideTouchListener) return;
    document.removeEventListener('touchstart', this.outsideTouchListener, { capture: true });
    this.outsideTouchListener = null;
  }

  private updatePosition(): void {
    const panel = this.panelElem()?.nativeElement;
    if (!panel) return;

    const triggerRect = this.triggerElem().nativeElement.getBoundingClientRect();
    const position = computeTooltipPosition(triggerRect, panel.getBoundingClientRect());

    this.placement$$.set(position.placement);
    this.fixedTop$$.set(position.top);
    this.fixedLeft$$.set(position.left);
    this.isPositioned$$.set(true);
  }
}
