import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { VButton } from '@ui-kit/components/v-button/v-button';
import { IconName, VIcon } from '@ui-kit/components/v-icon/v-icon';

export type VToastType = 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'v-toast',
  templateUrl: './v-toast.html',
  styleUrl: './v-toast.css',
  host: {
    '[attr.data-type]': 'type()',
    '(click)': 'close()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VButton, VIcon],
})
export class VToast {
  public readonly type = input.required<VToastType>();
  public readonly message = input.required<string>();
  public readonly isPending = input<boolean>(false);
  public readonly isCloseButtonVisible = input<boolean>(false);

  protected readonly closeOutput = output<void>();

  protected readonly icon$$ = computed(() => {
    if (this.isPending()) return IconName.Sync;

    switch (this.type()) {
      case 'success':
        return IconName.Check;
      case 'info':
        return IconName.Info;
      case 'error':
      case 'warning':
      default:
        return IconName.Warning;
    }
  });

  protected close(): void {
    this.closeOutput.emit();
  }

  protected onCloseButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    this.close();
  }
}
