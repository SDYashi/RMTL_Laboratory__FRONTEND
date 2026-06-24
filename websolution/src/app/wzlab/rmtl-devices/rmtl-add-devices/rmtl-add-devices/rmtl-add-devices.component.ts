import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ApiServicesService } from 'src/app/services/api-services.service';
import { AuthService } from 'src/app/core/auth.service';
import {
  InwardReceiptPdfService,
  InwardReceiptData,
  InwardReceiptItem,
  InwardReceiptHeaderInfo
} from 'src/app/shared/inward-receipt-pdf.service';

declare var bootstrap: any;
declare var Html5Qrcode: any;
declare var Html5QrcodeSupportedFormats: any;

interface DeviceRow {
  serial_number: string;
  make: string;
  capacity: string;
  phase: string;
  connection_type: string;
  meter_category: string;
  meter_class?: string | null;
  meter_type: string;
  voltage_rating: string;
  current_rating: string;
  device_testing_purpose: string;
  ct_class?: string | null;
  ct_ratio?: string | null;
  remark?: string | null;
  initiator?: string | null;
}

interface CTRow {
  serial_number: string;
  ct_class?: string | null;
  ct_ratio?: string | null;
  make: string;
  phase: string;
  connection_type: string;
  device_testing_purpose: string;
  remark?: string | null;
  initiator?: string | null;
}

type CameraScannerTarget = 'METER' | 'CT';
type CameraScannerType = 'qr' | 'barcode';

@Component({
  selector: 'app-rmtl-add-devices',
  templateUrl: './rmtl-add-devices.component.html',
  styleUrls: ['./rmtl-add-devices.component.css']
})
export class RmtlAddDevicesComponent implements OnInit, AfterViewInit, OnDestroy {
  // -------- Shared source --------
  office_types: string[] = [];
  selectedSourceType = '';
  selectedSourceName = '';
  filteredSources: any = null;
  inwardDate = this.todayISO();
  maxInwardDate = this.todayISO();

  // -------- Enums (DB-safe values) --------
  makes: string[] = [];
  capacities: string[] = [];
  phases: string[] = [];
  private phaseOptionsCache = new Map<string, string[]>();
  meter_categories: string[] = [];
  meter_classes: string[] = [];
  meterTypes: string[] = [];
  ct_classes: string[] = [];
  ct_ratios: string[] = [];
  connection_types: string[] = [];
  voltage_ratings: string[] = [];
  current_ratings: string[] = [];
  device_testing_purpose: string[] = [];
  meter_subcategories: string[] = [];
  initiators: string[] = [];

  // -------- Defaults --------
  meterDefaultPurpose = 'ROUTINE';

  // -------- Data --------
  devices: DeviceRow[] = [];
  cts: CTRow[] = [];

  serialRange: any = {
    start: null, end: null,
    connection_type: '', phase: '', make: '', capacity: '',
    meter_category: '', meter_class: '', meter_type: '',
    voltage_rating: '', current_rating: '',
    remark: '', serial_number: '',
    ct_class: '', ct_ratio: '',
    device_testing_purpose: '',
    initiator: ''
  };

  ctRange: any = this.defaultCtRange();

  ctMeta: any = {
    make: '',
    capacity: '',
    phase: '',
    meter_category: '',
    meter_class: '',
    meter_type: '',
    connection_type: '',
    voltage_rating: '',
    current_rating: '',
    serial_number: '',
    ct_class: '',
    ct_ratio: '',
    remark: '',
    device_testing_purpose: '',
    initiator: ''
  };

  // UI helpers
  meterDefaultsUI: Array<{ key: string; label: string; options: string[] }> = [];
  ctDefaultsUI: Array<{ key: string; label: string; options: string[] }> = [];

  // Modal
  alertTitle = '';
  alertMessage = '';
  alertInstance: any;

  // Lab
  labId: number | null = null;

  // Quick manual add
  quick = { serial: '' };
  ctQuick = { serial: '' };

  // Camera / image / USB QR and barcode scanner
  scannerOpen = false;
  scannerType: CameraScannerType = 'qr';
  scannerTarget: CameraScannerTarget = 'METER';
  hardwareScannerTarget: CameraScannerTarget = 'METER';
  scannerError = '';
  scannerStatus = '';
  scannerBusy = false;
  private html5Scanner: any = null;
  private scanHandled = false;
  private scannerLibraryPromise: Promise<void> | null = null;
  private readonly scannerElementId = 'rmtl-camera-reader';
  private readonly scannerLibraryUrl = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  impkwhs: any;
  currentUserId: any;
  currentLabId: any;
  api: any;
  labInfo: { lab_name: any; address: any; email: any; phone: any; } | undefined;

  constructor(
    private deviceService: ApiServicesService,
    private inwardPdf: InwardReceiptPdfService,
    private authService: AuthService
  ) {}

  // ---------- Reusable PDF header (matches your branding/screenshot) ----------
  private pdfHeader: InwardReceiptHeaderInfo = {
    orgLine: 'MADHYA PRADESH PASCHIM KHETRA VIDYUT VITARAN COMPANY LIMITED',
    labLine: 'REGINAL METERING TESTING LABORATORY INDORE',
    addressLine: 'MPPKVVCL Near Conference Hall, Polo Ground, Indore (MP) 452003',
    email: 'testinglabwzind@gmail.com',
    phone: '0731-2997802',
    leftLogoUrl: '/assets/icons/wzlogo.png',
    rightLogoUrl: '/assets/icons/wzlogo.png',
    logoWidth: 36,
    logoHeight: 36
  };

  onScan(code: string): void {
    this.onHardwareScan(code);
  }

  setHardwareScanTarget(target: CameraScannerTarget): void {
    this.hardwareScannerTarget = target;
  }

  onHardwareScan(code: string): void {
    if (this.hardwareScannerTarget === 'CT') {
      this.onCTScan(code);
    } else {
      this.onMeterScan(code);
    }
  }

  onMeterScan(code: string): void {
    const value = this.normaliseScannedValue(code);
    if (!value) return;

    this.quick.serial = value;
    this.quickAddMeter();
  }

  onCTScan(code: string): void {
    const value = this.normaliseScannedValue(code);
    if (!value) return;

    this.ctQuick.serial = value;
    this.quickAddCT();
  }

  private normaliseScannedValue(code: string): string {
    const raw = (code || '').trim();
    if (!raw) return '';

    // Device QR codes may contain a URL or key/value payload. Extract a serial
    // when present; otherwise retain the complete decoded barcode value.
    try {
      const url = new URL(raw);
      const serial =
        url.searchParams.get('serial_number') ||
        url.searchParams.get('serial') ||
        url.searchParams.get('meter_no') ||
        url.searchParams.get('device_serial');
      if (serial) return serial.trim();
    } catch {
      // Not a URL; continue with text parsing.
    }

    const serialMatch = raw.match(
      /(?:serial(?:_number|\s*no)?|meter(?:_number|\s*no)?|device(?:_serial)?)\s*[:=]\s*([^|,;\r\n]+)/i
    );
    return (serialMatch?.[1] || raw).trim();
  }

  async openCameraScanner(target: CameraScannerTarget, type: CameraScannerType): Promise<void> {
    await this.stopScannerEngine();

    this.scannerTarget = target;
    this.scannerType = type;
    this.hardwareScannerTarget = target;
    this.scannerError = '';
    this.scannerStatus = 'Starting camera…';
    this.scannerBusy = true;
    this.scanHandled = false;
    this.scannerOpen = true;

    // startCameraScanner waits until Angular has rendered the modal before
    // constructing the decoder and requesting the camera.
    await this.startCameraScanner();
  }

  async restartCameraScanner(): Promise<void> {
    this.scannerError = '';
    this.scannerStatus = 'Restarting camera…';
    this.scannerBusy = true;
    this.scanHandled = false;

    await this.stopScannerEngine();
    await this.startCameraScanner();
  }

  private isCameraContextAllowed(): boolean {
    return window.isSecureContext ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';
  }

  private async waitForScannerElement(): Promise<HTMLElement> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const element = document.getElementById(this.scannerElementId);
      if (element && element.clientWidth > 0) return element;
    }

    throw new Error('Scanner view is not ready. Close the popup and try again.');
  }

  private async ensureScannerLibrary(): Promise<void> {
    if ((window as any).Html5Qrcode) return;
    if (this.scannerLibraryPromise) return this.scannerLibraryPromise;

    this.scannerLibraryPromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      let pollTimer = 0;
      let timeoutTimer = 0;

      const cleanup = () => {
        window.clearInterval(pollTimer);
        window.clearTimeout(timeoutTimer);
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };

      // index.html may already contain the deferred script. Polling handles
      // both an already-running script and a script that finishes after the
      // scanner button is pressed.
      pollTimer = window.setInterval(() => {
        if ((window as any).Html5Qrcode) succeed();
      }, 100);

      let script = document.getElementById('rmtl-html5-qrcode-script') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'rmtl-html5-qrcode-script';
        script.src = this.scannerLibraryUrl;
        script.async = true;
        script.onload = () => {
          if ((window as any).Html5Qrcode) succeed();
          else fail('Scanner library loaded without Html5Qrcode.');
        };
        script.onerror = () => fail('Scanner library failed to load.');
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', () => {
          if ((window as any).Html5Qrcode) succeed();
        }, { once: true });
        script.addEventListener('error', () => fail('Scanner library failed to load.'), { once: true });
      }

      timeoutTimer = window.setTimeout(() => {
        if ((window as any).Html5Qrcode) succeed();
        else fail('Scanner library loading timed out.');
      }, 12000);
    }).finally(() => {
      if (!(window as any).Html5Qrcode) this.scannerLibraryPromise = null;
    });

    return this.scannerLibraryPromise;
  }

  private scannerFormats(): any[] | undefined {
    const F = (window as any).Html5QrcodeSupportedFormats;
    if (!F) return undefined;

    if (this.scannerType === 'qr') return [F.QR_CODE];

    return [
      F.CODE_128,
      F.CODE_39,
      F.CODE_93,
      F.CODABAR,
      F.EAN_13,
      F.EAN_8,
      F.UPC_A,
      F.UPC_E,
      F.ITF,
      F.DATA_MATRIX,
      F.PDF_417
    ].filter((value: any) => value !== undefined && value !== null);
  }

  private createScannerInstance(): any {
    const Scanner = (window as any).Html5Qrcode;
    const formats = this.scannerFormats();
    const config: any = {};
    if (formats?.length) config.formatsToSupport = formats;

    return new Scanner(this.scannerElementId, config, false);
  }

  private scannerQrBox(): { width: number; height: number } {
    const reader = document.getElementById(this.scannerElementId);
    const availableWidth = Math.max(240, reader?.clientWidth || 320);

    if (this.scannerType === 'barcode') {
      return {
        width: Math.min(320, Math.floor(availableWidth * 0.82)),
        height: 120
      };
    }

    const size = Math.min(250, Math.floor(availableWidth * 0.72));
    return { width: size, height: size };
  }

  private chooseRearCamera(cameras: any[]): any | null {
    if (!Array.isArray(cameras) || !cameras.length) return null;

    return cameras.find((camera: any) =>
      /back|rear|environment|world|camera 0/i.test(String(camera?.label || ''))
    ) || cameras[cameras.length - 1] || cameras[0];
  }

  private async startWithPreferredCamera(
    scanConfig: any,
    onSuccess: (decodedText: string) => void,
    onFailure: () => void
  ): Promise<void> {
    // Firefox is more reliable with the simple facingMode string than with a
    // nested { ideal: ... } constraint. Keep the first request minimal so an
    // unsupported aspect ratio cannot prevent the camera from opening.
    try {
      await this.html5Scanner.start(
        { facingMode: 'environment' },
        scanConfig,
        onSuccess,
        onFailure
      );
      return;
    } catch (preferredCameraError) {
      await this.stopScannerEngine();

      // Fallback for phones that ignore facingMode: ask for the camera list,
      // choose the rear camera when labels are available, and start by id.
      const Scanner = (window as any).Html5Qrcode;
      const cameras = await Scanner.getCameras();
      const selected = this.chooseRearCamera(cameras);
      if (!selected?.id) throw preferredCameraError;

      this.html5Scanner = this.createScannerInstance();
      await this.html5Scanner.start(
        selected.id,
        scanConfig,
        onSuccess,
        onFailure
      );
    }
  }

  private async startCameraScanner(): Promise<void> {
    try {
      if (!this.isCameraContextAllowed()) {
        throw new Error('Camera access requires HTTPS (or localhost).');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not available in this browser.');
      }

      await this.ensureScannerLibrary();
      const reader = await this.waitForScannerElement();
      await this.stopScannerEngine();
      reader.replaceChildren();

      this.html5Scanner = this.createScannerInstance();

      const scanConfig: any = {
        fps: 10,
        qrbox: this.scannerQrBox(),
        disableFlip: false
      };

      const onSuccess = (decodedText: string) => void this.handleCameraScanSuccess(decodedText);
      const onFailure = () => { /* normal while no readable code is in frame */ };

      await this.startWithPreferredCamera(scanConfig, onSuccess, onFailure);

      this.scannerStatus = `Camera active — hold the ${this.scannerType === 'qr' ? 'QR code' : 'barcode'} steady inside the frame.`;
      this.scannerBusy = false;
    } catch (error: any) {
      console.error('Camera scanner error:', error);
      await this.stopScannerEngine();
      this.scannerBusy = false;
      this.scannerStatus = '';
      this.scannerError = this.cameraErrorMessage(error);
    }
  }

  private cameraErrorMessage(error: any): string {
    const name = String(error?.name || '');
    const message = String(error?.message || error || '');

    if (name === 'NotAllowedError' || /permission|denied|not allowed/i.test(message)) {
      return 'Camera permission was denied. Allow camera access for this site in Firefox, then press Retry Camera.';
    }
    if (name === 'NotFoundError' || /no camera|not found|requested device not found/i.test(message)) {
      return 'No camera was found. Connect a camera or use Scan Image / USB scanner.';
    }
    if (name === 'NotReadableError' || name === 'AbortError' || /in use|could not start video|starting video failed|hardware/i.test(message)) {
      return 'Firefox could not start the camera. Close other camera apps, wait two seconds, and press Retry Camera.';
    }
    if (name === 'OverconstrainedError' || /constraint|overconstrained/i.test(message)) {
      return 'The preferred rear-camera setting is not supported. Press Retry Camera to use another camera.';
    }
    if (/HTTPS|secure context/i.test(message)) {
      return 'Camera scanning requires HTTPS. Open the application through its HTTPS URL.';
    }
    if (/library|Html5Qrcode/i.test(message)) {
      return 'The QR/barcode decoder could not load. Check access to the scanner script and press Retry Camera.';
    }
    if (/view is not ready/i.test(message)) {
      return 'The scanner popup was not ready. Close it and open the scanner again.';
    }

    // Keep the actual browser error visible during rollout. This is much more
    // useful than a generic permission message when a specific phone fails.
    const detail = [name, message].filter(Boolean).join(': ');
    return detail
      ? `Unable to start scanning (${detail}). Press Retry Camera or use Scan Image.`
      : 'Unable to start scanning. Press Retry Camera or use Scan Image / USB scanner.';
  }

  async scanCodeImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.scannerError = '';
    this.scannerStatus = 'Reading image…';
    this.scannerBusy = true;
    this.scanHandled = false;

    try {
      await this.ensureScannerLibrary();
      await this.stopScannerEngine();
      this.html5Scanner = this.createScannerInstance();
      const decodedText = await this.html5Scanner.scanFile(file, true);
      await this.handleCameraScanSuccess(decodedText);
    } catch (error) {
      console.error('Image scan error:', error);
      this.scannerBusy = false;
      this.scannerStatus = '';
      this.scannerError = 'No readable QR code or barcode was found in that image. Use a sharper, well-lit image and try again.';
    }
  }

  private async handleCameraScanSuccess(value: string): Promise<void> {
    if (this.scanHandled) return;
    const scannedValue = this.normaliseScannedValue(value);
    if (!scannedValue) return;

    this.scanHandled = true;
    const target = this.scannerTarget;
    this.scannerStatus = `Code detected: ${scannedValue}`;
    await this.closeCameraScanner(false);

    if (target === 'CT') this.onCTScan(scannedValue);
    else this.onMeterScan(scannedValue);
  }

  private async stopScannerEngine(): Promise<void> {
    const scanner = this.html5Scanner;
    this.html5Scanner = null;
    if (!scanner) return;

    try { await scanner.stop(); } catch { /* scanner may not have started */ }
    try { await scanner.clear(); } catch { /* element may already be clear */ }
  }

  async closeCameraScanner(clearMessage = true): Promise<void> {
    await this.stopScannerEngine();
    this.scannerOpen = false;
    this.scannerBusy = false;
    this.scanHandled = false;
    if (clearMessage) {
      this.scannerError = '';
      this.scannerStatus = '';
    }
  }

  // ---------- Lifecycle ----------
  ngOnInit(): void {


    this.deviceService.getEnums().subscribe({
      next: (data) => {
        this.makes = data?.makes || [];
        this.capacities = data?.capacities || [];
        this.phases = data?.phases || [];
        this.phaseOptionsCache.clear();
        this.meter_categories = data?.meter_categories || [];
        this.meterTypes = data?.meter_types || [];
        this.meter_classes = data?.meter_classes || [];
        this.office_types = data?.office_types || [];
        this.ct_classes = data?.ct_classes || [];
        this.ct_ratios = data?.ct_ratios || [];
        this.connection_types = data?.connection_types || [];
        this.voltage_ratings = data?.voltage_ratings || ['230V'];
        this.current_ratings = data?.impkwh || [];
        this.device_testing_purpose = data?.test_report_types || ['ROUTINE'];
        this.meter_subcategories = data?.meter_sub_categories || [];
        this.initiators = data?.initiators || [];
        // this.meterDefaultPurpose = this.device_testing_purpose[0] || 'ROUTINE';


        // Defaults for serialRange
        this.serialRange.connection_type =
          this.serialRange.connection_type || (this.connection_types[0] || 'LT');
        this.serialRange.phase = this.coercePhaseForConn(
          this.serialRange.connection_type,
          this.serialRange.phase
        );

        // Defaults for CT meta
        Object.assign(this.ctMeta, {
          make: this.makes[0] || '',
          ct_class: this.ct_classes[0] || '',
          ct_ratio: this.ct_ratios[0] || '',
          capacity: this.capacities[0] || '',
          phase: 'THREE_PHASE_CT',
          connection_type: this.connection_types[0] || 'LT',
          device_testing_purpose: this.meterDefaultPurpose,
          initiator: this.initiators[0] || 'CIS'
        });

        // Defaults for meter serial range
        Object.assign(this.serialRange, {
          connection_type: this.connection_types[0] || 'LT',
          phase: this.phases[0] || 'SINGLE PHASE',
          make: this.makes[0] || '',
          capacity: this.capacities[0] || '',
          meter_category: this.meter_categories[0] || '',
          meter_class: this.meter_classes[0] || '',
          meter_type: this.meterTypes[0] || '',
          voltage_rating: this.voltage_ratings[0] || '230V',
          current_rating: this.current_ratings[0] || '5-30A',
          device_testing_purpose: this.meterDefaultPurpose,
          initiator: this.initiators[0] || 'CIS'
        });

        // UI defaults
        this.meterDefaultsUI = [
          { key: 'connection_type',        label: 'Conn. Type',  options: this.connection_types },
          { key: 'phase',                  label: 'Phase',       options: this.phases },
          { key: 'make',                   label: 'Make',        options: this.makes },
          { key: 'capacity',               label: 'Capacity',    options: this.capacities },
          { key: 'meter_class',            label: 'Class',       options: this.meter_classes },
          { key: 'meter_category',         label: 'Category',    options: this.meter_categories },
          { key: 'meter_type',             label: 'Meter Type',  options: this.meterTypes },
          { key: 'voltage_rating',         label: 'Voltage',     options: this.voltage_ratings },
          { key: 'current_rating',         label: 'ImpKWH',      options: this.current_ratings },
          { key: 'device_testing_purpose', label: 'Purpose',     options: this.device_testing_purpose },
          { key: 'initiator',              label: 'Initiator',   options: this.initiators }
        ];

        this.ctDefaultsUI = [
          { key: 'make',                   label: 'Make',        options: this.makes },
          { key: 'ct_class',               label: 'CT Class',    options: this.ct_classes },
          { key: 'ct_ratio',               label: 'CT Ratio',    options: this.ct_ratios },
          { key: 'device_testing_purpose', label: 'Purpose',     options: this.device_testing_purpose },
          { key: 'initiator',              label: 'Initiator',   options: this.initiators }

        ];

        // lab_id from localStorage / token
        const labIdStr = localStorage.getItem('currentLabId') ?? localStorage.getItem('lab_id');
        if (labIdStr && !isNaN(Number(labIdStr))) {
          this.labId = Number(labIdStr);
        } else {
          const token = localStorage.getItem('access_token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1] || ''));
              const raw = payload?.lab_id ?? payload?.labId ?? payload?.user?.lab_id;
              this.labId = (raw !== undefined && !isNaN(Number(raw))) ? Number(raw) : null;
            } catch {
              this.labId = null;
            }
          }
        }
      },
      error: () => this.showAlert('Error', 'Failed to load dropdown data.')
    });

    // IDs from token
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    // Lab info for PDF header
    if (this.currentLabId) {
      this.deviceService.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.lab_pdfheader_address || info?.lab_location,
            email: info?.lab_pdfheader_email || info?.lab_pdfheader_contact_no,
            phone: info?.lab_pdfheader_contact_no || info?.lab_location
          };

          // Push into PDF header used by InwardReceiptPdfService
          this.pdfHeader.labLine = this.labInfo.lab_name || '';
          this.pdfHeader.addressLine = this.labInfo.address || '';
          this.pdfHeader.email = this.labInfo.email || '';
          this.pdfHeader.phone = this.labInfo.phone || '';
        },
        error: () => {
          // Optional: keep header minimal if lab info fails
          this.pdfHeader.labLine = '';
          this.pdfHeader.addressLine = '';
          this.pdfHeader.email = '';
          this.pdfHeader.phone = '';
        }
      });
    }
  }

  toYMD(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  trackByValue = (_: number, value: string): string => value;
  trackByDefinition = (_: number, item: { key: string }): string => item.key;
  trackBySerial = (index: number): number => index;

  onDefaultsConnectionTypeChange(): void {
    const conn = this.serialRange.connection_type;
    this.serialRange.phase = this.coercePhaseForConn(conn, this.serialRange.phase);
  }

  onRowConnectionTypeChange(device: DeviceRow): void {
    device.phase = this.coercePhaseForConn(device.connection_type, device.phase);
  }

  ngAfterViewInit(): void {
    const modalEl = document.getElementById('alertModal');
    if (modalEl) this.alertInstance = new bootstrap.Modal(modalEl);
  }

  ngOnDestroy(): void {
    void this.closeCameraScanner();
  }

  // ---------- Source fetch ----------
  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.showAlert('Missing Input', 'Please select Source Type and enter Location/Store/Vendor Code.');
      return;
    }
    this.deviceService.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => (this.filteredSources = data),
      error: () => this.showAlert('Error', 'Failed to fetch source details. Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = null;
  }

  // ---------- Quick add (Meters) ----------
  quickAddMeter(): void {
    const sn = (this.quick.serial || '').trim();
    if (!sn) return;
    if (this.devices.some(d => (d.serial_number || '').trim() === sn)) return;
    this.devices.push({
      serial_number: sn,
      make: this.serialRange.make,
      capacity: this.serialRange.capacity,
      phase: this.serialRange.phase,
      connection_type: this.serialRange.connection_type,
      meter_category: this.serialRange.meter_category,
      meter_class: this.serialRange.meter_class || null,
      meter_type: this.serialRange.meter_type,
      voltage_rating: this.serialRange.voltage_rating,
      current_rating: this.serialRange.current_rating,
      device_testing_purpose: this.serialRange.device_testing_purpose,
      initiator: this.serialRange.initiator || this.initiators[0] || 'CIS',
      remark: null
    });
    this.quick.serial = '';
  }

  // ---------- Quick add (CT) ----------
  quickAddCT(): void {
    const sn = (this.ctQuick.serial || '').trim();
    if (!sn) return;
    if (this.cts.some(ct => (ct.serial_number || '').trim() === sn)) return;
    this.cts.push({
      serial_number: sn,
      ct_class: (this.ctMeta.ct_class || '').trim() || null,
      ct_ratio: (this.ctMeta.ct_ratio || '').trim() || null,
      make: this.ctMeta.make,
      phase: this.ctMeta.phase,
      connection_type: this.ctMeta.connection_type,
      device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
      initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
      remark: ''
    });

    this.ctQuick.serial = '';
  }

  // ---------- Meters ops ----------
  addDevice(): void {
    this.devices.push({
      serial_number: '',
      make: this.makes[0] || '',
      capacity: this.capacities[0] || '',
      phase: this.phases[0] || '',
      connection_type: this.connection_types[0] || 'LT',
      meter_category: this.meter_categories[0] || '',
      meter_class: this.meter_classes[0] || '',
      meter_type: this.meterTypes[0] || '',
      voltage_rating: this.voltage_ratings[0] || '230V',
      current_rating: this.current_ratings[0] || '5-30A',
      device_testing_purpose: this.meterDefaultPurpose,
      initiator: this.initiators[0] || 'CIS',
      remark: null
    });
  }
  removeDevice(index: number): void { this.devices.splice(index, 1); }
  clearMeters(): void { this.devices = []; }

  // ---------- CSV (Meters): only serial_number required ----------
  handleCSVUpload(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = (e.target.result as string) || '';
      const clean = text.replace(/^\uFEFF/, '').trim();
      if (!clean) return;

      const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) return;

      const hasHeader = /^serial(_|\s|-)?number/i.test(lines[0]) || /^serial/i.test(lines[0]);
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (const raw of dataLines) {
        if (!raw) continue;
        const cols = raw.split(',').map(c => c.trim());
        const serial_number = (cols[0] || '').trim();
        if (!serial_number) continue;
        if (this.devices.some(d => (d.serial_number || '').trim() === serial_number)) continue;

        this.devices.push({
          serial_number,
          make: this.serialRange.make,
          capacity: this.serialRange.capacity,
          phase: this.serialRange.phase,
          connection_type: this.serialRange.connection_type,
          meter_category: this.serialRange.meter_category,
          meter_class: (this.serialRange.meter_class || '').trim() || null,
          meter_type: this.serialRange.meter_type,
          voltage_rating: this.serialRange.voltage_rating,
          current_rating: this.serialRange.current_rating,
          device_testing_purpose: this.serialRange.device_testing_purpose || this.meterDefaultPurpose,
          initiator: this.serialRange.initiator || this.initiators[0] || 'CIS',
          remark: null,
          ct_class: (cols[12] || '').trim() || null,
          ct_ratio: (cols[13] || '').trim() || null,
        });
      }
    };
    reader.readAsText(file);
  }

  addSerialRange(): void {
    const { start, end } = this.serialRange;
    if (!start || !end || Number(start) > Number(end)) {
      this.showAlert('Invalid Range', 'Please provide a valid serial number range.');
      return;
    }
    for (let i = Number(start); i <= Number(end); i++) {
      const sn = i.toString();
      if (this.devices.some(d => (d.serial_number || '').trim() === sn)) continue;
      this.devices.push({
        serial_number: sn,
        make: this.serialRange.make,
        capacity: this.serialRange.capacity,
        phase: this.serialRange.phase,
        connection_type: this.serialRange.connection_type,
        meter_category: this.serialRange.meter_category,
        meter_class: this.serialRange.meter_class || null,
        meter_type: this.serialRange.meter_type,
        voltage_rating: this.serialRange.voltage_rating,
        current_rating: this.serialRange.current_rating,
        device_testing_purpose: this.serialRange.device_testing_purpose || this.meterDefaultPurpose,
        initiator: this.serialRange.initiator || this.initiators[0] || 'CIS',
        remark: (this.serialRange.remark || '').trim() || null
      });
    }
    this.serialRange.start = null;
    this.serialRange.end = null;
  }

  // ---------- CT ops ----------
  addCT(): void {
    this.cts.push({
      serial_number: this.ctMeta.serial_number,
      ct_class: this.ctMeta.ct_class || '',
      ct_ratio: this.ctMeta.ct_ratio || '',
      make: this.ctMeta.make,
      phase: this.ctMeta.phase,
      connection_type: this.ctMeta.connection_type,
      device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
      initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
      remark: ''
    });
  }
  removeCT(index: number): void { this.cts.splice(index, 1); }
  clearCTs(): void { this.cts = []; }

  addCTSerialRange(): void {
    const { start, end, ct_class, ct_ratio } = this.ctRange;
    if (!start || !end || Number(start) > Number(end)) {
      this.showAlert('Invalid Range', 'Please provide a valid CT serial number range.');
      return;
    }
    for (let i = Number(start); i <= Number(end); i++) {
      const sn = i.toString();
      if (this.cts.some(ct => (ct.serial_number || '').trim() === sn)) continue;
      this.cts.push({
        serial_number: sn,
        ct_class: this.ctMeta.ct_class || (ct_class || '').trim() || null,
        ct_ratio: this.ctMeta.ct_ratio || (ct_ratio || '').trim() || null,
        make: this.ctMeta.make,
        phase: this.ctMeta.phase,
        connection_type: this.ctMeta.connection_type,
        device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
        initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
        remark: ''
      });
    }
    this.ctRange = this.defaultCtRange();
  }

  // ---------- CSV (CTs): only serial_number required ----------
  handleCTCSVUpload(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const text = (e.target.result as string) || '';
      const clean = text.replace(/^\uFEFF/, '').trim();
      if (!clean) return;

      const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) return;

      const hasHeader = /^serial(_|\s|-)?number/i.test(lines[0]) || /^serial/i.test(lines[0]);
      const dataLines = hasHeader ? lines.slice(1) : lines;

      for (const raw of dataLines) {
        if (!raw) continue;
        const cols = raw.split(',').map(c => c.trim());
        const serial_number = (cols[0] || '').trim();
        if (!serial_number) continue;
        if (this.cts.some(ct => (ct.serial_number || '').trim() === serial_number)) continue;

        this.cts.push({
          serial_number,
          ct_class: (this.ctMeta.ct_class || '').trim() || null,
          ct_ratio: (this.ctMeta.ct_ratio || '').trim() || null,
          make: this.ctMeta.make,
          phase: this.ctMeta.phase,
          connection_type: this.ctMeta.connection_type,
          device_testing_purpose: this.ctMeta.device_testing_purpose || this.meterDefaultPurpose,
          initiator: this.ctMeta.initiator || this.initiators[0] || 'CIS',
          remark: ''
        });
      }
    };
    reader.readAsText(file);
  }

  // ---------- Validation helpers ----------
  private ensureSourceSelected(): boolean {
    if (!this.selectedSourceType || !this.selectedSourceName || !this.filteredSources) {
      this.showAlert('Missing Source Details', 'Please select Source Type, enter Location/Store/Vendor code, and click Fetch before submitting.');
      return false;
    }
    return true;
  }
  private ensureLabId(): boolean {
    if (this.labId === null || isNaN(Number(this.labId))) {
      this.showAlert('Missing Lab', 'lab_id not found. Please re-login so we can identify your lab.');
      return false;
    }
    return true;
  }
  private todayISO(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  private in(list: string[], v?: string | null) {
    return !v || !list.length || list.includes(v);
  }

  // ---------- Lab header mapping for PDF ----------
  private buildLabHeaderForReceipt() {
    return {
      lab_name: (this.labInfo?.lab_name || this.pdfHeader.labLine || null) as string | null,
      lab_address: (this.labInfo?.address || this.pdfHeader.addressLine || null) as string | null,
      lab_email: (this.labInfo?.email || this.pdfHeader.email || null) as string | null,
      lab_phone: (this.labInfo?.phone || this.pdfHeader.phone || null) as string | null
    };
  }

  // ---------- Submit: Meters ----------
  submitDevices(): void {
    if (!this.devices.length) {
      this.showAlert('No Rows', 'No meter rows to submit.');
      return;
    }
    if (!this.ensureSourceSelected() || !this.ensureLabId()) return;
    if (!this.inwardDate) {
      this.showAlert('Missing Inward Date', 'Please select an inward date.');
      return;
    }

    const cleaned = this.devices
      .map((d: DeviceRow, idx: number) => ({
        __row: idx + 1,
        serial_number: (d.serial_number || '').trim(),
        make: d.make,
        capacity: d.capacity,
        phase: d.phase,
        connection_type: d.connection_type,
        meter_category: d.meter_category,
        meter_class: (d.meter_class ?? '').trim() || null,
        meter_type: d.meter_type,
        voltage_rating: d.voltage_rating,
        current_rating: d.current_rating,
        ct_class: (d.ct_class ?? '').trim() || null,
        ct_ratio: (d.ct_ratio ?? '').trim() || null,
        device_testing_purpose: (d.device_testing_purpose || this.meterDefaultPurpose),
        initiator: d.initiator || this.initiators[0] || 'CIS',
        remark: (d.remark ?? '').toString().trim() || null
      }))
      .filter(d => d.serial_number);

    if (!cleaned.length) {
      this.showAlert('Invalid Data', 'Please provide at least one valid meter serial number.');
      return;
    }

    const bad = cleaned.filter(r =>
      !this.in(this.capacities, r.capacity) ||
      !this.in(this.phases, r.phase) ||
      !this.in(this.connection_types, r.connection_type) ||
      !this.in(this.meter_categories, r.meter_category) ||
      !this.in(this.meter_classes, r.meter_class ?? '') ||
      !this.in(this.meterTypes, r.meter_type) ||
      !this.in(this.voltage_ratings, r.voltage_rating) ||
      !this.in(this.current_ratings, r.current_rating) ||
      !this.in(this.initiators, r.initiator)
    );
    if (bad.length) {
      this.showAlert('Invalid values', 'Some selections are not in the allowed lists. Please correct and try again.');
      return;
    }

    const payload = cleaned.map((d: any) => ({
      device_type: 'METER',
      make: d.make,
      capacity: d.capacity || null,
      phase: d.phase || null,
      meter_category: d.meter_category || null,
      meter_class: d.meter_class || null,
      meter_type: d.meter_type || null,
      connection_type: d.connection_type || null,
      voltage_rating: d.voltage_rating || null,
      current_rating: d.current_rating || null,
      serial_number: d.serial_number,
      ct_class: d.ct_class || null,
      ct_ratio: d.ct_ratio || null,
      remark: d.remark,
      device_testing_purpose: d.device_testing_purpose,
      lab_id: this.labId,
      office_type: this.selectedSourceType || null,
      location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
      location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
      inward_date: this.inwardDate,
      date_of_entry: this.inwardDate,
      initiator: d.initiator,
      phases: d.phases

    }));

    this.deviceService.addnewdevice(payload).subscribe({
      next: (created: any): void => {
        const inwardNo = created?.[0]?.inward_number || '(generated)';
        this.showAlert('Success', `Meters added! Inward No: ${inwardNo} • Count: ${created.length}`);
        const items: InwardReceiptItem[] = created.map((p: any, idx: number) => ({
          sl: idx + 1,
          serial_number: p.serial_number,
          make: p.make,
          capacity: p.capacity ?? '',
          phase: p.phase ?? '',
          connection_type: p.connection_type ?? '',
          meter_category: p.meter_category ?? '',
          meter_type: p.meter_type ?? '',
          voltage_rating: p.voltage_rating ?? '',
          current_rating: p.current_rating ?? '',
          purpose: p.device_testing_purpose,
          remark: p.remark || ''
        }));

        const receipt: InwardReceiptData = {
          ...this.buildLabHeaderForReceipt(),
          lab_id: created?.[0]?.lab_id || '',
          office_type: created?.[0]?.office_type || '',
          location_code: created?.[0]?.location_code || '',
          location_name: created?.[0]?.location_name || '',
          inward_no: inwardNo,
          date_of_entry: created?.[0]?.inward_date || this.inwardDate,
          device_type: 'METER',
          total: items.length,
          items,
          serials_csv: items.map(i => i.serial_number).join(', ')
        };

        this.inwardPdf.download(
          receipt,
          {
            fileName: `Inward_Receipt_METER_${this.inwardDate}.pdf`,
            header: this.pdfHeader,
            showItemsTable: true
          }
        );
        this.devices = [];
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error while submitting meters.';
        this.showAlert('Error', msg);
      }
    });
  }

  // ---------- Submit: CTs ----------
  submitCTs(): void {
    if (!this.cts.length) {
      this.showAlert('No Rows', 'No CT rows to submit.');
      return;
    }
    if (!this.ensureSourceSelected() || !this.ensureLabId()) return;
    if (!this.inwardDate) {
      this.showAlert('Missing Inward Date', 'Please select an inward date.');
      return;
    }

    const cleaned = this.cts
      .map((ct: CTRow, idx: number) => ({
        __row: idx + 1,
        serial_number: (ct.serial_number || '').trim(),
        ct_class: (ct.ct_class ?? '').trim() || null,
        ct_ratio: (ct.ct_ratio ?? '').trim() || null,
        make: ct.make,
        connection_type: ct.connection_type,
        device_testing_purpose: (ct.device_testing_purpose || this.meterDefaultPurpose),
        initiator: ct.initiator || this.initiators[0] || 'CIS',
        remark: (ct.remark ?? '').trim() || null
      }))
      .filter(ct => ct.serial_number);

    if (!cleaned.length) {
      this.showAlert('Invalid Data', 'Please provide at least one valid CT serial number.');
      return;
    }

    const bad = cleaned.filter(r =>
      !this.in(this.connection_types, r.connection_type) ||
      !this.in(this.initiators, r.initiator)
    );
    if (bad.length) {
      this.showAlert('Invalid values', 'Some selections are not in the allowed lists. Please correct and try again.');
      return;
    }

    const payload = cleaned.map((ct: any) => ({
      device_type: 'CT',
      make: ct.make,
      capacity: ct.capacity || null,
      phase: ct.phase || null,
      meter_category: ct.meter_category || null,
      meter_class: ct.meter_class || null,
      meter_type: ct.meter_type || null,
      connection_type: ct.connection_type || null,
      voltage_rating: ct.voltage_rating || null,
      current_rating: ct.current_rating || null,
      serial_number: ct.serial_number,
      ct_class: ct.ct_class || null,
      ct_ratio: ct.ct_ratio || null,
      remark: ct.remark,
      device_testing_purpose: ct.device_testing_purpose,
      lab_id: this.labId,
      office_type: this.selectedSourceType || null,
      location_code: this.filteredSources?.code || this.filteredSources?.location_code || null,
      location_name: this.filteredSources?.name || this.filteredSources?.location_name || null,
      inward_date: this.inwardDate,
      date_of_entry: this.inwardDate,
      initiator: ct.initiator,
      phases: "THREE_PHASE_CT"
    }));

    this.deviceService.addnewdevice(payload).subscribe({
      next: (created: any): void => {
        const inwardNo = created?.[0]?.inward_number || '(generated)';
        this.showAlert('Success', `CTs added! Inward No: ${inwardNo} • Count: ${created.length}`);

        const items: InwardReceiptItem[] = created.map((p: any, idx: number) => ({
          sl: idx + 1,
          serial_number: p.serial_number,
          make: p.make,
          connection_type: p.connection_type ?? '',
          ct_class: p.ct_class ?? '',
          ct_ratio: p.ct_ratio ?? '',
          purpose: p.device_testing_purpose,
          remark: p.remark || ''
        }));

        const receipt: InwardReceiptData = {
          ...this.buildLabHeaderForReceipt(),   // ✅ lab_name, lab_address, lab_email, lab_phone

          lab_id: created?.[0]?.lab_id || '',
          office_type: created?.[0]?.office_type || '',
          location_code: created?.[0]?.location_code || '',
          location_name: created?.[0]?.location_name || '',
          inward_no: inwardNo,
          date_of_entry: created?.[0]?.inward_date || this.inwardDate,
          device_type: 'CT',
          total: items.length,
          items,
          serials_csv: items.map(i => i.serial_number).join(', ')
        };

        this.inwardPdf.download(
          receipt,
          {
            fileName: `Inward_Receipt_CT_${created?.[0]?.inward_date || this.inwardDate}.pdf`,
            header: this.pdfHeader,
            showItemsTable: true
          }
        );
        this.cts = [];
      },
      error: (err) => {
        const msg = err?.error?.detail || 'Error while submitting CTs.';
        this.showAlert('Error', msg);
      }
    });
  }

  // ---------- Duplicates ----------
  isDuplicateSerial(sn: string, type: 'METER' | 'CT'): boolean {
    if (!sn) return false;
    const list: Array<DeviceRow | CTRow> = type === 'METER' ? this.devices : this.cts;
    const s = sn.trim();
    const count = list.filter((r: any) => (r.serial_number || '').trim() === s).length;
    return count > 1;
  }

  // ---------- CSV Templates ----------
  downloadMeterCSVTemplate(): void {
    const header = 'serial_number\n';
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'meter_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }
  downloadCTCSVTemplate(): void {
    const header = 'serial_number\n';
    const blob = new Blob([header], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ct_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Modal helper ----------
  showAlert(title: string, message: string): void {
    this.alertTitle = title;
    this.alertMessage = message;
    if (this.alertInstance) this.alertInstance.show();
  }

  // ---------- Util ----------
  private defaultCtRange() {
    return {
      start: null as number | null,
      end: null as number | null,
      ct_class: '',
      ct_ratio: '',
      make: '',
      capacity: '',
      phase: '',
      connection_type: '',
      meter_category: '',
      meter_class: '',
      meter_type: '',
      voltage_rating: '',
      current_rating: '',
      remark: '',
      serial_number: '',
      device_testing_purpose: '',
      initiator: ''
    };
  }

  // Map of allowed phases by connection type
  private PhaseByConn: Record<string, string[]> = {
    LT: [
      'SINGLE PHASE',
      'THREE PHASE WHOLE CURRENT',
      'THREE PHASE CT OPERATED'
    ],
    HT: [
      'CT & PT OPERATED'
    ],
    OTHER: ['OTHER']
  };

  getPhaseOptions(connType?: string): string[] {
    const key = connType || '__ALL__';
    const cached = this.phaseOptionsCache.get(key);
    if (cached) return cached;

    const base = (connType && this.PhaseByConn[connType]) ? this.PhaseByConn[connType] : this.phases;
    const options = base.filter(p => this.phases.includes(p));
    this.phaseOptionsCache.set(key, options);
    return options;
  }

  private coercePhaseForConn(connType: string, currentPhase?: string | null): string {
    const allowed = this.getPhaseOptions(connType);
    if (!allowed.length) return currentPhase || '';
    return currentPhase && allowed.includes(currentPhase) ? currentPhase : allowed[0];
  }
}
