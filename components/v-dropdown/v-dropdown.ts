import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
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

@Component({
  selector: 'v-dropdown',
  templateUrl: './v-dropdown.html',
  styleUrl: './v-dropdown.css',
  host: {
    '[style.--v-dropdown-z-index]': 'zIndex$$()',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VDropdown),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [VInput, VIcon, ReactiveFormsModule],
})
export class VDropdown implements ControlValueAccessor, OnInit, OnDestroy {
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

  public readonly onSelectionChanged = output<DropdownItem | null>();

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

  protected readonly value$$ = signal('');
  protected readonly selectedValue$$ = signal('');
  protected readonly isOpen$$ = signal(false);
  protected readonly filteredItems$$ = signal<DropdownItem[]>([]);
  protected readonly validationError$$ = signal('');
  protected readonly dropdownWidth$$ = signal(0);
  protected readonly dropdownFixedTop$$ = signal(0);
  protected readonly dropdownFixedLeft$$ = signal<number | null>(null);
  protected readonly dropdownFixedRight$$ = signal<number | null>(null);
  protected readonly zIndex$$ = signal(100);
  protected readonly internalForm = new FormGroup({
    search: new FormControl(''),
  });

  private onChange = (value: string) => {};
  private onTouched = () => {};
  private layerController?: LayerController;

  private readonly elementRef = inject(ElementRef);
  private readonly zLayerService = inject(ZLayerService);
  private readonly parentLayerId = inject(PARENT_LAYER_ID, { optional: true }) ?? undefined;

  constructor() {
    this.internalForm.get('search')?.valueChanges.subscribe((value) => {
      this.value$$.set(value || '');

      if (this.isSelectMode$$()) {
        this.updateFilteredItems();
        return;
      }

      this.selectedValue$$.set('');
      this.onChange(this.value$$());
      this.updateFilteredItems();
      this.isOpen$$.set(true);
    });
  }

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

  protected readonly dropdownListStyles$$ = computed(() => {
    const styles: { [key: string]: string } = {};
    const dropdownWidth = this.dropdownWidth$$();

    if (dropdownWidth > 0) {
      styles['width'] = `${dropdownWidth}px`;
    } else if (this.minDropdownWidth()) {
      styles['min-width'] = this.minDropdownWidth();
    }

    const top = this.dropdownFixedTop$$();
    if (top > 0) {
      styles['top'] = `${top}px`;
    }

    const left = this.dropdownFixedLeft$$();
    if (left !== null) {
      styles['left'] = `${left}px`;
    }

    const right = this.dropdownFixedRight$$();
    if (right !== null) {
      styles['right'] = `${right}px`;
    }

    return styles;
  });

  protected readonly iconRotationStyle = (item: DropdownItem | null): { transform: string } | null => {
    if (!item?.iconRotationDeg) {
      return null;
    }

    return {
      transform: `rotate(${item.iconRotationDeg}deg)`,
    };
  };

  public writeValue(value: string | null): void {
    this.selectedValue$$.set(value || '');
    const resolvedValue = this.resolveDisplayValue(value || '');
    this.value$$.set(resolvedValue);
    this.internalForm.get('search')?.setValue(this.value$$(), { emitEvent: false });
    this.updateFilteredItems();
    this.validateInput();
  }

  public registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {}

  protected onFocus(): void {
    this.isOpen$$.set(true);
    this.updateFilteredItems();
    this.setDropdownWidth();
  }

  protected onBlur(): void {
    setTimeout(() => {
      this.closeDropdown();
    }, 150);
  }

  protected selectItem(item: DropdownItem): void {
    this.selectedValue$$.set(item.value);
    this.value$$.set(item.label);
    this.validationError$$.set('');
    this.internalForm.get('search')?.setValue(this.value$$(), { emitEvent: false });
    this.onChange(item.value);
    this.onSelectionChanged.emit(item);
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
    this.value$$.set('');
    this.validationError$$.set('');
    this.internalForm.get('search')?.setValue('', { emitEvent: false });
    this.onChange('');
    this.onSelectionChanged.emit(null);
    this.updateFilteredItems();
  }

  protected closeDropdown(): void {
    this.isOpen$$.set(false);
    this.validateInput();
    this.onTouched();
  }

  private updateFilteredItems(): void {
    if (this.isSelectMode$$() || !this.value$$().trim()) {
      this.filteredItems$$.set(this.items());
    } else {
      this.filteredItems$$.set(
        this.items().filter((item) => item.label.toLowerCase().includes(this.value$$().toLowerCase())),
      );
    }
  }

  private resolveDisplayValue(value: string): string {
    if (!value) return '';
    const matched = this.items().find((item) => item.value === value);
    return matched ? matched.label : value;
  }

  protected getSelectInputSize(): number {
    const displayValue = this.value$$().trim();
    const placeholder = this.placeholder().trim();
    const textLength = Math.max(displayValue.length, placeholder.length, 12);

    return textLength + 2;
  }

  private validateInput(): void {
    if (!this.isRequired() || !this.value$$().trim()) {
      this.validationError$$.set('');
      return;
    }

    const exactMatch = this.items().find((item) => item.label.toLowerCase() === this.value$$().toLowerCase());

    if (!exactMatch) {
      this.validationError$$.set('Please select a valid option from the list');
    } else {
      this.validationError$$.set('');
    }
  }

  private setDropdownWidth(): void {
    if (!this.elementRef?.nativeElement) {
      return;
    }

    setTimeout(() => {
      const hostElement = this.elementRef.nativeElement;
      const hostRect = hostElement.getBoundingClientRect();
      const cbRect = this.getFixedContainingBlockRect();

      const offsetTop = cbRect ? cbRect.top : 0;
      const offsetLeft = cbRect ? cbRect.left : 0;
      const offsetRight = cbRect ? cbRect.right : window.innerWidth;

      const minWidthValue = this.minDropdownWidth() ? parseInt(this.minDropdownWidth().replace(/[^\d]/g, '')) || 0 : 0;
      this.dropdownWidth$$.set(Math.max(hostRect.width, minWidthValue));
      this.dropdownFixedTop$$.set(hostRect.bottom - offsetTop);
      if (this.expandDirection() === ddExpandDirection.Left) {
        this.dropdownFixedLeft$$.set(null);
        this.dropdownFixedRight$$.set(offsetRight - hostRect.right);
      } else {
        this.dropdownFixedLeft$$.set(hostRect.left - offsetLeft);
        this.dropdownFixedRight$$.set(null);
      }
    }, 0);
  }

  private getFixedContainingBlockRect(): DOMRect | null {
    let el = this.elementRef.nativeElement.parentElement as HTMLElement | null;
    while (el && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      if (style.transform !== 'none' || style.filter !== 'none' || style.perspective !== 'none') {
        return el.getBoundingClientRect();
      }
      el = el.parentElement;
    }
    return null;
  }

  private registerLayer(): void {
    this.layerController = this.zLayerService.registerLayer('dropdown', this.parentLayerId);
    this.zIndex$$.set(this.layerController.zIndex);
  }
}
