import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  OnDestroy,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormValueControl, ValidationError } from '@angular/forms/signals';
import { getValidationErrorMessage } from '@ui-kit/components/v-input/validators';
import { CssUnitOrRawValue, resolveCssUnitOrRawValue } from '@ui-kit/types';
import { VInputAutoSubmitManager, VInputAutoSubmitResult, VInputAutoSubmitState } from './v-input-auto-submit';

type InputValue = string | number | null;

type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url';

type InputMode = 'none' | 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | 'search';

type FontSize = `${number}px` | `${number}rem` | `${number}em` | `${number}%`;

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type TextAlign = 'left' | 'right' | 'center';

let uniqueId = 0;

@Component({
  selector: 'v-input',
  templateUrl: './v-input.html',
  styleUrls: ['./v-input.css', './v-input-auto-submit.css'],
  host: {
    '[style.--v-input-border-radius]': 'borderRadiusString$$()',
    '[style.--v-input-padding-x]': 'paddingXString$$()',
    '[style.--v-input-padding-y]': 'paddingYString$$()',
    '[style.--v-input-auto-submit-delay]': 'autoSubmitDelayString$$()',
    '[style.--v-input-auto-submit-result-fade-duration]': 'autoSubmitResultFadeDurationString$$()',
    '[class]': '"v-input"',
    '[class.countdown-state]': 'autoSubmitState$$() === vInputAutoSubmitState.Countdown',
    '[class.submitting-state]': 'autoSubmitState$$() === vInputAutoSubmitState.Submitting',
    '[class.success-state]': 'autoSubmitState$$() === vInputAutoSubmitState.Success',
    '[class.error-state]': 'autoSubmitState$$() === vInputAutoSubmitState.Error',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class VInput implements FormValueControl<string>, OnDestroy {
  public readonly inputElement = viewChild.required<ElementRef<HTMLInputElement | HTMLTextAreaElement>>('inputElement');

  public readonly type = input<InputType>('text');
  public readonly inputmode = input<InputMode>('text');
  public readonly name = input<string>('');
  public readonly label = input<string>('');
  public readonly labelRight = input<string>('');
  public readonly placeholder = input<string>('');
  public readonly isDisabled = input<boolean>(false);
  public readonly isReadonly = input<boolean>(false);
  public readonly isClickable = input<boolean>(false);
  public readonly isTextarea = input<boolean>(false);
  public readonly errorMessage = input<string>('');
  // Bound by the formField directive from the field's state.
  public readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  public readonly invalid = input<boolean>(false);
  public readonly inputSize = input<number | null>(null);
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly paddingX = input<CssUnitOrRawValue>(0);
  public readonly paddingY = input<CssUnitOrRawValue>(2);
  public readonly rows = input<number>(3);
  public readonly cols = input<number>(50);
  public readonly fontSize = input<FontSize>('1rem');
  public readonly fontWeight = input<FontWeight>(400);
  public readonly textAlign = input<TextAlign>('left');
  public readonly isAutoSubmitEnabled = input<boolean>(false);
  public readonly autoSubmitDelay = input<number>(2000);
  public readonly autoSubmitResult = input<VInputAutoSubmitResult | null>(null);
  public readonly autoSubmitResultFadeDuration = input<number>(3000);

  public readonly value = model<string>('');

  public readonly onInputChanged = output<Event>();
  public readonly onFocused = output<Event>();
  public readonly onBlurred = output<Event>();
  public readonly onEnterPressed = output<KeyboardEvent>();
  public readonly onAutoSubmit = output<InputValue>();
  // The formField directive listens to it to mark the field touched.
  public readonly touch = output<void>();

  protected readonly borderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.borderRadius()));
  protected readonly paddingXString$$ = computed(() => resolveCssUnitOrRawValue(this.paddingX()));
  protected readonly paddingYString$$ = computed(() => resolveCssUnitOrRawValue(this.paddingY()));
  protected readonly autoSubmitDelayString$$ = computed(() => `${this.autoSubmitDelay()}ms`);
  protected readonly autoSubmitResultFadeDurationString$$ = computed(() => `${this.autoSubmitResultFadeDuration()}ms`);

  protected readonly isFocused$$ = signal(false);
  protected readonly hasInteracted$$ = signal(false);
  protected readonly inputId = `v-input-${++uniqueId}`;
  protected readonly autoSubmitState$$ = signal<VInputAutoSubmitState>(VInputAutoSubmitState.Idle);

  private readonly injector = inject(Injector);
  private isImeComposing = false;
  // The last value this input has accounted for, typed by the user or taken from the model; a different model value came from outside.
  private knownValue = '';

  private readonly autoSubmitManager = new VInputAutoSubmitManager({
    isEnabled: () => this.isAutoSubmitEnabled() && !this.isDisabled() && !this.isReadonly(),
    isValid: () => !this.invalid(),
    getValue: () => this.value(),
    getAutoSubmitDelay: () => this.autoSubmitDelay(),
    getAutoSubmitResultFadeDuration: () => this.autoSubmitResultFadeDuration(),
    emitSubmit: (value: string) => this.onAutoSubmit.emit(value),
    onStateChange: (state: VInputAutoSubmitState) => this.autoSubmitState$$.set(state),
  });

  protected readonly errorMessage$$ = computed(() => {
    if (!this.hasInteracted$$()) return '';
    return this.errorMessage() || this.fieldErrorMessage$$();
  });

  private readonly fieldErrorMessage$$ = computed(() => {
    const error = this.errors()[0];
    if (!error) return '';
    return error.message || getValidationErrorMessage(error.kind);
  });

  protected readonly vInputAutoSubmitState = VInputAutoSubmitState;

  // An outside change (a loaded value, a reset) is not the user's input: no error yet, and autosubmit must not resend it.
  private readonly syncFromModelEffect = effect(() => {
    const value = this.value();
    untracked(() => {
      if (value === this.knownValue) return;
      this.knownValue = value;
      this.hasInteracted$$.set(false);
      this.autoSubmitManager.writeValue(value);
    });
  });

  public ngOnDestroy(): void {
    this.autoSubmitManager.destroy();
  }

  protected onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    this.hasInteracted$$.set(true);
    this.emitValue(target.value);

    this.onInputChanged.emit(event);
    // `invalid` is bound from the field and still describes the previous value here; after the next render it describes this one.
    afterNextRender(() => this.autoSubmitManager.handleChange(), { injector: this.injector });
  }

  // Lets a click anywhere in the wrapper (padding, prefix/postfix decoration)
  // focus the real field, same as clicking the field itself. A descendant opts
  // out by calling preventDefault() on its own mousedown — the existing reset
  // buttons in v-prefix/v-postfix already do this to avoid stealing focus, so
  // this reuses that same signal instead of adding a separate input flag.
  protected onWrapperMouseDown(event: MouseEvent): void {
    if (this.isDisabled() || event.defaultPrevented) return;
    const inputEl = this.inputElement().nativeElement;
    if (event.target === inputEl) return;
    event.preventDefault();
    inputEl.focus();
  }

  protected onFocus(): void {
    this.isFocused$$.set(true);
    const event = new Event('focus');
    this.onFocused.emit(event);
  }

  protected onBlur(): void {
    this.isFocused$$.set(false);
    this.touch.emit();
    const event = new Event('blur');
    this.onBlurred.emit(event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isTextarea()) {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !event.isComposing && !this.isImeComposing) {
        event.preventDefault();
        this.onEnterPressed.emit(event);
      }
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const didApply = this.applyArrowStep(event);
      if (didApply) return;
    }

    if (event.key === 'Enter') {
      if (event.isComposing || this.isImeComposing) return;
      if (this.isAutoSubmitEnabled()) {
        this.autoSubmitManager.triggerSubmit();
      }
      this.onEnterPressed.emit(event);
    }
  }

  protected onCompositionStart(): void {
    this.isImeComposing = true;
  }

  protected onCompositionEnd(): void {
    this.isImeComposing = false;
  }

  private applyArrowStep(event: KeyboardEvent): boolean {
    if (this.isTextarea()) return false;
    if (this.isDisabled() || this.isReadonly()) return false;

    const isNumericLike = this.type() === 'number' || this.inputmode() === 'numeric' || this.inputmode() === 'decimal';
    if (!isNumericLike) return false;

    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const rawValue = target.value;
    const parsed = this.parseNumericInput(rawValue);
    if (!parsed) return false;

    event.preventDefault();

    const step = event.altKey ? 0.1 : 1;
    const delta = event.key === 'ArrowUp' ? step : -step;
    const nextNum = Math.round((parsed.value + delta) * 10) / 10;
    const nextRaw = parsed.usesComma ? String(nextNum).replace('.', ',') : String(nextNum);
    this.applyKeyboardValue(nextRaw);
    this.onInputChanged.emit(event);

    return true;
  }

  private readonly autoSubmitResultEffect = effect(() => {
    const result = this.autoSubmitResult();
    if (result === null) return;
    this.autoSubmitManager.handleResult(result);
  });

  private parseNumericInput(rawValue: string): { value: number; usesComma: boolean } | null {
    const trimmed = rawValue.trim();
    if (trimmed === '') return { value: 0, usesComma: false };

    const usesComma = trimmed.includes(',') && !trimmed.includes('.');
    const normalized = usesComma ? trimmed.replace(',', '.') : trimmed;

    if (!/^[+-]?(?:\d+|\d*\.\d+)(?:\.)?$/.test(normalized) && !/^[+-]?\d+(?:\.)?$/.test(normalized)) {
      return null;
    }

    const num = Number(normalized.endsWith('.') ? normalized.slice(0, -1) : normalized);
    if (!Number.isFinite(num)) return null;

    return { value: num, usesComma };
  }

  private applyKeyboardValue(newValue: string): void {
    this.hasInteracted$$.set(true);
    this.emitValue(newValue);
  }

  private emitValue(value: string): void {
    this.knownValue = value;
    this.value.set(value);
  }

  public focus(): void {
    this.inputElement().nativeElement.focus();
  }

  public blur(): void {
    this.inputElement().nativeElement.blur();
  }
}

export { VInputAutoSubmitResult } from './v-input-auto-submit';
