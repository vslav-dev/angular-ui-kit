import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconName, VIcon } from '@ui-kit/components/v-icon/v-icon';

@Component({
  selector: 'v-chip',
  templateUrl: './v-chip.html',
  styleUrl: './v-chip.css',
  imports: [VIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.disabled]': 'isDisabled()',
  },
})
export class VChip {
  public readonly isRemovable = input<boolean>(true);
  public readonly isDisabled = input<boolean>(false);

  public readonly onRemove = output<void>();

  protected readonly Icon = IconName;

  protected onChipClick(): void {
    if (this.isDisabled() || !this.isRemovable()) return;
    this.onRemove.emit();
  }
}
