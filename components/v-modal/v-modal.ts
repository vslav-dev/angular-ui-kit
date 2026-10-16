import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  input,
  output,
} from '@angular/core';
import { VButton } from '@ui-kit/components/v-button/v-button';
import { VBackdropDirective } from '@ui-kit/directives/backdrop.directive';
import { LayerController, PARENT_LAYER_ID, ZLayerService } from '@ui-kit/services/z-layer.service';
import { CssUnitOrRawValue, resolveCssUnitOrRawValue } from '@ui-kit/types';

export const ModalDeviceType = {
  Mobile: 'mobile',
  Desktop: 'desktop',
} as const;

export type ModalDeviceType = (typeof ModalDeviceType)[keyof typeof ModalDeviceType];

@Component({
  selector: 'v-modal',
  templateUrl: './v-modal.html',
  styleUrl: './v-modal.css',
  host: {
    '[style.--v-modal-width]': 'width$$()',
    '[style.--v-modal-border-radius]': 'borderRadiusString$$()',
    '[style.--v-modal-z-index]': 'zIndex',
    '[style.--v-modal-padding-x]': 'paddingXString$$()',
    '[style.--v-modal-padding-y]': 'paddingYString$$()',
  },
  providers: [
    {
      provide: PARENT_LAYER_ID,
      useFactory: (modal: VModal) => modal.layerId,
      deps: [VModal],
    },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [VButton, VBackdropDirective],
})
export class VModal {
  public readonly deviceType = input<ModalDeviceType>();
  public readonly isOpen = input<boolean>(false);
  public readonly isCloseButtonVisible = input<boolean>(false);
  // false: the page behind stays visible; clicking outside the modal still closes it.
  public readonly isBackdropDimmed = input<boolean>(true);
  public readonly width = input<string>('min(100vw, 400px)');
  public readonly mobileWidth = input<string>();
  public readonly desktopWidth = input<string>();
  public readonly borderRadius = input<CssUnitOrRawValue>(2);
  public readonly padding = input<CssUnitOrRawValue>();
  public readonly paddingX = input<CssUnitOrRawValue>();
  public readonly paddingY = input<CssUnitOrRawValue>();

  public readonly onClose = output<void>();
  public readonly onOpen = output<void>();

  protected readonly width$$ = computed(() => this.getFinalWidth());
  protected readonly paddingX$$ = computed(() => this.paddingX() ?? this.padding() ?? 2);
  protected readonly paddingY$$ = computed(() => this.paddingY() ?? this.padding() ?? 2);

  protected readonly paddingXString$$ = computed(() => resolveCssUnitOrRawValue(this.paddingX$$()));
  protected readonly paddingYString$$ = computed(() => resolveCssUnitOrRawValue(this.paddingY$$()));
  protected readonly borderRadiusString$$ = computed(() => resolveCssUnitOrRawValue(this.borderRadius()));

  protected zIndex = 100;
  private layerController?: LayerController;
  private readonly zLayerService = inject(ZLayerService);

  private readonly isOpenEffect$$ = effect(() => {
    const isOpen = this.isOpen();
    if (isOpen && !this.layerController) {
      this.registerLayer();
      this.onOpen.emit();
    }
  });

  public get layerId(): string | undefined {
    return this.layerController?.id;
  }

  public ngOnDestroy(): void {
    this.layerController?.destroy();
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (this.isOpen()) {
      this.closeModal();
    }
  }

  protected closeModal(): void {
    this.onClose.emit();
  }

  private registerLayer(): void {
    this.layerController = this.zLayerService.registerLayer('modal');
    this.zIndex = this.layerController.zIndex;
  }

  private getFinalWidth(): string {
    const deviceType = this.deviceType();

    if (deviceType === ModalDeviceType.Mobile && this.mobileWidth()) {
      return this.mobileWidth()!;
    }
    if (deviceType === ModalDeviceType.Desktop && this.desktopWidth()) {
      return this.desktopWidth()!;
    }
    return this.width();
  }
}
