import { InjectionToken, Service } from '@angular/core';

/**
 * Token for passing parent layer ID through Angular DI.
 * Used for automatic determination of overlay component hierarchy.
 */
export const PARENT_LAYER_ID = new InjectionToken<string>('PARENT_LAYER_ID');

/**
 * Types of overlay component layers.
 * Each type has its own priority and positioning rules.
 */
export type LayerType = 'modal' | 'dropdown' | 'tooltip' | 'backdrop';

/**
 * Interface for describing a registered layer.
 * @internal
 */
interface LayerEntry {
  id: string;
  zIndex: number;
  type: LayerType;
  parentId?: string | undefined;
}

/**
 * Controller for managing individual layer.
 * Provides methods for getting backdrop z-index and destroying the layer.
 */
export class LayerController {
  public constructor(
    public readonly id: string,
    /** Calculated z-index for this layer */
    public readonly zIndex: number,
    private readonly service: ZLayerService,
  ) {}

  /**
   * Gets z-index for backdrop of this layer.
   * Backdrop is always positioned 10 units below the main layer.
   *
   * @returns z-index for backdrop element
   */
  public getBackdropZIndex(): number {
    return this.service.getBackdropZIndex(this.id);
  }

  /**
   * Destroys the layer and releases resources.
   * Should be called in ngOnDestroy of the component.
   */
  public destroy(): void {
    this.service.unregisterLayer(this.id);
  }
}

/**
 * Service for automatic z-index management of overlay components.
 *
 * Prevents z-index conflicts between modals, dropdowns, tooltips and their backdrops.
 * Each component registers on creation and gets appropriate z-index automatically.
 * Child components inherit parent context and position themselves above parent.
 *
 * Base z-index: 100
 * Modal: base + 1, Dropdown: parent + 100, Tooltip: parent + 200, Backdrop: parent - 10
 */
@Service()
export class ZLayerService {
  /** Base z-index — the floor for top-level (parentless) layers */
  private readonly baseZIndex = 100;

  /** Counter for generating unique layer IDs */
  private idCounter = 0;

  /** Registry of all registered layers */
  private readonly layers = new Map<string, LayerEntry>();

  /**
   * Registers new layer and returns controller for managing it.
   *
   * @param type - Type of layer to register
   * @param parentId - ID of parent layer (optional)
   * @returns Controller for managing created layer
   */
  public registerLayer(type: LayerType, parentId?: string): LayerController {
    const id = this.generateId();
    const zIndex = this.getNextZIndex(type, parentId);

    this.layers.set(id, { id, zIndex, type, parentId });

    return new LayerController(id, zIndex, this);
  }

  /**
   * Removes layer from registry.
   * Usually called automatically via LayerController.destroy().
   *
   * @param id - ID of layer to remove
   * @internal
   */
  public unregisterLayer(id: string): void {
    this.layers.delete(id);
  }

  /**
   * Gets z-index for backdrop of specified layer.
   *
   * @param parentId - ID of parent layer
   * @returns z-index for backdrop or 90 if layer not found
   */
  public getBackdropZIndex(parentId: string): number {
    const parent = this.layers.get(parentId);
    return parent ? parent.zIndex - 10 : 90;
  }

  /**
   * Calculates next available z-index for new layer.
   *
   * @param type - Layer type
   * @param parentId - ID of parent layer (optional)
   * @returns Calculated z-index
   * @private
   */
  private getNextZIndex(type: LayerType, parentId?: string): number {
    if (parentId) {
      const parent = this.layers.get(parentId);
      if (parent) {
        return parent.zIndex + this.getTypeOffset(type);
      }
    }

    return this.getMaxTopLevelZIndex() + 1;
  }

  /**
   * Highest z-index among currently registered top-level (parentless) layers.
   * Derived from the live registry instead of a standalone counter, so it
   * naturally falls back to baseZIndex once all such layers are closed,
   * rather than climbing forever across the app's lifetime.
   *
   * @returns Highest live top-level z-index, or baseZIndex if none are open
   * @private
   */
  private getMaxTopLevelZIndex(): number {
    let max = this.baseZIndex;
    for (const layer of this.layers.values()) {
      if (!layer.parentId) max = Math.max(max, layer.zIndex);
    }
    return max;
  }

  /**
   * Returns z-index offset for different layer types.
   *
   * @param type - Layer type
   * @returns Z-index offset relative to parent layer
   * @private
   */
  private getTypeOffset(type: LayerType): number {
    switch (type) {
      case 'backdrop':
        return -10;
      case 'modal':
        return 0;
      case 'dropdown':
        return 10;
      case 'tooltip':
        return 20;
      default:
        return 0;
    }
  }

  /**
   * Generates unique ID for new layer.
   *
   * @returns String like 'layer_1', 'layer_2', etc.
   * @private
   */
  private generateId(): string {
    return `layer_${++this.idCounter}`;
  }
}
