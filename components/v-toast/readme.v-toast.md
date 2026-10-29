# V-Toast

Presentational notification card: icon, message, tap-anywhere-to-dismiss. No internal state, timing, or stacking logic — driven entirely by inputs.

## Basic Usage

```html
<v-toast [type]="'success'"
         [message]="'Запись добавлена'"
         (closeOutput)="dismiss()" />
```

## API

```ts
type VToastType = 'success' | 'error' | 'warning' | 'info';

type: input.required<VToastType>()
message: input.required<string>()
isPending: input<boolean>(false)
isCloseButtonVisible: input<boolean>(false)
onClose: output<void>()
```

The whole card is clickable and emits `closeOutput` — that's the default dismiss interaction, no close button shown. `isCloseButtonVisible` keeps the dedicated × button available as an opt-in for flows that need it; current flows don't enable it.

`isPending` swaps the type icon for a spinning sync icon — used for the persistent "saving..." state while a background sync is in flight. Background/border/icon color is driven by `type` (tinted with `color-mix`): `success` → `--v-color-success`, `error` → `--v-color-danger`, `warning`/pending → `--v-color-warning`, `info` → `--v-color-primary`.

Stacking, auto-dismiss timers, and id-based lifecycle are handled by the caller (`NotificationService` + the app-level `notifications` host component), not by this component.
