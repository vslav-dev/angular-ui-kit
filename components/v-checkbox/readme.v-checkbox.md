# V-Checkbox

Flat design checkbox with optional switch mode and smooth animations. Supports dark theme.

## Basic Usage

```html
<v-checkbox
  [value]="value"
  (valueChange)="value = $event">
  Receive updates
</v-checkbox>
```

## Switch Mode

```html
<v-checkbox
  mode="switch"
  [value]="enabled"
  (valueChange)="enabled = $event">
  Enable notifications
</v-checkbox>
```

## Properties

```ts
mode: VCheckboxMode = 'checkbox'
isDisabled: boolean = false
labelPosition: VCheckboxLabelPosition = 'right'
size: CssUnitOrRawValue = 6
borderRadius: CssUnitOrRawValue = 2
gap: CssUnitOrRawValue = 2
checkIconSize: CssUnitOrRawValue = 5
switchWidth: CssUnitOrRawValue = 14
switchHeight: CssUnitOrRawValue = 7
switchPadding: CssUnitOrRawValue = 1
thumbSize: CssUnitOrRawValue = 5
```

## Events

- `valueChange: boolean`
- `changedOutput: boolean`
