import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { IconName, VIcon } from '@ui-kit/components/v-icon/v-icon';
import { VInput } from '@ui-kit/components/v-input/v-input';
import { LayerController, PARENT_LAYER_ID, ZLayerService } from '@ui-kit/services/z-layer.service';

export const ddExpandDirection = {
  Left: 'left',
  Right: 'right',
} as const;

export type ddExpandDirection = (typeof ddExpandDirection)[keyof typeof ddExpandDirection];

export interface DropdownItem {
  value: string;
  label: string;
  rightLabel?: string;
  iconName?: IconName;
  iconRotationDeg?: number;
}

type DropdownItemWithIcon = DropdownItem & {
  iconName: IconName;
};

export const DropdownMode = {
  Search: 'search',
  Select: 'select',
} as const;

export type DropdownMode = (typeof DropdownMode)[keyof typeof DropdownMode];

let uniqueId = 0;

@Component({
  selector: 'v-dropdown',
  templateUrl: './v-dropdown.html',
  styleUrl: './v-dropdown.css',
  host: {
    '[style.--v-dropdown-z-index]': 'zIndex$$()',
    '[style.--v-dropdown-anchor]': 'anchorName',
    '[attr.expand-direction]': 'expandDirection()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VInput, VIcon],
})
export class VDropdown implements OnInit, OnDestroy {
  public readonly mode = input<DropdownMode>(DropdownMode.Search);
  public readonly label = input<string>('');
  public readonly labelRight = input<string>('');
  public readonly placeholder = input<string>('');
  public readonly items = input<DropdownItem[]>([]);
  public readonly isDisabled = input<boolean>(false);
  public readonly isRequired = input<boolean>(false);
  public readonly errorMessage = input<string>('');
  public readonly minDropdownWidth = input<string>('');
  public readonly expandDirection = input<ddExpandDirection>(ddExpandDirection.Left);

  // The chosen item's value; in search mode, the typed text while nothing is chosen.
  public readonly value = model<string | null>('');

  public readonly selectionChangedOutput = output<DropdownItem | null>();

  protected readonly inputComponent = viewChild.required<VInput>('inputComponent');
  protected readonly isSelectMode$$ = computed(() => this.mode() === DropdownMode.Select);
  protected readonly selectedItem$$ = computed(() => {
    const selectedValue = this.selectedValue$$();

    if (!selectedValue) {
      return null;
    }

    return this.items().find((item) => item.value === selectedValue) || null;
  });
  protected readonly selectedItemWithIcon$$ = computed<DropdownItemWithIcon | null>(() => {
    const selectedItem = this.selectedItem$$();

    if (!selectedItem?.iconName) {
      return null;
    }

    return selectedItem as DropdownItemWithIcon;
  });

  protected readonly displayText$$ = signal('');
  protected readonly selectedValue$$ = signal('');
  protected readonly isOpen$$ = signal(false);
  protected readonly filteredItems$$ = signal<DropdownItem[]>([]);
  protected readonly validationError$$ = signal('');
  protected readonly zIndex$$ = signal(100);
  // The list is position: fixed (escapes overflow clipping) and CSS-anchored to this name, so it follows the field through layout shifts.
  protected readonly anchorName = `--v-dropdown-anchor-${++uniqueId}`;

  // The last value this component has accounted for, either emitted by itself or taken from the model; a model change equal to it is an echo.
  private knownValue = '';
  private layerController?: LayerController;

  private readonly zLayerService = inject(ZLayerService);
  private readonly parentLayerId = inject(PARENT_LAYER_ID, { optional: true }) ?? undefined;

  private readonly syncFromModelEffect = effect(() => {
    const value = this.value() ?? '';
    untracked(() => {
      if (value === this.knownValue) return;
      this.knownValue = value;
      this.selectedValue$$.set(value);
      this.displayText$$.set(this.resolveDisplayValue(value));
      this.updateFilteredItems();
      this.validateInput();
    });
  });

  public ngOnInit(): void {
    this.registerLayer();
  }

  public ngOnDestroy(): void {
    this.layerController?.destroy();
  }

  protected readonly computedErrorMessage$$ = computed(() => {
    if (this.isOpen$$()) {
      return this.errorMessage();
    }
    return this.validationError$$() || this.errorMessage();
  });

  protected readonly iconRotationStyle = (item: DropdownItem | null): { transform: string } | null => {
    if (!item?.iconRotationDeg) {
      return null;
    }

    return {
      transform: `rotate(${item.iconRotationDeg}deg)`,
    };
  };

  protected onSearchInput(text: string): void {
    this.displayText$$.set(text);

    if (this.isSelectMode$$()) {
      this.updateFilteredItems();
      return;
    }

    this.selectedValue$$.set('');
    this.emitValue(text);
    this.updateFilteredItems();
    this.isOpen$$.set(true);
  }

  protected onFocus(): void {
    this.isOpen$$.set(true);
    this.updateFilteredItems();
  }

  protected onBlur(): void {
    setTimeout(() => {
      this.closeDropdown();
    }, 150);
  }

  protected selectItem(item: DropdownItem): void {
    this.selectedValue$$.set(item.value);
    this.displayText$$.set(item.label);
    this.validationError$$.set('');
    this.emitValue(item.value);
    this.selectionChangedOutput.emit(item);
    this.isOpen$$.set(false);
    const inputComp = this.inputComponent();
    if (inputComp) {
      const element = inputComp.inputElement();
      if (element) {
        element.nativeElement.blur();
      }
    }
  }

  protected clearInput(): void {
    if (this.isSelectMode$$()) {
      return;
    }

    this.selectedValue$$.set('');
    this.displayText$$.set('');
    this.validationError$$.set('');
    this.emitValue('');
    this.selectionChangedOutput.emit(null);
    this.updateFilteredItems();
  }

  protected closeDropdown(): void {
    this.isOpen$$.set(false);
    this.validateInput();
  }

  private emitValue(value: string): void {
    this.knownValue = value;
    this.value.set(value);
  }

  private updateFilteredItems(): void {
    if (this.isSelectMode$$() || !this.displayText$$().trim()) {
      this.filteredItems$$.set(this.items());
    } else {
      this.filteredItems$$.set(
        this.items().filter((item) => item.label.toLowerCase().includes(this.displayText$$().toLowerCase())),
      );
    }
  }

  private resolveDisplayValue(value: string): string {
    if (!value) return '';
    const matched = this.items().find((item) => item.value === value);
    return matched ? matched.label : value;
  }

  protected getSelectInputSize(): number {
    const displayValue = this.displayText$$().trim();
    const placeholder = this.placeholder().trim();
    const textLength = Math.max(displayValue.length, placeholder.length, 12);

    return textLength + 2;
  }

  private validateInput(): void {
    if (!this.isRequired() || !this.displayText$$().trim()) {
      this.validationError$$.set('');
      return;
    }

    const exactMatch = this.items().find((item) => item.label.toLowerCase() === this.displayText$$().toLowerCase());

    if (!exactMatch) {
      this.validationError$$.set('Please select a valid option from the list');
    } else {
      this.validationError$$.set('');
    }
  }

  private registerLayer(): void {
    this.layerController = this.zLayerService.registerLayer('dropdown', this.parentLayerId);
    this.zIndex$$.set(this.layerController.zIndex);
  }
}
