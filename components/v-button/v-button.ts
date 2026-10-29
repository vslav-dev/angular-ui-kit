import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  Renderer2,
} from '@angular/core';
import { CssUnitOrRawValue, resolveCssUnitOrRawValue } from '@ui-kit/types';

type ButtonType = 'button' | 'submit' | 'reset';

export const ButtonSurface = {
  Default: 'default',
  Flat: 'flat',
  Raised: 'raised',
  Inset: 'inset',
  Link: 'link',
  Hover: 'hover',
} as const;

export type ButtonSurface = (typeof ButtonSurface)[keyof typeof ButtonSurface];

@Component({
  selector: 'v-button',
  templateUrl: './v-button.html',
  styleUrl: './v-button.css',
  host: {
    '[style.width]': 'width() || null',
    '[style.--v-button-border-radius]': 'borderRadiusString$$()',
    '[style.--v-button-bg-opacity]': 'bgOpacity()',
    '[style.--v-button-padding-y]': 'paddingYString$$()',
    '[style.--v-button-padding-x]': 'paddingXString$$()',
    '[style.--v-button-gap]': 'gapString$$()',
    '[style.--v-color-primary]': 'color() || null',
    '[class.v-flat]': 'surface() === "flat"',
    '[class.v-raised]': 'surface() === "raised"',
    '[class.v-inset]': 'surface() === "inset"',
    '[class.v-link]': 'surface() === "link"',
    '[class.v-hover]': 'surface() === "hover"',
    '[class.v-link-static]': 'isLinkStatic()',
    '[attr.text-align]': 'textAlign() || null',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : "false"',
  },
})
export class VButton {
  public readonly type = input<ButtonType>('button');
  public readonly isDisabled = input<boolean>(false);
  public readonly isLabelHidden = input<boolean>(false);
  public readonly width = input<string>();
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly padding = input<CssUnitOrRawValue>();
  public readonly paddingX = input<CssUnitOrRawValue>();
  public readonly paddingY = input<CssUnitOrRawValue>();
  public readonly gap = input<CssUnitOrRawValue>(2);
  public readonly surface = input<ButtonSurface>(ButtonSurface.Default);
  public readonly isLinkStatic = input<boolean>(false);
  public readonly bgOpacity = input<number>(1);
  public readonly textAlign = input<'left' | 'center' | 'right'>();
  public readonly color = input<string>();
  public readonly tabindex = input<number | string | undefined>(undefined);

  protected readonly clickOutput = output<MouseEvent>();

  protected readonly paddingX$$ = computed(() => this.paddingX() ?? this.padding() ?? 2);
  protected readonly paddingY$$ = computed(() => this.paddingY() ?? this.padding() ?? 2);

  protected readonly borderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.borderRadius()));
  protected readonly paddingYString$$ = computed(() => resolveCssUnitOrRawValue(this.paddingY$$()));
  protected readonly paddingXString$$ = computed(() => resolveCssUnitOrRawValue(this.paddingX$$()));
  protected readonly gapString$$ = computed(() => resolveCssUnitOrRawValue(this.gap()));

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  protected onButtonClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clickOutput.emit(event);
  }

  protected onPointerDown(event: PointerEvent): void {
    if (this.isDisabled() || this.isLink()) return;
    const button = event.currentTarget as HTMLElement | null;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.createRipple(button, x, y, size);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.isLink()) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const button = event.currentTarget as HTMLElement | null;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = rect.width / 2;
    const y = rect.height / 2;

    this.createRipple(button, x, y, size);
  }

  private isLink(): boolean {
    const element = this.elementRef.nativeElement;
    return element.classList.contains('v-link');
  }

  private createRipple(button: HTMLElement, x: number, y: number, size: number): void {
    const ripple = this.renderer.createElement('span') as HTMLElement;
    this.renderer.addClass(ripple, 'v-button-ripple');
    this.renderer.setStyle(ripple, 'width', `${size}px`);
    this.renderer.setStyle(ripple, 'height', `${size}px`);
    this.renderer.setStyle(ripple, 'left', `${x - size / 2}px`);
    this.renderer.setStyle(ripple, 'top', `${y - size / 2}px`);
    this.renderer.setStyle(ripple, 'animation-duration', `${size * 1.5}ms`);

    this.renderer.appendChild(button, ripple);

    ripple.addEventListener(
      'animationend',
      () => {
        this.renderer.removeChild(button, ripple);
      },
      { once: true },
    );
  }
}
