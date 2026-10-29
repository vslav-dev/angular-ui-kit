import { Component, computed, input, model } from '@angular/core';
import { VWheelInput, WheelInputSegment } from '@ui-kit/components/v-wheel-input/v-wheel-input';
import { WheelSelectItem } from '@ui-kit/components/v-wheel-select/v-wheel-select';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function isoToParts(iso: string): Record<string, string> {
  const [year, month, day] = (iso || '').split('-');
  const now = new Date();
  return {
    year: year || String(now.getFullYear()),
    month: month || String(now.getMonth() + 1).padStart(2, '0'),
    day: day || String(now.getDate()).padStart(2, '0'),
  };
}

function partsToIso(values: Record<string, string>): string {
  const now = new Date();
  const year = values['year'] || String(now.getFullYear());
  const month = values['month'] || String(now.getMonth() + 1).padStart(2, '0');
  const day = values['day'] || String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'v-date-wheel-input',
  templateUrl: './v-date-wheel-input.html',
  imports: [VWheelInput],
})
export class VDateWheelInput {
  public readonly isDisabled = input<boolean>(false);
  public readonly yearRange = input<number>(100);

  // ISO date (YYYY-MM-DD); empty shows today's parts without changing the value until the user picks something.
  public readonly value = model<string>('');

  protected readonly segmentValues$$ = computed(() => isoToParts(this.value()));

  protected readonly segments$$ = computed<WheelInputSegment[]>(() => {
    const range = this.yearRange();
    const currentYear = new Date().getFullYear();

    return [
      {
        id: 'day',
        separatorAfter: '.',
        getItems: (values: Record<string, string>): WheelSelectItem[] => {
          const month = Number(values['month']) || 1;
          const year = Number(values['year']) || currentYear;
          const total = daysInMonth(month, year);
          return Array.from({ length: total }, (_, i) => {
            const day = String(i + 1).padStart(2, '0');
            return { value: day, label: day };
          });
        },
      },
      {
        id: 'month',
        separatorAfter: '.',
        getItems: (): WheelSelectItem[] =>
          MONTH_LABELS.map((label, i) => ({ value: String(i + 1).padStart(2, '0'), label })),
      },
      {
        id: 'year',
        getItems: (): WheelSelectItem[] => {
          const items: WheelSelectItem[] = [];
          for (let year = currentYear - range; year <= currentYear + range; year++) {
            items.push({ value: String(year), label: String(year) });
          }
          return items;
        },
      },
    ];
  });

  protected onSegmentValuesChange(values: Record<string, string>): void {
    this.value.set(partsToIso(values));
  }
}
