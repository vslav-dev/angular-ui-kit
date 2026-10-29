# V-Toggle

Segmented toggle control built on top of the card and button styles. Supports single or multiple selection and stretches items to the full width.

## Basic Usage

```html
<v-toggle
  [items]="sizeOptions"
  [value]="selected"
  (valueChange)="selected = $event"></v-toggle>
```

## Multiple Selection

```html
<v-toggle
  [items]="filters"
  [isMultiple]="true"
  [value]="selectedFilters"
  (valueChange)="selectedFilters = $event"></v-toggle>
```

## Properties

```ts
interface VToggleItem {
  id: string;
  label: string;
  isDisabled?: boolean;
}
```

```ts
items: VToggleItem[] = []
isMultiple: boolean = false
isDisabled: boolean = false
fitContent: boolean = false
borderRadius: CssUnitOrRawValue = 2
padding: CssUnitOrRawValue = 1
gap: CssUnitOrRawValue = 1
activeSurface: ButtonSurface = 'default'
inactiveSurface: ButtonSurface = 'flat'
activeColorClass: string = 'v-primary'
inactiveColorClass: string = ''
```

## Events

- `valueChange: string[]`
- `changedOutput: string[]`
