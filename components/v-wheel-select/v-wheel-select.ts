import {
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  model,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { LayerController, PARENT_LAYER_ID, ZLayerService } from '@ui-kit/services/z-layer.service';

export interface WheelSelectItem {
  value: string;
  label: string;
}

const ROW_HEIGHT_PX = 32;
const OVERLAY_WIDTH_PX = 64;
const VIEWPORT_MARGIN_PX = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

@Component({
  selector: 'v-wheel-select',
  templateUrl: './v-wheel-select.html',
  styleUrl: './v-wheel-select.css',
  host: {
    '[style.--v-wheel-select-z-index]': 'zIndex$$()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class VWheelSelect implements OnInit, OnDestroy {
  public readonly items = input.required<WheelSelectItem[]>();
  public readonly value = model<string>('');
  public readonly isDisabled = input<boolean>(false);
  public readonly visibleRows = input<number>(5);

  protected readonly scrollElem = viewChild<ElementRef<HTMLElement>>('scrollElem');

  protected readonly isOpen$$ = signal(false);
  protected readonly overlayTop$$ = signal(0);
  protected readonly overlayLeft$$ = signal(0);
  protected readonly zIndex$$ = signal(100);
  protected readonly pendingIndex$$ = signal<number | null>(null);

  protected readonly rowHeightPx = ROW_HEIGHT_PX;

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zLayerService = inject(ZLayerService);
  private readonly parentLayerId = inject(PARENT_LAYER_ID, { optional: true }) ?? undefined;
  private layerController: LayerController | null = null;

  public ngOnInit(): void {
    this.layerController = this.zLayerService.registerLayer('dropdown', this.parentLayerId);
    this.zIndex$$.set(this.layerController.zIndex);
  }

  public ngOnDestroy(): void {
    this.layerController?.destroy();
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen$$()) return;
    const target = event.target as Node | null;
    if (target && this.elementRef.nativeElement.contains(target)) return;
    this.closePicker();
  }

  protected onEscape(): void {
    if (this.isOpen$$()) this.closePicker();
  }

  protected currentLabel(): string {
    return this.items().find((item) => item.value === this.value())?.label ?? '';
  }

  protected windowHeightPx(): number {
    return this.visibleRows() * ROW_HEIGHT_PX;
  }

  protected rowPaddingPx(): number {
    return (this.windowHeightPx() - ROW_HEIGHT_PX) / 2;
  }

  protected togglePicker(): void {
    if (this.isDisabled()) return;
    if (this.isOpen$$()) {
      this.closePicker();
      return;
    }
    this.openPicker();
  }

  protected isRowPending(index: number): boolean {
    const pendingIndex = this.pendingIndex$$();
    if (pendingIndex !== null) return index === pendingIndex;
    return this.items()[index]?.value === this.value();
  }

  protected selectRow(item: WheelSelectItem): void {
    this.value.set(item.value);
    this.closePicker();
  }

  protected onScroll(): void {
    const scrollEl = this.scrollElem()?.nativeElement;
    if (!scrollEl) return;

    const items = this.items();
    const index = clamp(Math.round(scrollEl.scrollTop / ROW_HEIGHT_PX), 0, items.length - 1);
    this.pendingIndex$$.set(index);
  }

  private openPicker(): void {
    const triggerRect = this.elementRef.nativeElement.getBoundingClientRect();
    const windowHeight = this.windowHeightPx();
    const containingBlockRect = this.getFixedContainingBlockRect();
    const offsetTop = containingBlockRect?.top ?? 0;
    const offsetLeft = containingBlockRect?.left ?? 0;

    const idealTop = triggerRect.top + triggerRect.height / 2 - windowHeight / 2;
    const maxTop = Math.max(VIEWPORT_MARGIN_PX, window.innerHeight - windowHeight - VIEWPORT_MARGIN_PX);
    this.overlayTop$$.set(clamp(idealTop, VIEWPORT_MARGIN_PX, maxTop) - offsetTop);

    const idealLeft = triggerRect.left + triggerRect.width / 2 - OVERLAY_WIDTH_PX / 2;
    const maxLeft = Math.max(VIEWPORT_MARGIN_PX, window.innerWidth - OVERLAY_WIDTH_PX - VIEWPORT_MARGIN_PX);
    this.overlayLeft$$.set(clamp(idealLeft, VIEWPORT_MARGIN_PX, maxLeft) - offsetLeft);

    const currentIndex = Math.max(
      0,
      this.items().findIndex((item) => item.value === this.value()),
    );
    this.pendingIndex$$.set(currentIndex);
    this.isOpen$$.set(true);

    setTimeout(() => {
      const scrollEl = this.scrollElem()?.nativeElement;
      if (scrollEl) scrollEl.scrollTop = currentIndex * ROW_HEIGHT_PX;
    });
  }

  private getFixedContainingBlockRect(): DOMRect | null {
    let el = this.elementRef.nativeElement.parentElement;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      if (style.transform !== 'none' || style.filter !== 'none' || style.perspective !== 'none') {
        return el.getBoundingClientRect();
      }
      el = el.parentElement;
    }
    return null;
  }

  private closePicker(): void {
    this.isOpen$$.set(false);
    this.pendingIndex$$.set(null);
  }
}
