# V-Modal

Simple modal window with customizable width, padding, and close button.

## Basic Usage

```html
<v-modal [isOpen]="isModalOpen"
         (closeOutput)="closeModal()">
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

- `closeOutput: void`
- `openOutput: void`

## Examples

```html
<!-- With header and footer -->
<v-modal [isOpen]="isModalOpen"
         (closeOutput)="closeModal()">
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
         (closeOutput)="closeModal()">
  <div>Modal content</div>
</v-modal>

<!-- Form modal -->
<v-modal [isOpen]="showForm"
         [isCloseButtonVisible]="true"
         width="500px"
         [paddingY]="3"
         [paddingX]="3"
         (closeOutput)="hideForm()">
  <h3 v-header>Create Entry</h3>

  <form [formRoot]="myForm">
    <v-input label="Title" [formField]="myForm.title" />
    <v-input label="Description" [formField]="myForm.description" />
  </form>

  <div v-footer class="form-actions">
    <v-button class="v-primary" (clickOutput)="saveForm()">Save</v-button>
    <v-button surface="flat" (clickOutput)="hideForm()">Cancel</v-button>
  </div>
</v-modal>

<!-- Confirmation dialog -->
<v-modal [isOpen]="showConfirmation"
         width="350px"
         [borderRadius]="3"
         (closeOutput)="cancelAction()">
  <h4 v-header>Confirm Action</h4>
  <p>Are you sure you want to delete this item?</p>
  <div v-footer>
    <v-button class="v-danger" (clickOutput)="confirmDelete()">Delete</v-button>
    <v-button surface="flat" (clickOutput)="cancelAction()">Cancel</v-button>
  </div>
</v-modal>

<!-- Compact modal -->
<v-modal [isOpen]="showInfo"
         width="300px"
         [paddingY]="0"
         [paddingX]="0"
         (closeOutput)="closeInfo()">
  <div v-header>Quick Info</div>
  <p>Compact modal with minimal spacing</p>
  <div v-footer>
    <v-button surface="flat" (clickOutput)="closeInfo()">OK</v-button>
  </div>
</v-modal>

<!-- Device-specific width -->
<v-modal [isOpen]="isModalOpen"
         [deviceType]="deviceInfoService.isDesktopScreen$$() ? 'desktop' : 'mobile'"
         mobileWidth="100vw"
         desktopWidth="480px"
         (closeOutput)="closeModal()">
  <div>Modal content</div>
</v-modal>
```
