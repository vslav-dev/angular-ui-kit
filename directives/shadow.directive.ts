import { Directive, ElementRef, OnInit, Renderer2, inject, input } from '@angular/core';

@Directive({
  selector: '[outer-shadow]',
})
export class OuterShadowDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public ngOnInit() {
    const element = this.el.nativeElement;

    this.renderer.setStyle(element, 'border', '1px solid var(--v-color-border-subtle)');
  }
}

@Directive({
  selector: '[outer-shadow-rounded]',
})
export class OuterShadowRoundedDirective implements OnInit {
  readonly shadowBorderRadius = input<number>(2);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public ngOnInit() {
    const element = this.el.nativeElement;

    this.renderer.setStyle(element, 'border', '1px solid var(--v-color-border-subtle)');
    this.renderer.setStyle(element, 'border-radius', `var(--unit-${this.shadowBorderRadius()})`);
    this.renderer.setStyle(element, 'background', 'var(--v-color-surface)');
  }
}

@Directive({
  selector: '[inner-shadow]',
})
export class InnerShadowDirective implements OnInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public ngOnInit() {
    const element = this.el.nativeElement;

    this.renderer.setStyle(element, 'border', '1px solid var(--v-color-border-subtle)');
  }
}

@Directive({
  selector: '[inner-shadow-rounded]',
})
export class InnerShadowRoundedDirective implements OnInit {
  readonly shadowBorderRadius = input<number>(2);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  public ngOnInit() {
    const element = this.el.nativeElement;

    this.renderer.setStyle(element, 'border', '1px solid var(--v-color-border-subtle)');
    this.renderer.setStyle(element, 'border-radius', `var(--unit-${this.shadowBorderRadius()})`);
    this.renderer.setStyle(element, 'background', 'var(--v-color-surface)');
  }
}
