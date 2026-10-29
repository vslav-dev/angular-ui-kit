# V-Chip

Removable pill/tag. The whole chip is the click target — there is no separate remove button to hit, only a close icon shown as an affordance.

## Basic Usage

```html
<v-chip (removeOutput)="removeItem(item.id)">{{ item.label }}</v-chip>
```

## Non-Removable (plain tag)

```html
<v-chip [isRemovable]="false">{{ item.label }}</v-chip>
```

## Properties

```ts
isRemovable: boolean = true
isDisabled: boolean = false
```

## Events

- `removeOutput: void` — emitted on click anywhere on the chip, unless `isDisabled` or `isRemovable` is `false`.
