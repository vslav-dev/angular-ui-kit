import { Component, computed, effect, input, model, untracked } from '@angular/core';
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
  imports: [VWheelSelect],
})
export class VWheelInput {
  public readonly segments = input.required<WheelInputSegment[]>();
  public readonly isDisabled = input<boolean>(false);

  public readonly values = model<Record<string, string>>({});

  protected readonly segmentItems$$ = computed(() => {
    const values = this.values();
    const map = new Map<string, WheelSelectItem[]>();
    for (const segment of this.segments()) {
      map.set(segment.id, segment.getItems(values));
    }
    return map;
  });

  private readonly clampOutOfRangeValuesEffect = effect(() => {
    const values = this.values();
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
      untracked(() => this.values.set(corrected));
    }
  });

  protected itemsFor(segmentId: string): WheelSelectItem[] {
    return this.segmentItems$$().get(segmentId) ?? [];
  }

  protected valueFor(segmentId: string): string {
    return this.values()[segmentId] ?? '';
  }

  protected onSegmentValueChange(segmentId: string, value: string): void {
    this.values.set({ ...this.values(), [segmentId]: value });
  }
}
