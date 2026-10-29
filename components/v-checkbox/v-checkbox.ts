import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { IconName, VIcon } from '@ui-kit/components/v-icon/v-icon';
import { CssUnitOrRawValue, resolveCssUnitOrRawValue } from '@ui-kit/types';

export const VCheckboxMode = {
  Checkbox: 'checkbox',
  Switch: 'switch',
} as const;

export type VCheckboxMode = (typeof VCheckboxMode)[keyof typeof VCheckboxMode];

export const VCheckboxLabelPosition = {
  Left: 'left',
  Right: 'right',
} as const;

export type VCheckboxLabelPosition = (typeof VCheckboxLabelPosition)[keyof typeof VCheckboxLabelPosition];

@Component({
  selector: 'v-checkbox',
  templateUrl: './v-checkbox.html',
  styleUrl: './v-checkbox.css',
  imports: [VIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.checked]': 'value()',
    '[class.disabled]': 'isDisabled()',
    '[attr.mode]': 'mode()',
    '[attr.label-position]': 'labelPosition()',
    '[style.--v-checkbox-size]': 'sizeString$$()',
    '[style.--v-checkbox-border-radius]': 'borderRadiusString$$()',
    '[style.--v-checkbox-gap]': 'gapString$$()',
    '[style.--v-checkbox-check-size]': 'checkIconSizeString$$()',
    '[style.--v-checkbox-switch-width]': 'switchWidthString$$()',
    '[style.--v-checkbox-switch-height]': 'switchHeightString$$()',
    '[style.--v-checkbox-switch-padding]': 'switchPaddingString$$()',
    '[style.--v-checkbox-thumb-size]': 'thumbSizeString$$()',
  },
})
export class VCheckbox {
  public readonly mode = input<VCheckboxMode>(VCheckboxMode.Checkbox);
  public readonly isDisabled = input<boolean>(false);
  public readonly labelPosition = input<VCheckboxLabelPosition>(VCheckboxLabelPosition.Right);
  public readonly size = input<CssUnitOrRawValue>(6);
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly gap = input<CssUnitOrRawValue>(2);
  public readonly checkIconSize = input<CssUnitOrRawValue>(5);
  public readonly switchWidth = input<CssUnitOrRawValue>(14);
  public readonly switchHeight = input<CssUnitOrRawValue>(7);
  public readonly switchPadding = input<CssUnitOrRawValue>(1);
  public readonly thumbSize = input<CssUnitOrRawValue>(5);

  public readonly value = model<boolean>(false);
  public readonly onChanged = output<boolean>();

  protected readonly Icon = IconName;

  protected readonly isSwitch$$ = computed(() => this.mode() === VCheckboxMode.Switch);

  protected readonly sizeString$$ = computed(() => resolveCssUnitOrRawValue(this.size()));
  protected readonly borderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.borderRadius()));
  protected readonly gapString$$ = computed(() => resolveCssUnitOrRawValue(this.gap()));
  protected readonly checkIconSizeString$$ = computed(() => resolveCssUnitOrRawValue(this.checkIconSize()));
  protected readonly switchWidthString$$ = computed(() => resolveCssUnitOrRawValue(this.switchWidth()));
  protected readonly switchHeightString$$ = computed(() => resolveCssUnitOrRawValue(this.switchHeight()));
  protected readonly switchPaddingString$$ = computed(() => resolveCssUnitOrRawValue(this.switchPadding()));
  protected readonly thumbSizeString$$ = computed(() => resolveCssUnitOrRawValue(this.thumbSize()));

  protected onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (this.isDisabled()) {
      target.checked = this.value();
      return;
    }

    this.value.set(target.checked);
    this.onChanged.emit(target.checked);
  }
}
