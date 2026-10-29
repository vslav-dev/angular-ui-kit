# V-Button

Flat design button with a typed `surface` input plus color classes. Supports dark theme.

## Basic Usage

```html
<v-button class="v-primary">Primary</v-button>
<v-button class="v-danger">Danger</v-button>
<v-button surface="flat">Flat</v-button>
```

## Two Independent Axes

Surface (shape/elevation) and color are independent — combine any surface with any color class.

- `surface` (typed input, `ButtonSurface`) — `default` (no modifier), `flat`, `raised`, `inset`, `link`, `hover`
- `isLinkStatic` (boolean input) — with `surface="link"`, disables the underline/color-shift hover animation
- Color classes (still plain CSS classes, untyped): `v-primary`, `v-danger`, `v-accent`, or no color class for neutral

## Properties

```ts
type: 'button' | 'submit' | 'reset' = 'button'
isDisabled: boolean = false
isLabelHidden: boolean = false
width: string
borderRadius: CssUnitOrRawValue = 2
padding: CssUnitOrRawValue        // shorthand, fills paddingX/paddingY unless set
paddingX: CssUnitOrRawValue
paddingY: CssUnitOrRawValue
gap: CssUnitOrRawValue = 2
surface: ButtonSurface = 'default'
isLinkStatic: boolean = false
bgOpacity: number = 1              // 0..1
textAlign: 'left' | 'center' | 'right'
color: string
tabindex: number | string
```

## Events

- `clickOutput: MouseEvent`

## Examples

```html
<!-- Icon-only: hide label, compact padding -->
<v-button surface="flat"
          [isLabelHidden]="true"
          [paddingX]="2">
  <span v-prefix>⚙️</span>
  Settings
</v-button>

<!-- Destructive with custom padding -->
<v-button class="v-danger"
          [paddingY]="1"
          [paddingX]="6">Delete</v-button>

<!-- Full width -->
<v-button class="v-primary"
          width="100%">Continue</v-button>

<!-- Transparent background -->
<v-button surface="flat"
          [bgOpacity]="0"
          [paddingX]="0"
          [paddingY]="0">
  <span v-prefix>✕</span>
</v-button>

<!-- Disabled -->
<v-button class="v-primary"
          [isDisabled]="true">Disabled</v-button>

<!-- Link-style -->
<v-button surface="link">Learn more</v-button>

<!-- Link without hover animation (e.g. a static nav item) -->
<v-button surface="link"
          [isLinkStatic]="true">Learn more</v-button>

<!-- With prefix/postfix -->
<v-button surface="raised">
  <span v-prefix>🔍</span>
  Search
  <span v-postfix>→</span>
</v-button>

<!-- Combining surface with color -->
<v-button class="v-primary"
          surface="raised">Save</v-button>

<!-- Pressed-in / neumorphic look -->
<v-button surface="inset">Pressed</v-button>
```
