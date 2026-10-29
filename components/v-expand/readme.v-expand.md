# V-Expand

Expandable/collapsible panel with flat design and accordion support. Works standalone or within `v-accordion` container. Supports dark theme.

## Basic Usage

```html
<v-expand>
  <div v-header>Click to Toggle</div>
  <div v-body>
    <p>Expandable content</p>
  </div>
</v-expand>
```

## Controlled Expansion

```html
<!-- Button-controlled panel (no header, auto-hidden when collapsed) -->
<v-button (click)="isExpanded = !isExpanded">Toggle</v-button>

<v-expand [isExpanded]="isExpanded">
  <div v-body>
    <p>Content controlled by external state</p>
  </div>
</v-expand>
```

## Accordion Mode (Single Open)

```html
<v-accordion>
  <v-expand>
    <h4 v-header>Section 1</h4>
    <div v-body><p>Content 1</p></div>
  </v-expand>

  <v-expand>
    <h4 v-header>Section 2</h4>
    <div v-body><p>Content 2</p></div>
  </v-expand>

  <v-expand>
    <h4 v-header>Section 3</h4>
    <div v-body><p>Content 3</p></div>
  </v-expand>
</v-accordion>
```

## Multiple Panels Open

```html
<v-accordion [multiple]="true">
  <v-expand>
    <div v-header>Panel 1</div>
    <div v-body>Content 1</div>
  </v-expand>

  <v-expand>
    <div v-header>Panel 2</div>
    <div v-body>Content 2</div>
  </v-expand>
</v-accordion>
```

## Dynamic Accordion

```html
<v-accordion>
  @for (item of items; track item.id) {
    <v-expand>
      <div v-header>{{ item.title }}</div>
      <div v-body>{{ item.content }}</div>
    </v-expand>
  }
</v-accordion>
```

## With Configuration

```html
<!-- Custom padding, border radius, no animation -->
<v-expand [padding]="3"
          [borderRadius]="4"
          animationTimingFunction="ease-out"
          [isWithoutAnimation]="false">
  <div v-header>Custom Styled Panel</div>
  <div v-body>Content with custom settings</div>
</v-expand>
```

## Properties

```ts
isExpanded: boolean = false
isWithoutAnimation: boolean = false
padding: CssUnitOrRawValue = 2
borderRadius: CssUnitOrRawValue = 2
animationTimingFunction: 'ease-in-out' | 'linear' | 'ease' | 'ease-in' | 'ease-out' = 'ease-in-out'
```

## VAccordion API

```ts
// Inputs
groupId: string
multiple: boolean = false  // Allow multiple panels open
```

## Events

- `openedOutput: CustomEvent<boolean>`

## Methods

- `toggle()`: void
- `setExpanded(state: boolean)`: void
- `isPanelExpanded()`: boolean
