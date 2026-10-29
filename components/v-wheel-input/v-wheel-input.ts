import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { VWheelSelect, WheelSelectItem } from '@ui-kit/components/v-wheel-select/v-wheel-select';

export interface WheelInputSegment {
  id: string;
  getItems: (values: Record<string, string>) => WheelSelectItem[];
  separatorAfter?: string;
}

@Component({
  selector: 'v-wheel-input',
  templateUrl: './v-wheel-input.html',
  styleUrl: './v-wheel-input.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VWheelInput),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VWheelSelect],
})
export class VWheelInput implements ControlValueAccessor {
  public readonly segments = input.required<WheelInputSegment[]>();
  public readonly isDisabled = input<boolean>(false);

  protected readonly values$$ = signal<Record<string, string>>({});

  protected readonly segmentItems$$ = computed(() => {
    const values = this.values$$();
    const map = new Map<string, WheelSelectItem[]>();
    for (const segment of this.segments()) {
      map.set(segment.id, segment.getItems(values));
    }
    return map;
  });

  private onChange = (value: Record<string, string>) => {};
  private onTouched = () => {};

  private readonly clampOutOfRangeValuesEffect = effect(() => {
    const values = this.values$$();
    const itemsBySegment = this.segmentItems$$();

    const corrected = { ...values };
    let hasChanges = false;

    for (const segment of this.segments()) {
      const items = itemsBySegment.get(segment.id);
      if (!items?.length) continue;
      if (!corrected[segment.id]) continue;
      if (items.some((item) => item.value === corrected[segment.id])) continue;

      corrected[segment.id] = items[items.length - 1].value;
      hasChanges = true;
    }

    if (hasChanges) {
      untracked(() => this.setValues(corrected));
    }
  });

  public writeValue(value: Record<string, string> | null): void {
    this.values$$.set(value ?? {});
  }

  public registerOnChange(fn: (value: Record<string, string>) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(): void {}

  protected itemsFor(segmentId: string): WheelSelectItem[] {
    return this.segmentItems$$().get(segmentId) ?? [];
  }

  protected valueFor(segmentId: string): string {
    return this.values$$()[segmentId] ?? '';
  }

  protected onSegmentValueChange(segmentId: string, value: string): void {
    this.setValues({ ...this.values$$(), [segmentId]: value });
  }

  private setValues(values: Record<string, string>): void {
    this.values$$.set(values);
    this.onChange(values);
    this.onTouched();
  }
}
