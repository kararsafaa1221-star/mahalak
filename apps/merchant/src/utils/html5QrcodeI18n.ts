import type { TFunction } from 'i18next';
import { Html5QrcodeScannerStrings, LibraryInfoStrings } from 'html5-qrcode/esm/strings';

/** Override html5-qrcode built-in English UI strings with app i18n (ar / ckb). */
export function applyHtml5QrcodeScannerTranslations(t: TFunction) {
  const tr = (key: string) => t(`html5Qr.${key}`);

  Html5QrcodeScannerStrings.scanningStatus = () => tr('scanningStatus');
  Html5QrcodeScannerStrings.idleStatus = () => tr('idleStatus');
  Html5QrcodeScannerStrings.errorStatus = () => tr('errorStatus');
  Html5QrcodeScannerStrings.permissionStatus = () => tr('permissionStatus');
  Html5QrcodeScannerStrings.noCameraFoundErrorStatus = () => tr('noCameraFoundErrorStatus');
  Html5QrcodeScannerStrings.lastMatch = (decodedText: string) =>
    t('html5Qr.lastMatch', { text: decodedText });
  Html5QrcodeScannerStrings.codeScannerTitle = () => tr('codeScannerTitle');
  Html5QrcodeScannerStrings.cameraPermissionTitle = () => tr('cameraPermissionTitle');
  Html5QrcodeScannerStrings.cameraPermissionRequesting = () => tr('cameraPermissionRequesting');
  Html5QrcodeScannerStrings.noCameraFound = () => tr('noCameraFound');
  Html5QrcodeScannerStrings.scanButtonStopScanningText = () => tr('scanButtonStopScanningText');
  Html5QrcodeScannerStrings.scanButtonStartScanningText = () => tr('scanButtonStartScanningText');
  Html5QrcodeScannerStrings.torchOnButton = () => tr('torchOnButton');
  Html5QrcodeScannerStrings.torchOffButton = () => tr('torchOffButton');
  Html5QrcodeScannerStrings.torchOnFailedMessage = () => tr('torchOnFailedMessage');
  Html5QrcodeScannerStrings.torchOffFailedMessage = () => tr('torchOffFailedMessage');
  Html5QrcodeScannerStrings.scanButtonScanningStarting = () => tr('scanButtonScanningStarting');
  Html5QrcodeScannerStrings.textIfCameraScanSelected = () => tr('textIfCameraScanSelected');
  Html5QrcodeScannerStrings.textIfFileScanSelected = () => tr('textIfFileScanSelected');
  Html5QrcodeScannerStrings.selectCamera = () => tr('selectCamera');
  Html5QrcodeScannerStrings.fileSelectionChooseImage = () => tr('fileSelectionChooseImage');
  Html5QrcodeScannerStrings.fileSelectionChooseAnother = () => tr('fileSelectionChooseAnother');
  Html5QrcodeScannerStrings.fileSelectionNoImageSelected = () => tr('fileSelectionNoImageSelected');
  Html5QrcodeScannerStrings.anonymousCameraPrefix = () => tr('anonymousCameraPrefix');
  Html5QrcodeScannerStrings.dragAndDropMessage = () => tr('dragAndDropMessage');
  Html5QrcodeScannerStrings.dragAndDropMessageOnlyImages = () => tr('dragAndDropMessageOnlyImages');
  Html5QrcodeScannerStrings.zoom = () => tr('zoom');
  Html5QrcodeScannerStrings.loadingImage = () => tr('loadingImage');
  Html5QrcodeScannerStrings.cameraScanAltText = () => tr('cameraScanAltText');
  Html5QrcodeScannerStrings.fileScanAltText = () => tr('fileScanAltText');

  LibraryInfoStrings.poweredBy = () => tr('poweredBy');
  LibraryInfoStrings.reportIssues = () => tr('reportIssues');
}
