import { Directive, ElementRef, Inject, OnDestroy, Optional, computed, effect, input, output } from '@angular/core';
import { PARENT_LAYER_ID, ZLayerService } from '@ui-kit/services/z-layer.service';

@Directive({
  selector: '[vBackdrop]',
})
export class VBackdropDirective implements OnDestroy {
  public readonly isWithBackdrop = input<boolean>(false, { alias: 'vBackdrop' });
  public readonly backdropOpacity = input<number>(0.5);
  // false: the backdrop stays in place and still catches outside clicks, but is see-through.
  public readonly isDimmed = input<boolean>(true);

  public readonly backdropClick = output<void>();

  private readonly backdropColor$$ = computed(() => `rgba(0, 0, 0, ${this.isDimmed() ? this.backdropOpacity() : 0})`);

  private backdropElement: HTMLElement | null = null;
  private clickListener: ((event: Event) => void) | null = null;

  constructor(
    private readonly elementRef: ElementRef,
    @Optional()
    private readonly zLayerService?: ZLayerService,
    @Optional()
    @Inject(PARENT_LAYER_ID)
    private readonly parentLayerId?: string,
  ) {
    effect(() => {
      if (this.isWithBackdrop()) {
        this.showBackdrop();
      } else {
        this.hideBackdrop();
      }
    });

    effect(() => {
      const color = this.backdropColor$$();
      if (this.backdropElement) this.backdropElement.style.backgroundColor = color;
    });
  }

  public ngOnDestroy(): void {
    this.hideBackdrop();
  }

  private getBackdropZIndex(): number {
    if (this.parentLayerId && this.zLayerService) {
      return this.zLayerService.getBackdropZIndex(this.parentLayerId);
    }
    return 90; // fallback для случаев без z-layer сервиса
  }

  private showBackdrop(): void {
    if (this.backdropElement) {
      return;
    }

    this.backdropElement = document.createElement('div');
    this.backdropElement.style.position = 'fixed';
    this.backdropElement.style.top = '0';
    this.backdropElement.style.left = '0';
    this.backdropElement.style.width = '100vw';
    this.backdropElement.style.height = '100vh';
    this.backdropElement.style.backgroundColor = this.backdropColor$$();
    this.backdropElement.style.transition = 'background-color 0.15s';
    this.backdropElement.style.zIndex = this.getBackdropZIndex().toString();
    this.backdropElement.style.cursor = 'pointer';

    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      const hostElement = this.elementRef.nativeElement;

      if (!hostElement.contains(target)) {
        event.preventDefault();
        event.stopPropagation();
        this.backdropClick.emit();
      }
    };

    this.backdropElement.addEventListener('click', this.clickListener);

    document.body.appendChild(this.backdropElement);
  }

  private hideBackdrop(): void {
    if (this.backdropElement) {
      if (this.clickListener) {
        this.backdropElement.removeEventListener('click', this.clickListener);
        this.clickListener = null;
      }
      document.body.removeChild(this.backdropElement);
      this.backdropElement = null;
    }
  }
}
