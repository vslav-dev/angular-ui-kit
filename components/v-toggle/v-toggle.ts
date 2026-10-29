import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { ButtonSurface, VButton } from '@ui-kit/components/v-button/v-button';
import { VCard } from '@ui-kit/components/v-card/v-card';
import { CssUnitOrRawValue, resolveCssUnitOrRawValue } from '@ui-kit/types';

export interface VToggleItem {
  id: string;
  label: string;
  isDisabled?: boolean;
}

@Component({
  selector: 'v-toggle',
  templateUrl: './v-toggle.html',
  styleUrl: './v-toggle.css',
  imports: [VCard, VButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--v-toggle-gap]': 'gapString$$()',
    '[class.v-toggle-fit-host]': 'fitContent()',
  },
})
export class VToggle {
  public readonly items = input<VToggleItem[]>([]);
  public readonly isMultiple = input<boolean>(false);
  public readonly isDisabled = input<boolean>(false);
  public readonly fitContent = input<boolean>(false);
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly padding = input<CssUnitOrRawValue>(1);
  public readonly gap = input<CssUnitOrRawValue>(1);
  public readonly activeSurface = input<ButtonSurface>(ButtonSurface.Default);
  public readonly inactiveSurface = input<ButtonSurface>(ButtonSurface.Flat);
  public readonly activeColorClass = input<string>('v-primary');
  public readonly inactiveColorClass = input<string>('');

  public readonly value = model<string[]>([]);
  public readonly onChanged = output<string[]>();

  protected readonly gapString$$ = computed(() => resolveCssUnitOrRawValue(this.gap()));

  protected onToggleClick(item: VToggleItem): void {
    if (this.isItemDisabled(item)) return;

    const current = this.value();
    const isSelected = current.includes(item.id);
    let nextValue: string[];

    if (this.isMultiple()) {
      nextValue = isSelected ? current.filter((id) => id !== item.id) : [...current, item.id];
    } else {
      nextValue = isSelected ? [] : [item.id];
    }

    this.value.set(nextValue);
    this.onChanged.emit(nextValue);
  }

  protected isItemActive(item: VToggleItem): boolean {
    return this.value().includes(item.id);
  }

  protected isItemDisabled(item: VToggleItem): boolean {
    return this.isDisabled() || !!item.isDisabled;
  }

  protected getButtonSurface(item: VToggleItem): ButtonSurface {
    return this.isItemActive(item) ? this.activeSurface() : this.inactiveSurface();
  }

  protected getButtonColorClass(item: VToggleItem): string {
    return this.isItemActive(item) ? this.activeColorClass() : this.inactiveColorClass();
  }
}
