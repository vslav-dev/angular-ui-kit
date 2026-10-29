import { Service, signal } from '@angular/core';

interface GroupState {
  openedItemKey: string | null;
}

@Service()
export class AccordionGroupService {
  public readonly groups$$ = signal<Map<string, GroupState>>(new Map());

  public registerGroup(groupId: string): void {
    const groups = this.groups$$();
    if (!groups.has(groupId)) {
      groups.set(groupId, { openedItemKey: null });
      this.groups$$.set(new Map(groups));
    }
  }

  public unregisterGroup(groupId: string): void {
    const groups = this.groups$$();
    groups.delete(groupId);
    this.groups$$.set(new Map(groups));
  }

  public toggle(groupId: string, accordionId: string, itemIndex: number): void {
    const groups = this.groups$$();
    const group = groups.get(groupId);

    if (!group) return;

    const itemKey = `${accordionId}-${itemIndex}`;

    if (group.openedItemKey === itemKey) {
      group.openedItemKey = null;
    } else {
      group.openedItemKey = itemKey;
    }

    this.groups$$.set(new Map(groups));
  }

  public isOpen(groupId: string, accordionId: string, itemIndex: number): boolean {
    const groups = this.groups$$();
    const group = groups.get(groupId);

    if (!group) return false;

    const itemKey = `${accordionId}-${itemIndex}`;
    return group.openedItemKey === itemKey;
  }

  // True while any item in the group is expanded, regardless of which v-accordion instance
  // (or item within it) owns it — groups are single-open-item-at-a-time, so this is just
  // "is the group's opened key set". Lets consumers react to "something is expanded" without
  // duplicating per-item bookkeeping the group already tracks.
  public isAnyOpen(groupId: string): boolean {
    const group = this.groups$$().get(groupId);
    return !!group && group.openedItemKey !== null;
  }

  public closeAll(groupId: string): void {
    const groups = this.groups$$();
    const group = groups.get(groupId);

    if (!group) return;

    group.openedItemKey = null;
    this.groups$$.set(new Map(groups));
  }
}
