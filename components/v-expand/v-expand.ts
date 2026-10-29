import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { IconName, VIcon } from '@ui-kit/components/v-icon/v-icon';
import { CssUnitOrRawValue, resolveCssUnitOrRawValue } from '@ui-kit/types';
import { AccordionItemPosition } from './v-accordion';

@Component({
  selector: 'v-expand',
  templateUrl: './v-expand.html',
  styleUrl: './v-expand.css',
  imports: [VIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--v-expand-padding]': 'paddingString$$()',
    '[style.--v-expand-border-radius]': 'borderRadiusString$$()',
    '[style.--v-expand-animation-timing-function]': 'animationTimingFunction()',
    '[class.no-transition]': 'isWithoutAnimation()',
    '[class.accordion-item]': 'isInAccordion$$()',
    '[class.accordion-first]': 'accordionPosition$$()?.isFirst',
    '[class.accordion-last]': 'accordionPosition$$()?.isLast',
    '[class.accordion-middle]': 'isAccordionMiddle$$()',
    '[class.collapsed]': '!isPanelExpanded$$()',
  },
})
export class VExpand {
  protected readonly Icon = IconName;

  public readonly isExpanded = input<boolean>(false);
  public readonly isWithoutAnimation = input<boolean>(false);
  public readonly isChevronVisible = input<boolean>(false);
  public readonly padding = input<CssUnitOrRawValue>(2);
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly animationTimingFunction = input<'ease-in-out' | 'linear' | 'ease' | 'ease-in' | 'ease-out'>(
    'ease-in-out',
  );

  public readonly openedOutput = output<CustomEvent<boolean>>();

  protected readonly accordionPosition$$ = signal<AccordionItemPosition | null>(null);

  protected readonly isInAccordion$$ = computed(() => this.accordionPosition$$() !== null);

  protected readonly isAccordionMiddle$$ = computed(() => {
    const pos = this.accordionPosition$$();
    return pos !== null && !pos.isFirst && !pos.isLast;
  });

  protected readonly isPanelExpanded$$ = computed(() => {
    const accordionPos = this.accordionPosition$$();
    if (accordionPos) {
      return accordionPos.isOpen();
    }
    return this._isExpanded$$();
  });

  public readonly paddingString$$ = computed(() => resolveCssUnitOrRawValue(this.padding()));

  public readonly borderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.borderRadius()));

  private readonly _isExpanded$$ = signal(false);

  private readonly onExpandedChangeEmitEffect$$ = effect(() => {
    if (!this.isInAccordion$$()) {
      const current = this._isExpanded$$();
      this.openedOutput.emit(new CustomEvent('opened', { detail: current }));
    }
  });

  private readonly syncIsExpandedEffect$$ = effect(() => {
    const external = this.isExpanded();
    this._isExpanded$$.set(external);
  });

  public setExpanded(state: boolean): void {
    const accordionPos = this.accordionPosition$$();

    if (accordionPos) {
      const currentState = accordionPos.isOpen();
      if (currentState !== state) {
        accordionPos.toggle();
      }
    } else {
      this._isExpanded$$.set(state);
    }
  }

  public isPanelExpanded(): boolean {
    return this.isPanelExpanded$$();
  }

  protected toggle(): void {
    const accordionPos = this.accordionPosition$$();
    if (accordionPos) {
      accordionPos.toggle();
    } else {
      this._isExpanded$$.set(!this._isExpanded$$());
    }
  }

  public registerInAccordion(position: AccordionItemPosition): void {
    this.accordionPosition$$.set(position);
  }

  public notifyStateChange(isOpen: boolean): void {
    this.openedOutput.emit(new CustomEvent('opened', { detail: isOpen }));
  }
}
