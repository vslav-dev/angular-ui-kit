# V-Dropdown

Searchable dropdown with automatic filtering. Two-way `value` model, no form directives. Uses flat design and supports dark theme.

## Basic Usage

```html
<v-dropdown
  label="Select Item"
  placeholder="Search..."
  [items]="items"
/>
```

## Data Format

```typescript
interface DropdownItem {
  value: string;  // model value
  label: string;  // display text
}
```

## Properties

```ts
value: string | null = ''  // model: the chosen item's value; in search mode, the typed text while nothing is chosen
mode: 'search' | 'select' = 'search'
label: string = ''
labelRight: string = ''
placeholder: string = ''
items: DropdownItem[] = []
isDisabled: boolean = false
isRequired: boolean = false
errorMessage: string = ''
minDropdownWidth: string = ''
expandDirection: 'left' | 'right' = 'left'
```

## Events

- `selectionChangedOutput: DropdownItem | null`

## Examples

```html
<!-- With a signal -->
<v-dropdown
  label="Food Type"
  placeholder="Search food..."
  [(value)]="foodId"
  [items]="items"
  (selectionChangedOutput)="onSelect($event)"
/>

<!-- Right-aligned -->
<v-dropdown
  placeholder="Quick select"
  [items]="options"
  [expandDirection]="'right'"
/>

<!-- Select-only mode -->
<v-dropdown
  placeholder="Sort"
  [items]="options"
  [mode]="'select'"
/>

<!-- Disabled state -->
<v-dropdown
  label="Loading..."
  [items]="[]"
  [isDisabled]="true"
/>

<!-- Custom min width -->
<v-dropdown
  label="Category"
  [items]="categories"
  [minDropdownWidth]="'250px'"
  [(value)]="categoryId"
/>
```
