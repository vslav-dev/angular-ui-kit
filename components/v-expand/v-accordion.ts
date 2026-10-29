import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { AccordionGroupService } from '@ui-kit/services/accordion-group.service';
import { VExpand } from './v-expand';

export interface AccordionItemPosition {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isOpen: () => boolean;
  toggle: () => void;
}

@Component({
  selector: 'v-accordion',
  template: '<ng-content />',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'v-accordion-group',
    style: 'display: block;',
  },
})
export class VAccordion implements OnInit, OnDestroy {
  public readonly groupId = input<string>();
  public readonly multiple = input<boolean>(false);

  public readonly items = contentChildren(VExpand, { descendants: false });

  private readonly accordionGroupService = inject(AccordionGroupService);
  private readonly accordionId = crypto.randomUUID();

  private readonly openedIndices$$ = signal<Set<number>>(new Set());
  private readonly previousStates = new Map<number, boolean>();

  public ngOnInit(): void {
    const groupId = this.groupId();
    if (groupId) {
      this.accordionGroupService.registerGroup(groupId);
    }
  }

  public ngOnDestroy(): void {
    const groupId = this.groupId();
    if (groupId) {
      this.accordionGroupService.unregisterGroup(groupId);
    }
  }

  private readonly itemsChangeEffect$$ = effect(() => {
    const items = this.items();
    if (items.length > 0) {
      this.updatePositions();
    }
  });

  private readonly groupStateChangeEffect$$ = effect(() => {
    const groupId = this.groupId();
    if (!groupId) return;

    this.accordionGroupService.groups$$();

    const itemsArray = this.items();
    itemsArray.forEach((item, index) => {
      const currentState = this.accordionGroupService.isOpen(groupId, this.accordionId, index);
      const previousState = this.previousStates.get(index);

      if (previousState !== currentState) {
        this.previousStates.set(index, currentState);
        item.notifyStateChange(currentState);
      }
    });
  });

  private updatePositions(): void {
    const itemsArray = this.items();
    const totalItems = itemsArray.length;
    const groupId = this.groupId();

    itemsArray.forEach((item, index) => {
      const position: AccordionItemPosition = {
        index,
        isFirst: index === 0,
        isLast: index === totalItems - 1,
        isOpen: () => {
          if (groupId) {
            return this.accordionGroupService.isOpen(groupId, this.accordionId, index);
          }
          return this.openedIndices$$().has(index);
        },
        toggle: () => this.toggle(index),
      };

      item.registerInAccordion(position);
    });
  }

  private toggle(index: number): void {
    const groupId = this.groupId();
    const item = this.items()[index];

    if (groupId) {
      this.accordionGroupService.toggle(groupId, this.accordionId, index);
      const newState = this.accordionGroupService.isOpen(groupId, this.accordionId, index);
      this.previousStates.set(index, newState);
      item.notifyStateChange(newState);
    } else {
      const opened = new Set(this.openedIndices$$());

      if (this.multiple()) {
        if (opened.has(index)) {
          opened.delete(index);
        } else {
          opened.add(index);
        }
      } else {
        if (opened.has(index)) {
          opened.clear();
        } else {
          opened.clear();
          opened.add(index);
        }
      }

      this.openedIndices$$.set(opened);
      item.notifyStateChange(opened.has(index));
    }
  }
}
