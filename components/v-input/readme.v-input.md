# V-Input

Flat design input with individual property API, Signal Forms integration (`FormValueControl`) and prefix/postfix content projection. Supports dark theme.

## Basic Usage

```html
<!-- Two-way model -->
<v-input
  label="Username"
  placeholder="Enter your name"
  [(value)]="username"
/>

<!-- Signal Forms: value, errors, invalid and touched are wired by the formField directive -->
<v-input
  label="Username"
  [formField]="form.username"
/>
```

## Properties

```ts
value: string = ''  // model
type: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' = 'text'
inputmode: 'none' | 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search' = 'text'
name: string
label: string
labelRight: string
placeholder: string
isDisabled: boolean = false
isReadonly: boolean = false
isClickable: boolean = false
isTextarea: boolean = false
errorMessage: string  // overrides the message taken from errors
errors: ValidationError[] = []  // shown (first one's message) once the user has typed
invalid: boolean = false  // blocks autosubmit
inputSize: number | null
borderRadius: CssUnitOrRawValue = 2
paddingX: CssUnitOrRawValue = 0
paddingY: CssUnitOrRawValue = 2
rows: number = 3
cols: number = 50
fontSize: string = '1rem'
fontWeight: number = 400
textAlign: 'left' | 'right' | 'center' = 'left'
isAutoSubmitEnabled: boolean = false
autoSubmitDelay: number = 2000
autoSubmitResult: VInputAutoSubmitResult | null
autoSubmitResultFadeDuration: number = 3000
```

## Events

- `onInputChanged: Event`
- `onFocused: Event`
- `onBlurred: Event`
- `onEnterPressed: KeyboardEvent`
- `onAutoSubmit: string | number | null`
- `touch: void` (blur; marks the Signal Forms field touched)

## Examples

```html
<!-- Email with validation -->
<v-input
  [formField]="form.email"
  type="email"
  label="Email Address"
  placeholder="user@example.com" />

<!-- Password with custom style -->
<v-input
  [formField]="form.password"
  type="password"
  label="Password"
  fontSize="1.1rem"
  [fontWeight]="500" />

<!-- Number with prefix/postfix -->
<v-input
  [(value)]="price"
  type="number"
  textAlign="right"
  fontSize="18px">
  <span v-prefix>$</span>
  <select v-postfix>
    <option>USD</option>
    <option>EUR</option>
  </select>
</v-input>

<!-- Search with buttons -->
<v-input
  [(value)]="searchText"
  placeholder="Type to search...">
  <button v-prefix type="button" (click)="clearSearch()">✕</button>
  <button v-postfix type="button" (click)="performSearch()">🔍</button>
</v-input>

<!-- Auto submit -->
<v-input
  label="Auto submit"
  [isAutoSubmitEnabled]="true"
  [autoSubmitDelay]="1500"
  [autoSubmitResult]="autoSubmitResult"
  (onAutoSubmit)="handleAutoSubmit($event)" />
```
