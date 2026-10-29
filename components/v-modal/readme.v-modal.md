# V-Modal

Simple modal window with customizable width, padding, and close button.

## Basic Usage

```html
<v-modal [isOpen]="isModalOpen"
         (onClose)="closeModal()">
  <div>Modal content</div>
</v-modal>
```

## Properties

```ts
deviceType: ModalDeviceType   // picks mobileWidth/desktopWidth over width when set
isOpen: boolean = false
isCloseButtonVisible: boolean = false
width: string = 'min(100vw, 400px)'
mobileWidth: string
desktopWidth: string
borderRadius: CssUnitOrRawValue = 2
padding: CssUnitOrRawValue              // shorthand, fills paddingX/paddingY unless set
paddingX: CssUnitOrRawValue = 2
paddingY: CssUnitOrRawValue = 2
```

## Events

- `onClose: void`
- `onOpen: void`

## Examples

```html
<!-- With header and footer -->
<v-modal [isOpen]="isModalOpen"
         (onClose)="closeModal()">
  <h2 v-header>Modal Header</h2>
  <div>Main content</div>
  <div v-footer>Footer content</div>
</v-modal>

<!-- With close button, custom width -->
<v-modal [isOpen]="isModalOpen"
         [isCloseButtonVisible]="true"
         width="600px"
         [borderRadius]="3"
         [paddingY]="3"
         [paddingX]="4"
         (onClose)="closeModal()">
  <div>Modal content</div>
</v-modal>

<!-- Form modal -->
<v-modal [isOpen]="showForm"
         [isCloseButtonVisible]="true"
         width="500px"
         [paddingY]="3"
         [paddingX]="3"
         (onClose)="hideForm()">
  <h3 v-header>Create Entry</h3>

  <form [formRoot]="myForm">
    <v-input label="Title" [formField]="myForm.title" />
    <v-input label="Description" [formField]="myForm.description" />
  </form>

  <div v-footer class="form-actions">
    <v-button class="v-primary" (onClick)="saveForm()">Save</v-button>
    <v-button surface="flat" (onClick)="hideForm()">Cancel</v-button>
  </div>
</v-modal>

<!-- Confirmation dialog -->
<v-modal [isOpen]="showConfirmation"
         width="350px"
         [borderRadius]="3"
         (onClose)="cancelAction()">
  <h4 v-header>Confirm Action</h4>
  <p>Are you sure you want to delete this item?</p>
  <div v-footer>
    <v-button class="v-danger" (onClick)="confirmDelete()">Delete</v-button>
    <v-button surface="flat" (onClick)="cancelAction()">Cancel</v-button>
  </div>
</v-modal>

<!-- Compact modal -->
<v-modal [isOpen]="showInfo"
         width="300px"
         [paddingY]="0"
         [paddingX]="0"
         (onClose)="closeInfo()">
  <div v-header>Quick Info</div>
  <p>Compact modal with minimal spacing</p>
  <div v-footer>
    <v-button surface="flat" (onClick)="closeInfo()">OK</v-button>
  </div>
</v-modal>

<!-- Device-specific width -->
<v-modal [isOpen]="isModalOpen"
         [deviceType]="deviceInfoService.isDesktopScreen$$() ? 'desktop' : 'mobile'"
         mobileWidth="100vw"
         desktopWidth="480px"
         (onClose)="closeModal()">
  <div>Modal content</div>
</v-modal>
```
