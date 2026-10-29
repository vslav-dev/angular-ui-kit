import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input } from '@angular/core';

@Component({
  selector: 'ui-progress-icon',
  templateUrl: './progress-icon.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './progress-icon.component.scss',
})
export class UiProgressIcon {
  public readonly progressNum = input(0);
  public readonly diameter = input(40);
  public readonly strokeWidthCircle = input(4);
  public readonly strokeWidthPie = input(0);
  public readonly color = input('var(--v-color-text)');
  public readonly backgroundColor = input('var(--v-color-border-subtle)');

  private readonly elementRef = inject(ElementRef);

  protected readonly isCircle$$ = computed(() => {
    const element = this.elementRef.nativeElement;
    return !element.hasAttribute('pieStyle');
  });

  protected readonly isPie$$ = computed(() => {
    const element = this.elementRef.nativeElement;
    return element.hasAttribute('pieStyle');
  });

  protected readonly radius$$ = computed(() => (this.diameter() - this.strokeWidthCircle()) / 2);
  protected readonly circumference$$ = computed(() => 2 * Math.PI * this.radius$$());
  protected readonly clampedProgress$$ = computed(() => Math.max(0, Math.min(100, this.progressNum())));
  protected readonly progressRatio$$ = computed(() => this.clampedProgress$$() / 100);
  protected readonly dashoffset$$ = computed(() => this.circumference$$() * (1 - this.progressRatio$$()));
  protected readonly piePathData$$ = computed(() => this.buildPiePath(this.progressRatio$$()));

  private buildPiePath(progress: number): string {
    if (progress <= 0) {
      return '';
    }

    const diameter = this.diameter();
    const radius = this.radius$$();

    if (progress >= 1) {
      return `M ${diameter / 2} ${diameter / 2}
        m 0 -${radius}
        a ${radius} ${radius} 0 1 1 0 ${2 * radius}
        a ${radius} ${radius} 0 1 1 0 -${2 * radius}`;
    }

    const angle = progress * 2 * Math.PI;
    const x = diameter / 2 + radius * Math.sin(angle);
    const y = diameter / 2 - radius * Math.cos(angle);
    const largeArcFlag = progress > 0.5 ? 1 : 0;

    return `M ${diameter / 2} ${diameter / 2}
      L ${diameter / 2} ${diameter / 2 - radius}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}
      Z`;
  }
}
