import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/core/auth.service';
import { TestingBench, UserPublic } from 'src/app/interface/models';
import { ApiServicesService } from 'src/app/services/api-services.service';

import {
  SolarNetMeterCertificatePdfService,
  SolarHeader as NormalSolarHeader,
  SolarRow as NormalSolarRow
} from 'src/app/shared/solarnetmeter-certificate-pdf.service';

import {
  SolarNetMeterCertificatePdfService_1,
  SolarHeader as SmartSolarHeader,
  SolarRow as SmartSolarRow
} from 'src/app/shared/solarnetmeter-certificate-pdf.service_smart';

interface MeterDevice {
  id: number;
  serial_number: string;
  make?: string;
  capacity?: string;
  meter_type?: string | null;
  location_code?: string | null;
  location_name?: string | null;
  phase?: string | null;
}

interface AssignmentItem {
  id: number;
  device_id: number;
  device?: MeterDevice | null;
  testing_bench?: TestingBench | null;
  user_assigned?: UserPublic | null;
  assigned_by_user?: UserPublic | null;
}

interface CertRow {
  _open?: boolean;
  assignment_id?: number;
  device_id?: number;
  notFound?: boolean;
  testshifts?: string | null;

  consumer_name: string;
  address: string;
  meter_make: string;
  meter_sr_no: string;
  meter_capacity: string;
  meter_type?: string | null;

  certificate_no?: string;
  date_of_testing?: string;

  testing_fees?: any;
  mr_no?: string;
  mr_date?: string;
  ref_no?: string;

  starting_reading?: number;
  final_reading_r?: number;
  final_reading_e?: number;
  difference?: number;

  start_reading_import?: number | null;
  final_reading__import?: number | null;
  difference__import?: number | null;

  start_reading_export?: number | null;
  final_reading_export?: number | null;
  difference_export?: number | null;

  final_Meter_Difference?: number | null;

  import_ref_start_reading?: number | null;
  import_ref_end_reading?: number | null;
  _import_delta_ref?: number | null;

  export_ref_start_reading?: number | null;
  export_ref_end_reading?: number | null;
  _export_delta_ref?: number | null;

  error_percentage_import?: number | null;
  error_percentage_export?: number | null;

  physical_condition_of_device?: string | null;
  seal_status?: string | null;
  meter_glass_cover?: string | null;
  terminal_block?: string | null;
  meter_body?: string | null;

  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_error_percentage?: number | null;
  _shunt_delta_meter?: number | null;
  _shunt_delta_ref?: number | null;

  shunt_current_test?: string | null;
  shunt_creep_test?: string | null;
  shunt_dail_test?: string | null;

  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_error_percentage?: number | null;
  _nutral_delta_meter?: number | null;
  _nutral_delta_ref?: number | null;

  nutral_current_test?: string | null;
  nutral_creep_test?: string | null;
  nutral_dail_test?: string | null;

  import_upf_100_imax?: string | null;
  import_upf_100_ib?: string | null;
  import_upf_5_ib?: string | null;

  import_lag_05_100_imax?: string | null;
  import_lag_05_100_ib?: string | null;
  import_lag_05_10_ib?: string | null;

  import_lead_08_100_imax?: string | null;
  import_lead_08_100_ib?: string | null;
  import_lead_08_10_ib?: string | null;

  export_upf_100_imax?: string | null;
  export_upf_100_ib?: string | null;
  export_upf_5_ib?: string | null;

  export_lag_05_100_imax?: string | null;
  export_lag_05_100_ib?: string | null;
  export_lag_05_10_ib?: string | null;

  export_lead_08_100_imax?: string | null;
  export_lead_08_100_ib?: string | null;
  export_lead_08_10_ib?: string | null;

  dial_sr_import?: string | null;
  dial_sr_export?: string | null;
  dial_fr_import?: string | null;
  dial_fr_export?: string | null;
  dial_dosage_import?: string | null;
  dial_dosage_export?: string | null;
  dial_result_import?: string | null;
  dial_result_export?: string | null;

  net_imp_export?: string | null;
  report_version?: string | null;

  final_remarks?: string;
  remark?: string;
  test_result?: string;
}

type ModalAction = 'submit' | null;

interface ModalState {
  open: boolean;
  title: string;
  action: ModalAction;
  payload?: any;
  message?: string;
}

@Component({
  selector: 'app-rmtl-add-testreport-solarnetmeer',
  templateUrl: './rmtl-add-testreport-solarnetmeer.component.html',
  styleUrls: ['./rmtl-add-testreport-solarnetmeer.component.css']
})
export class RmtlAddTestreportSolarnetmeerComponent implements OnInit {
  reportversion = '1.0';
  header = {
    location_code: '',
    location_name: '',
    testing_bench: '-',
    testing_user: '-',
    approving_user: '-',
    date: '-',
    phase: '-'
  };

  test_methods: any[] = [];
  test_statuses: any[] = [];
  testMethod: string | null = null;
  testStatus: string | null = null;
  testshifts: string | null = null;
  shifts: string[] = [];

  channelView: 'SHUNT' | 'NUTRAL' | 'BOTH' = 'BOTH';

  testing_bench: string = '-';
  testing_user: string = '-';
  approving_user: string = '-';

  leftLogoUrl: string = '';
  rightLogoUrl: string = '';

  device_status: 'ASSIGNED' = 'ASSIGNED';
  currentUserId: any;
  currentLabId: any;
  loading = false;

  private serialIndex: Record<
    string,
    {
      make?: string;
      capacity?: string;
      meter_type?: string | null;
      device_id: number;
      assignment_id: number;
    }
  > = {};

  filterText = '';
  rows: CertRow[] = [this.emptyRow()];

  submitting = false;
  modal: ModalState = { open: false, title: '', action: null };

  banner: {
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    _t?: any;
  } = {
    show: false,
    type: 'info',
    message: ''
  };

  office_types: any;
  commentby_testers: any;
  test_results: any;

  selectedSourceType: any;
  selectedSourceName: string = '';
  filteredSources: any;

  asgPicker = {
    open: false,
    list: [] as AssignmentItem[],
    filter: '',
    selected: {} as Record<number, boolean>,
    replaceExisting: true
  };

  labInfo: {
    lab_name?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    left_logo_url?: string | null;
    right_logo_url?: string | null;
  } | null = null;

  private pdfMode: 'download' | 'print' = 'download';

  device_testing_purpose: any;
  device_type: any;
  testing_request_types: any;
  fees_mtr_cts: any;
  test_dail_current_cheaps: any;
  physical_conditions: any;
  seal_statuses: any;
  glass_covers: any;
  terminal_blocks: any;
  meter_bodies: any;
  makes: any;
  capacities: any;

  constructor(
    private api: ApiServicesService,
    private pdfSvc: SolarNetMeterCertificatePdfService,
    private smartPdfSvc: SolarNetMeterCertificatePdfService_1,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.device_type = 'METER';
    this.device_testing_purpose = 'SOLAR_NETMETER';
    this.currentUserId = this.authService.getuseridfromtoken();
    this.currentLabId = this.authService.getlabidfromtoken();

    this.api.getEnums().subscribe({
      next: (d) => {
        this.test_methods = d?.test_methods || [];
        this.test_statuses = d?.test_statuses || [];
        this.office_types = d?.office_types || [];
        this.commentby_testers = d?.commentby_testers || [];
        this.test_results = d?.test_results || [];
        this.physical_conditions = d?.physical_conditions || [];
        this.seal_statuses = d?.seal_statuses || [];
        this.glass_covers = d?.glass_covers || [];
        this.terminal_blocks = d?.terminal_blocks || [];
        this.meter_bodies = d?.meter_bodies || [];
        this.makes = d?.makes || [];
        this.capacities = d?.capacities || [];
        this.shifts = d?.labshifts || [];

        this.device_testing_purpose =
          d?.test_report_types?.SOLAR_NETMETER ??
          d?.test_report_types?.SOLAR_NET_METER ??
          d?.test_report_types?.SOLAR_NET_MEER ??
          'SOLAR_NETMETER';

        this.device_type = d?.device_types?.METER ?? 'METER';
        this.testing_request_types = d?.testing_request_types || [];
        this.fees_mtr_cts = d?.fees_mtr_cts || [];
        this.test_dail_current_cheaps = d?.test_dail_current_cheaps || [];
      }
    });

    if (this.currentLabId) {
      this.api.getLabInfo(this.currentLabId).subscribe({
        next: (info: any) => {
          this.labInfo = {
            lab_name: info?.lab_pdfheader_name || info?.lab_name,
            address: info?.lab_pdfheader_address || info?.lab_location,
            email: info?.lab_pdfheader_email || info?.lab_pdfheader_contact_no,
            phone: info?.lab_pdfheader_contact_no || info?.lab_location,
            left_logo_url: info?.left_logo_url || null,
            right_logo_url: info?.right_logo_url || null
          };
          if (this.labInfo.left_logo_url) this.leftLogoUrl = this.labInfo.left_logo_url!;
          if (this.labInfo.right_logo_url) this.rightLogoUrl = this.labInfo.right_logo_url!;
        },
        error: () => {}
      });
    }

    this.reloadAssigned(false);
  }

  isSmartSolarMeter(row: CertRow): boolean {
    return (row.meter_type || '').trim().toUpperCase() === 'SMART METER';
  }

  private validateContext(): { ok: boolean; msg?: string } {
    if (!this.currentUserId) return { ok: false, msg: 'Missing user_id — please sign in again.' };
    if (!this.currentLabId) return { ok: false, msg: 'Missing lab_id — select a lab.' };
    if (!this.device_type) return { ok: false, msg: 'Missing device_type — refresh enums.' };
    if (!this.device_testing_purpose) {
      return { ok: false, msg: 'Missing device_testing_purpose — refresh enums.' };
    }
    return { ok: true };
  }

  private validate(): { ok: boolean; msg?: string } {
    const ctx = this.validateContext();
    if (!ctx.ok) return ctx;

    if (!this.testMethod || !this.testStatus) {
      return { ok: false, msg: 'Select Test Method and Test Status.' };
    }

    const rows = (this.rows || []).filter((r) => (r.meter_sr_no || '').trim());
    if (!rows.length) {
      return { ok: false, msg: 'Add at least one device row with serial number.' };
    }

    const requireText = (value: any, label: string, rowNo: number) => {
      if (!value || String(value).trim() === '' || value === 'null') {
        throw new Error(`Row #${rowNo}: ${label} is required.`);
      }
    };

    const requireNumber = (value: any, label: string, rowNo: number) => {
      const n = this.numOrNull(value);
      if (n === null) {
        throw new Error(`Row #${rowNo}: ${label} is required.`);
      }
    };

    const requireNotNull = (value: any, label: string, rowNo: number) => {
      if (value === null || value === undefined || value === '') {
        throw new Error(`Row #${rowNo}: ${label} is required.`);
      }
    };

    try {
      rows.forEach((r, idx) => {
        const rowNo = idx + 1;

        if (r.notFound) {
          throw new Error(`Row #${rowNo}: Meter Sr. No. must be from assigned list.`);
        }

        requireText(r.meter_sr_no, 'Meter Sr. No.', rowNo);
        requireText(r.meter_make, 'Meter Make', rowNo);
        requireText(r.meter_capacity, 'Meter Capacity', rowNo);
        requireNumber(r.device_id, 'Device ID (assignment)', rowNo);
        requireNumber(r.assignment_id, 'Assignment ID', rowNo);

        requireText(r.consumer_name, 'Consumer Name', rowNo);
        requireText(r.address, 'Full Address', rowNo);
        requireText(r.date_of_testing, 'Date of Testing', rowNo);

        requireText(r.testing_fees, 'Testing Fees', rowNo);
        requireText(r.mr_no, 'M.R. No / Online Txn No', rowNo);
        requireText(r.mr_date, 'Date of Payment', rowNo);

        requireText(r.shunt_current_test, 'Current Test Result (SHUNT)', rowNo);
        requireText(r.shunt_creep_test, 'Creep Test Result (SHUNT)', rowNo);
        requireText(r.shunt_dail_test, 'Dial Test Result (SHUNT)', rowNo);

        if (this.isSmartSolarMeter(r)) {
          requireText(r.import_upf_100_imax, 'Import UPF 100% IMAX', rowNo);
          requireText(r.import_upf_100_ib, 'Import UPF 100% IB', rowNo);
          requireText(r.import_upf_5_ib, 'Import UPF 5% IB', rowNo);

          requireText(r.import_lag_05_100_imax, 'Import 0.5 LAG 100% IMAX', rowNo);
          requireText(r.import_lag_05_100_ib, 'Import 0.5 LAG 100% IB', rowNo);
          requireText(r.import_lag_05_10_ib, 'Import 0.5 LAG 10% IB', rowNo);

          requireText(r.import_lead_08_100_imax, 'Import 0.8 LEAD 100% IMAX', rowNo);
          requireText(r.import_lead_08_100_ib, 'Import 0.8 LEAD 100% IB', rowNo);
          requireText(r.import_lead_08_10_ib, 'Import 0.8 LEAD 10% IB', rowNo);

          requireText(r.export_upf_100_imax, 'Export UPF 100% IMAX', rowNo);
          requireText(r.export_upf_100_ib, 'Export UPF 100% IB', rowNo);
          requireText(r.export_upf_5_ib, 'Export UPF 5% IB', rowNo);

          requireText(r.export_lag_05_100_imax, 'Export 0.5 LAG 100% IMAX', rowNo);
          requireText(r.export_lag_05_100_ib, 'Export 0.5 LAG 100% IB', rowNo);
          requireText(r.export_lag_05_10_ib, 'Export 0.5 LAG 10% IB', rowNo);

          requireText(r.export_lead_08_100_imax, 'Export 0.8 LEAD 100% IMAX', rowNo);
          requireText(r.export_lead_08_100_ib, 'Export 0.8 LEAD 100% IB', rowNo);
          requireText(r.export_lead_08_10_ib, 'Export 0.8 LEAD 10% IB', rowNo);

          requireText(r.dial_sr_import, 'Dial SR Import', rowNo);
          requireText(r.dial_sr_export, 'Dial SR Export', rowNo);
          requireText(r.dial_fr_import, 'Dial FR Import', rowNo);
          requireText(r.dial_fr_export, 'Dial FR Export', rowNo);
          requireText(r.dial_dosage_import, 'Dial Dosage Import', rowNo);
          requireText(r.dial_dosage_export, 'Dial Dosage Export', rowNo);
          requireText(r.dial_result_import, 'Dial Result Import', rowNo);
          requireText(r.dial_result_export, 'Dial Result Export', rowNo);
          requireText(r.net_imp_export, 'Net Imp Export', rowNo);
        }

        requireText(r.final_remarks, 'Final Remark / Observation', rowNo);
        requireText(r.test_result, 'Test Result', rowNo);
      });
    } catch (e: any) {
      return { ok: false, msg: e.message || 'Row validation failed.' };
    }

    this.header.testing_bench = (this.header.testing_bench || this.testing_bench || '').trim() || '-';
    this.header.testing_user = (this.header.testing_user || this.testing_user || '').trim() || '-';
    this.header.approving_user =
      (this.header.approving_user || this.approving_user || '').trim() || '-';

    this.testing_bench = this.header.testing_bench;
    this.testing_user = this.header.testing_user;
    this.approving_user = this.header.approving_user;

    if (!this.header.location_name || !this.header.location_code) {
      return {
        ok: false,
        msg: 'Zone / DC details are required — pick assigned meters or load source first.'
      };
    }

    return { ok: true };
  }

  fetchButtonData(): void {
    if (!this.selectedSourceType || !this.selectedSourceName) {
      this.showBanner('warning', 'Missing Input — Select a source type and enter code.');
      return;
    }
    this.api.getOffices(this.selectedSourceType, this.selectedSourceName).subscribe({
      next: (data) => {
        this.filteredSources = data;
        this.header.location_name = this.filteredSources?.name ?? '';
        this.header.location_code = this.filteredSources?.code ?? '';
        this.showBanner('success', 'Office/Store/Vendor loaded.');
      },
      error: () => this.showBanner('error', 'Lookup failed — Check the code and try again.')
    });
  }

  onSourceTypeChange(): void {
    this.selectedSourceName = '';
    this.filteredSources = [];
  }

  get matchedCount() {
    return (this.rows ?? []).filter((r) => !!r.meter_sr_no && !r.notFound).length;
  }

  get unknownCount() {
    return (this.rows ?? []).filter((r) => !!r.notFound).length;
  }

  private emptyRow(seed?: Partial<CertRow>): CertRow {
    return {
      _open: false,
      consumer_name: '',
      address: '',
      meter_make: '',
      meter_sr_no: '',
      meter_capacity: '',
      meter_type: null,
      test_result: '',

      testing_fees: '',
      mr_no: '',
      mr_date: '',
      ref_no: '',

      start_reading_import: null,
      final_reading__import: null,
      difference__import: null,
      start_reading_export: null,
      final_reading_export: null,
      difference_export: null,
      final_Meter_Difference: null,

      import_ref_start_reading: null,
      import_ref_end_reading: null,
      _import_delta_ref: null,
      export_ref_start_reading: null,
      export_ref_end_reading: null,
      _export_delta_ref: null,
      error_percentage_import: null,
      error_percentage_export: null,

      physical_condition_of_device: null,
      seal_status: null,
      meter_glass_cover: null,
      terminal_block: null,
      meter_body: null,

      shunt_reading_before_test: null,
      shunt_reading_after_test: null,
      shunt_ref_start_reading: null,
      shunt_ref_end_reading: null,
      shunt_error_percentage: null,
      _shunt_delta_meter: null,
      _shunt_delta_ref: null,
      shunt_current_test: null,
      shunt_creep_test: null,
      shunt_dail_test: null,

      nutral_reading_before_test: null,
      nutral_reading_after_test: null,
      nutral_ref_start_reading: null,
      nutral_ref_end_reading: null,
      nutral_error_percentage: null,
      _nutral_delta_meter: null,
      _nutral_delta_ref: null,
      nutral_current_test: null,
      nutral_creep_test: null,
      nutral_dail_test: null,

      import_upf_100_imax: null,
      import_upf_100_ib: null,
      import_upf_5_ib: null,

      import_lag_05_100_imax: null,
      import_lag_05_100_ib: null,
      import_lag_05_10_ib: null,

      import_lead_08_100_imax: null,
      import_lead_08_100_ib: null,
      import_lead_08_10_ib: null,

      export_upf_100_imax: null,
      export_upf_100_ib: null,
      export_upf_5_ib: null,

      export_lag_05_100_imax: null,
      export_lag_05_100_ib: null,
      export_lag_05_10_ib: null,

      export_lead_08_100_imax: null,
      export_lead_08_100_ib: null,
      export_lead_08_10_ib: null,

      dial_sr_import: null,
      dial_sr_export: null,
      dial_fr_import: null,
      dial_fr_export: null,
      dial_dosage_import: null,
      dial_dosage_export: null,
      dial_result_import: null,
      dial_result_export: null,

      net_imp_export: null,
      report_version: null,

      final_remarks: '',
      remark: '',

      ...seed
    };
  }

  private rebuildSerialIndex(asg: AssignmentItem[]) {
    this.serialIndex = {};
    for (const a of asg) {
      const d = a?.device ?? null;
      const s = (d?.serial_number || '').toUpperCase().trim();
      if (!s) continue;
      this.serialIndex[s] = {
        make: d?.make || '',
        capacity: d?.capacity || '',
        meter_type: d?.meter_type || null,
        device_id: d?.id ?? a.device_id ?? 0,
        assignment_id: a?.id ?? 0
      };
    }
  }

  reloadAssigned(replaceRows: boolean = true) {
    const v = this.validateContext();
    if (!v.ok) {
      this.showBanner('warning', 'Context error — ' + v.msg!);
      return;
    }

    this.loading = true;

    this.api
      .getAssignedMeterList(
        this.device_status,
        this.currentUserId,
        this.currentLabId,
        this.device_testing_purpose,
        this.device_type
      )
      .subscribe({
        next: (data: any) => {
          let asg: AssignmentItem[] = Array.isArray(data)
            ? data
            : Array.isArray(data?.results)
            ? data.results
            : [];

          asg = asg.sort((a, b) => {
            const ma = (a.device?.make || '').toLowerCase();
            const mb = (b.device?.make || '').toLowerCase();
            if (ma !== mb) return ma.localeCompare(mb);
            return (a.device?.serial_number || '').localeCompare(b.device?.serial_number || '');
          });

          this.rebuildSerialIndex(asg);
          this.asgPicker.list = asg;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.showBanner('error', 'Reload failed — Could not fetch assigned meters.');
        }
      });
  }

  onSerialChanged(i: number, serial: string) {
    const key = (serial || '').toUpperCase().trim();
    const row = this.rows[i];
    const hit = this.serialIndex[key];

    if (hit) {
      row.meter_make = hit.make || '';
      row.meter_capacity = hit.capacity || '';
      row.meter_type = hit.meter_type || null;
      row.device_id = hit.device_id || 0;
      row.assignment_id = hit.assignment_id || 0;
      row.notFound = false;
    } else {
      row.meter_make = '';
      row.meter_capacity = '';
      row.meter_type = null;
      row.device_id = 0;
      row.assignment_id = 0;
      row.notFound = key.length > 0;
    }
  }

  addRow() {
    this.rows.push(this.emptyRow());
  }

  removeRow(i: number) {
    if (i >= 0 && i < this.rows.length) {
      this.rows.splice(i, 1);
      if (!this.rows.length) this.rows.push(this.emptyRow());
    }
  }

  trackByRow(i: number, r: CertRow) {
    return `${r.assignment_id || 0}_${r.device_id || 0}_${r.meter_sr_no || ''}_${i}`;
  }

  displayRows(): CertRow[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.rows;
    return this.rows.filter(
      (r) =>
        (r.meter_sr_no || '').toLowerCase().includes(q) ||
        (r.meter_make || '').toLowerCase().includes(q) ||
        (r.consumer_name || '').toLowerCase().includes(q)
    );
  }

  recompute(i: number) {
    const r = this.rows[i];
    const a = Number(r.final_reading_r ?? 0);
    const b = Number(r.starting_reading ?? 0);
    const v = isFinite(a) && isFinite(b) ? +(a - b).toFixed(4) : undefined;
    r.difference = v as any;
  }

  recomputeIE(i: number) {
    const r = this.rows[i];

    const impStart = this.numOrNull(r.start_reading_import);
    const impFinal = this.numOrNull(r.final_reading__import);
    const expStart = this.numOrNull(r.start_reading_export);
    const expFinal = this.numOrNull(r.final_reading_export);

    const impDiff = impStart != null && impFinal != null ? this.round4(impFinal - impStart) : null;
    const expDiff = expStart != null && expFinal != null ? this.round4(expFinal - expStart) : null;

    r.difference__import = impDiff;
    r.difference_export = expDiff;

    const impRefStart = this.numOrNull(r.import_ref_start_reading);
    const impRefEnd = this.numOrNull(r.import_ref_end_reading);
    const expRefStart = this.numOrNull(r.export_ref_start_reading);
    const expRefEnd = this.numOrNull(r.export_ref_end_reading);

    const impRefDelta =
      impRefStart != null && impRefEnd != null ? this.round4(impRefEnd - impRefStart) : null;
    const expRefDelta =
      expRefStart != null && expRefEnd != null ? this.round4(expRefEnd - expRefStart) : null;

    r._import_delta_ref = impRefDelta;
    r._export_delta_ref = expRefDelta;

    if (impDiff != null && impRefDelta != null && impRefDelta !== 0) {
      r.error_percentage_import = this.round2(((impDiff - impRefDelta) / impRefDelta) * 100);
    } else {
      r.error_percentage_import = null;
    }

    if (expDiff != null && expRefDelta != null && expRefDelta !== 0) {
      r.error_percentage_export = this.round2(((expDiff - expRefDelta) / expRefDelta) * 100);
    } else {
      r.error_percentage_export = null;
    }

    if (impDiff != null || expDiff != null) {
      const fin = (impDiff ?? 0) - (expDiff ?? 0);
      r.final_Meter_Difference = this.round4(fin);
    } else {
      r.final_Meter_Difference = null;
    }
  }

  recomputeChannel(i: number) {
    const r = this.rows[i];

    const sh_m_start = this.numOrNull(r.shunt_reading_before_test);
    const sh_m_final = this.numOrNull(r.shunt_reading_after_test);
    const sh_r_start = this.numOrNull(r.shunt_ref_start_reading);
    const sh_r_final = this.numOrNull(r.shunt_ref_end_reading);

    const sh_m_delta =
      sh_m_start != null && sh_m_final != null ? this.round4(sh_m_final - sh_m_start) : null;
    const sh_r_delta =
      sh_r_start != null && sh_r_final != null ? this.round4(sh_r_final - sh_r_start) : null;

    r._shunt_delta_meter = sh_m_delta;
    r._shunt_delta_ref = sh_r_delta;

    if (sh_m_delta != null && sh_r_delta != null && sh_r_delta !== 0) {
      r.shunt_error_percentage = this.round2(((sh_m_delta - sh_r_delta) / sh_r_delta) * 100);
    } else {
      r.shunt_error_percentage = null;
    }

    const nu_m_start = this.numOrNull(r.nutral_reading_before_test);
    const nu_m_final = this.numOrNull(r.nutral_reading_after_test);
    const nu_r_start = this.numOrNull(r.nutral_ref_start_reading);
    const nu_r_final = this.numOrNull(r.nutral_ref_end_reading);

    const nu_m_delta =
      nu_m_start != null && nu_m_final != null ? this.round4(nu_m_final - nu_m_start) : null;
    const nu_r_delta =
      nu_r_start != null && nu_r_final != null ? this.round4(nu_r_final - nu_r_start) : null;

    r._nutral_delta_meter = nu_m_delta;
    r._nutral_delta_ref = nu_r_delta;

    if (nu_m_delta != null && nu_r_delta != null && nu_r_delta !== 0) {
      r.nutral_error_percentage = this.round2(((nu_m_delta - nu_r_delta) / nu_r_delta) * 100);
    } else {
      r.nutral_error_percentage = null;
    }
  }

  private numOrNull(v: any) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  }

  private isoOn(dateStr?: string) {
    if (!dateStr || dateStr === '-' || dateStr === 'null') {
      return new Date().toISOString();
    }
    const d = new Date(dateStr + 'T10:00:00');
    if (isNaN(d.getTime())) {
      return new Date().toISOString();
    }
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  }

  private round4(v: number) {
    return +v.toFixed(4);
  }

  private round2(v: number) {
    return +v.toFixed(2);
  }

  private buildPayload(): any[] {
    const requester = this.header.location_name || this.filteredSources?.name || null;

    return (this.rows || [])
      .filter((r) => (r.meter_sr_no || '').trim())
      .map((r) => ({
        device_id: r.device_id ?? 0,
        assignment_id: r.assignment_id ?? 0,

        start_datetime: this.isoOn(r.date_of_testing),
        end_datetime: this.isoOn(r.date_of_testing),

        physical_condition_of_device: r.physical_condition_of_device || null,
        seal_status: r.seal_status || null,
        meter_glass_cover: r.meter_glass_cover || null,
        terminal_block: r.terminal_block || null,
        meter_body: r.meter_body || null,
        other: null,
        is_burned: false,

        reading_before_test: this.numOrNull(r.starting_reading),
        reading_after_test: this.numOrNull(r.final_reading_r),
        ref_start_reading: null,
        ref_end_reading: null,
        error_percentage: null,

        start_reading_import: this.numOrNull(r.start_reading_import),
        final_reading__import: this.numOrNull(r.final_reading__import),
        difference__import: this.numOrNull(r.difference__import),

        start_reading_export: this.numOrNull(r.start_reading_export),
        final_reading_export: this.numOrNull(r.final_reading_export),
        difference_export: this.numOrNull(r.difference_export),

        import_ref_start_reading: this.numOrNull(r.import_ref_start_reading),
        import_ref_end_reading: this.numOrNull(r.import_ref_end_reading),
        export_ref_start_reading: this.numOrNull(r.export_ref_start_reading),
        export_ref_end_reading: this.numOrNull(r.export_ref_end_reading),

        final_Meter_Difference: this.numOrNull(r.final_Meter_Difference),
        error_percentage_import: this.numOrNull(r.error_percentage_import),
        error_percentage_export: this.numOrNull(r.error_percentage_export),

        shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
        shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test),
        shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading),
        shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading),
        shunt_error_percentage: this.numOrNull(r.shunt_error_percentage),

        shunt_current_test: r.shunt_current_test || null,
        shunt_creep_test: r.shunt_creep_test || null,
        shunt_dail_test: r.shunt_dail_test || null,

        nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
        nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test),
        nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading),
        nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading),
        nutral_error_percentage: this.numOrNull(r.nutral_error_percentage),

        nutral_current_test: r.nutral_current_test || null,
        nutral_creep_test: r.nutral_creep_test || null,
        nutral_dail_test: r.nutral_dail_test || null,

        meter_type: r.meter_type || null,

        import_upf_100_imax: this.numOrNull(r.import_upf_100_imax),
        import_upf_100_ib: this.numOrNull(r.import_upf_100_ib),
        import_upf_5_ib: this.numOrNull(r.import_upf_5_ib),

        import_lag_05_100_imax: this.numOrNull(r.import_lag_05_100_imax),
        import_lag_05_100_ib: this.numOrNull(r.import_lag_05_100_ib),
        import_lag_05_10_ib: this.numOrNull(r.import_lag_05_10_ib),

        import_lead_08_100_imax: this.numOrNull(r.import_lead_08_100_imax),
        import_lead_08_100_ib: this.numOrNull(r.import_lead_08_100_ib),
        import_lead_08_10_ib: this.numOrNull(r.import_lead_08_10_ib),

        export_upf_100_imax: this.numOrNull(r.export_upf_100_imax),
        export_upf_100_ib: this.numOrNull(r.export_upf_100_ib),
        export_upf_5_ib: this.numOrNull(r.export_upf_5_ib),

        export_lag_05_100_imax: this.numOrNull(r.export_lag_05_100_imax),
        export_lag_05_100_ib: this.numOrNull(r.export_lag_05_100_ib),
        export_lag_05_10_ib: this.numOrNull(r.export_lag_05_10_ib),

        export_lead_08_100_imax: this.numOrNull(r.export_lead_08_100_imax),
        export_lead_08_100_ib: this.numOrNull(r.export_lead_08_100_ib),
        export_lead_08_10_ib: this.numOrNull(r.export_lead_08_10_ib),

        dial_sr_import: this.numOrNull(r.dial_sr_import),
        dial_sr_export: this.numOrNull(r.dial_sr_export),
        dial_fr_import: this.numOrNull(r.dial_fr_import),
        dial_fr_export: this.numOrNull(r.dial_fr_export),
        dial_dosage_import: this.numOrNull(r.dial_dosage_import),
        dial_dosage_export: this.numOrNull(r.dial_dosage_export),
        dial_result_import: this.numOrNull(r.dial_result_import),
        dial_result_export: this.numOrNull(r.dial_result_export),

        net_imp_export: this.numOrNull(r.net_imp_export),
        report_version: r.report_version || null,

        details: r.remark || null,
        test_result: r.test_result || null,
        test_method: this.testMethod || null,
        test_status: this.testStatus || null,

        testshifts: this.testshifts || null,

        consumer_name: r.consumer_name || null,
        consumer_address: r.address || null,
        certificate_number: r.certificate_no || null,

        testing_fees: r.testing_fees|| null,
        fees_mr_no: r.mr_no || null,
        fees_mr_date: r.mr_date || null,
        ref_no: r.ref_no || null,

        test_requester_name: requester,
        meter_removaltime_reading: null,
        meter_removaltime_metercondition: null,
        any_other_remarkny_zone: null,

        dail_test_kwh_rsm: null,
        recorderedbymeter_kwh: null,

        final_remarks: r.final_remarks || null,

        p4_division: null,
        p4_no: null,
        p4_date: null,
        p4_metercodition: null,

        approver_id: null,
        approver_remark: null,

        report_id: null,
        report_type: 'SOLAR_NETMETER',

        created_by: String(this.currentUserId || '')
      }));
  }

  private buildPdfHeader(resp: any): NormalSolarHeader & SmartSolarHeader {
    const labFromResp = resp?.lab_info || resp?.lab || null;
    const effLab = labFromResp || this.labInfo || {};

    const firstRowDate =
      this.rows.find((r) => (r.meter_sr_no || '').trim())?.date_of_testing || null;

    return {
      location_code: this.header.location_code,
      location_name: this.header.location_name,
      testMethod: this.testMethod,
      testStatus: this.testStatus,
      testing_bench: this.header.testing_bench || this.testing_bench || '-',
      testing_user: this.header.testing_user || this.testing_user || '-',
      approving_user: this.header.approving_user || this.approving_user || '-',
      date: firstRowDate
        ? this.isoOn(firstRowDate).split('T')[0]
        : new Date().toISOString().slice(0, 10),

      lab_name:
        (effLab as any)?.lab_pdfheader_name ||
        (effLab as any)?.lab_name ||
        this.labInfo?.lab_name ||
        '-',
      lab_address:
        (effLab as any)?.address ||
        (effLab as any)?.address_line ||
        this.labInfo?.address ||
        '-',
      lab_email: (effLab as any)?.email || this.labInfo?.email || '-',
      lab_phone: (effLab as any)?.phone || this.labInfo?.phone || '-',
      leftLogoUrl:
        (effLab as any)?.left_logo_url || this.leftLogoUrl || '/assets/icons/wzlogo.png',
      rightLogoUrl:
        (effLab as any)?.right_logo_url || this.rightLogoUrl || '/assets/icons/wzlogo.png'
    };
  }

  private mapCommonPdfRow(r: CertRow) {
    return {
      certificate_no: r.certificate_no,
      consumer_name: r.consumer_name,
      address: r.address,
      meter_make: r.meter_make,
      meter_sr_no: r.meter_sr_no,
      meter_capacity: r.meter_capacity,
      date_of_testing: r.date_of_testing || null,
      testing_fees: r.testing_fees|| null,
      mr_no: r.mr_no || null,
      mr_date: r.mr_date || null,
      ref_no: r.ref_no || null,

      starting_reading: this.numOrNull(r.starting_reading),
      final_reading_r: this.numOrNull(r.final_reading_r),
      final_reading_e: this.numOrNull(r.final_reading_e),
      difference: this.numOrNull(r.difference),

      start_reading_import: this.numOrNull(r.start_reading_import),
      final_reading__import: this.numOrNull(r.final_reading__import),
      difference__import: this.numOrNull(r.difference__import),

      start_reading_export: this.numOrNull(r.start_reading_export),
      final_reading_export: this.numOrNull(r.final_reading_export),
      difference_export: this.numOrNull(r.difference_export),

      final_Meter_Difference: this.numOrNull(r.final_Meter_Difference),

      import_ref_start_reading: this.numOrNull(r.import_ref_start_reading),
      import_ref_end_reading: this.numOrNull(r.import_ref_end_reading),
      error_percentage_import: this.numOrNull(r.error_percentage_import),

      export_ref_start_reading: this.numOrNull(r.export_ref_start_reading),
      export_ref_end_reading: this.numOrNull(r.export_ref_end_reading),
      error_percentage_export: this.numOrNull(r.error_percentage_export),

      shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
      shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test),
      shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading),
      shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading),
      shunt_error_percentage: this.numOrNull(r.shunt_error_percentage),

      nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
      nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test),
      nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading),
      nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading),
      nutral_error_percentage: this.numOrNull(r.nutral_error_percentage),

      starting_current_test: r.shunt_current_test || r.nutral_current_test || null,
      creep_test: r.shunt_creep_test || r.nutral_creep_test || null,
      dial_test: r.shunt_dail_test || r.nutral_dail_test || null,

      remark: r.remark || r.final_remarks || null,
      final_remark: r.final_remarks || null,
      test_result: r.test_result || null,

      physical_condition_of_device: r.physical_condition_of_device || null,
      seal_status: r.seal_status || null,
      meter_glass_cover: r.meter_glass_cover || null,
      terminal_block: r.terminal_block || null,
      meter_body: r.meter_body || null
    };
  }

private mapNormalPdfRows(rows: CertRow[]): NormalSolarRow[] {
  return rows.map((r) => ({
    certificate_no: r.certificate_no || '',
    consumer_name: r.consumer_name || '',
    address: r.address || '',
    meter_make: r.meter_make || '',
    meter_sr_no: r.meter_sr_no || '',
    meter_capacity: r.meter_capacity || '',
    date_of_testing: r.date_of_testing || null,

    testing_fees: r.testing_fees ?? null,
    mr_no: r.mr_no || null,
    mr_date: r.mr_date || null,
    ref_no: r.ref_no || null,

    starting_reading: this.numOrNull(r.starting_reading),
    final_reading_r: this.numOrNull(r.final_reading_r),
    final_reading_e: this.numOrNull(r.final_reading_e),
    difference: this.numOrNull(r.difference),

    start_reading_import: this.numOrNull(r.start_reading_import),
    final_reading__import: this.numOrNull(r.final_reading__import),
    difference__import: this.numOrNull(r.difference__import),

    start_reading_export: this.numOrNull(r.start_reading_export),
    final_reading_export: this.numOrNull(r.final_reading_export),
    difference_export: this.numOrNull(r.difference_export),

    final_Meter_Difference: this.numOrNull(r.final_Meter_Difference),

    import_ref_start_reading: this.numOrNull(r.import_ref_start_reading),
    import_ref_end_reading: this.numOrNull(r.import_ref_end_reading),
    error_percentage_import: this.numOrNull(r.error_percentage_import),

    export_ref_start_reading: this.numOrNull(r.export_ref_start_reading),
    export_ref_end_reading: this.numOrNull(r.export_ref_end_reading),
    error_percentage_export: this.numOrNull(r.error_percentage_export),

    shunt_reading_before_test: this.numOrNull(r.shunt_reading_before_test),
    shunt_reading_after_test: this.numOrNull(r.shunt_reading_after_test),
    shunt_ref_start_reading: this.numOrNull(r.shunt_ref_start_reading),
    shunt_ref_end_reading: this.numOrNull(r.shunt_ref_end_reading),
    shunt_error_percentage: this.numOrNull(r.shunt_error_percentage),

    nutral_reading_before_test: this.numOrNull(r.nutral_reading_before_test),
    nutral_reading_after_test: this.numOrNull(r.nutral_reading_after_test),
    nutral_ref_start_reading: this.numOrNull(r.nutral_ref_start_reading),
    nutral_ref_end_reading: this.numOrNull(r.nutral_ref_end_reading),
    nutral_error_percentage: this.numOrNull(r.nutral_error_percentage),

    starting_current_test: r.shunt_current_test || r.nutral_current_test || null,
    creep_test: r.shunt_creep_test || r.nutral_creep_test || null,
    dial_test: r.shunt_dail_test || r.nutral_dail_test || null,

    test_result: r.test_result || null,
    remark: r.remark || r.final_remarks || null,
    final_remark: r.final_remarks || null,

    physical_condition_of_device: r.physical_condition_of_device || null,
    seal_status: r.seal_status || null,
    meter_glass_cover: r.meter_glass_cover || null,
    terminal_block: r.terminal_block || null,
    meter_body: r.meter_body || null
  }));
}

  private mapSmartPdfRows(rows: CertRow[]): SmartSolarRow[] {
    return rows.map((r) => ({
      ...this.mapCommonPdfRow(r),

      import_upf_100_imax: this.numOrNull(r.import_upf_100_imax),
      import_upf_100_ib: this.numOrNull(r.import_upf_100_ib),
      import_upf_5_ib: this.numOrNull(r.import_upf_5_ib),

      import_lag_05_100_imax: this.numOrNull(r.import_lag_05_100_imax),
      import_lag_05_100_ib: this.numOrNull(r.import_lag_05_100_ib),
      import_lag_05_10_ib: this.numOrNull(r.import_lag_05_10_ib),

      import_lead_08_100_imax: this.numOrNull(r.import_lead_08_100_imax),
      import_lead_08_100_ib: this.numOrNull(r.import_lead_08_100_ib),
      import_lead_08_10_ib: this.numOrNull(r.import_lead_08_10_ib),

      export_upf_100_imax: this.numOrNull(r.export_upf_100_imax),
      export_upf_100_ib: this.numOrNull(r.export_upf_100_ib),
      export_upf_5_ib: this.numOrNull(r.export_upf_5_ib),

      export_lag_05_100_imax: this.numOrNull(r.export_lag_05_100_imax),
      export_lag_05_100_ib: this.numOrNull(r.export_lag_05_100_ib),
      export_lag_05_10_ib: this.numOrNull(r.export_lag_05_10_ib),

      export_lead_08_100_imax: this.numOrNull(r.export_lead_08_100_imax),
      export_lead_08_100_ib: this.numOrNull(r.export_lead_08_100_ib),
      export_lead_08_10_ib: this.numOrNull(r.export_lead_08_10_ib),

      dial_sr_import: this.numOrNull(r.dial_sr_import),
      dial_sr_export: this.numOrNull(r.dial_sr_export),
      dial_fr_import: this.numOrNull(r.dial_fr_import),
      dial_fr_export: this.numOrNull(r.dial_fr_export),
      dial_dosage_import: this.numOrNull(r.dial_dosage_import),
      dial_dosage_export: this.numOrNull(r.dial_dosage_export),
      dial_result_import: this.numOrNull(r.dial_result_import),
      dial_result_export: this.numOrNull(r.dial_result_export),

      net_imp_exp: this.numOrNull(r.net_imp_export)
    }));
  }

private async generatePdfByMeterType(resp: any): Promise<void> {
  const hdr = this.buildPdfHeader(resp);

  const allRows = (this.rows || []).filter((r) => (r.meter_sr_no || '').trim());

  const smartRowsSource = allRows.filter((r) => this.isSmartSolarMeter(r));
  const normalRowsSource = allRows.filter((r) => !this.isSmartSolarMeter(r));

  console.log('PDF split => total:', allRows.length);
  console.log('PDF split => smart:', smartRowsSource.length);
  console.log('PDF split => normal:', normalRowsSource.length);

  const smartRows = this.mapSmartPdfRows(smartRowsSource);
  const normalRows = this.mapNormalPdfRows(normalRowsSource);

  if (!smartRows.length && !normalRows.length) {
    throw new Error('No rows available for PDF generation.');
  }

  // SMART PDF
  if (smartRows.length) {
    try {
      if (this.pdfMode === 'print') {
        await this.smartPdfSvc.print(hdr, smartRows);
      } else {
        await this.smartPdfSvc.download(
          hdr,
          smartRows,
          normalRows.length
            ? 'SOLAR_NETMETER_CERTIFICATES_SMART.pdf'
            : 'SOLAR_NETMETER_CERTIFICATES.pdf'
        );
      }
    } catch (err) {
      console.error('Smart PDF failed, trying open():', err);
      await this.smartPdfSvc.open(hdr, smartRows);
    }
  }

  // NORMAL PDF
  if (normalRows.length) {
    try {
      if (this.pdfMode === 'print') {
        await this.pdfSvc.print(hdr, normalRows);
      } else {
        await this.pdfSvc.download(
          hdr,
          normalRows,
          smartRows.length
            ? 'SOLAR_NETMETER_CERTIFICATES_NON_SMART.pdf'
            : 'SOLAR_NETMETER_CERTIFICATES.pdf'
        );
      }
    } catch (err) {
      console.error('Normal PDF failed, trying open():', err);
      await this.pdfSvc.open(hdr, normalRows);
    }
  }
}

  openConfirm(action: ModalAction) {
    this.modal.action = action;

    if (action === 'submit') {
      const v = this.validate();
      if (!v.ok) {
        this.showBanner('warning', 'Validation error — ' + v.msg!);
        return;
      }
      this.modal.title = 'Submit Batch — Preview';
      this.modal.message = '';
      this.modal.open = true;
    }
  }

  closeModal() {
    this.modal.open = false;
    this.modal.action = null;
  }

  openAssignedPicker() {
    const v = this.validateContext();
    if (!v.ok) {
      this.showBanner('warning', 'Context error — ' + v.msg!);
      return;
    }

    if (!this.asgPicker.list.length) this.reloadAssigned(false);
    this.asgPicker.selected = {};
    this.asgPicker.filter = '';
    this.asgPicker.replaceExisting = true;
    this.asgPicker.open = true;
  }

  closeAssignedPicker() {
    this.asgPicker.open = false;
  }

  get filteredAssigned(): AssignmentItem[] {
    const q = this.asgPicker.filter.trim().toLowerCase();
    let list = this.asgPicker.list || [];
    if (!q) return list;
    return list.filter((a) => {
      const d = a.device || ({} as MeterDevice);
      return (
        (d.serial_number || '').toLowerCase().includes(q) ||
        (d.make || '').toLowerCase().includes(q) ||
        (d.capacity || '').toLowerCase().includes(q)
      );
    });
  }

  toggleSelectAllVisible(checked: boolean) {
    for (const a of this.filteredAssigned) {
      this.asgPicker.selected[a.id] = checked;
    }
  }

  confirmAssignedSelection() {
    const chosen = this.asgPicker.list.filter((a) => this.asgPicker.selected[a.id]);
    if (!chosen.length) {
      this.showBanner('warning', 'No selection — Select at least one device.');
      return;
    }

    const newRows = chosen.map((a) => {
      const d = a.device || ({} as MeterDevice);
      if (!this.header.location_code) this.header.location_code = a.device?.location_code ?? '';
      if (!this.header.location_name) this.header.location_name = a.device?.location_name ?? '';
      if (!this.header.testing_bench) this.header.testing_bench = a.testing_bench?.bench_name ?? '';
      if (!this.header.testing_user) {
        this.header.testing_user = a.user_assigned?.name || a.user_assigned?.username || '';
      }
      if (!this.header.approving_user) {
        this.header.approving_user =
          a.assigned_by_user?.name || a.assigned_by_user?.username || '';
      }
      if (!this.header.phase && a.device?.phase) {
        this.header.phase = (a.device.phase || '').toUpperCase();
      }

      return this.emptyRow({
        meter_sr_no: d.serial_number || '',
        meter_make: d.make || '',
        meter_capacity: d.capacity || '',
        meter_type: d.meter_type || null,
        assignment_id: a.id ?? 0,
        device_id: d.id ?? a.device_id ?? 0,
        _open: false,
        notFound: false
      });
    });

    if (this.asgPicker.replaceExisting) {
      this.rows = newRows.length ? newRows : [this.emptyRow()];
    } else {
      const seen = new Set(this.rows.map((r) => (r.meter_sr_no || '').toUpperCase()));
      newRows.forEach((r) => {
        const key = (r.meter_sr_no || '').toUpperCase();
        if (!seen.has(key)) {
          this.rows.push(r);
          seen.add(key);
        }
      });
    }

    this.closeAssignedPicker();
    this.showBanner('success', `${newRows.length} device(s) added to the table.`);
  }

  async confirmSubmitFromModal() {
    await this.doSubmit();
  }

  private async doSubmit() {
    const v = this.validate();
    if (!v.ok) {
      this.showBanner('warning', 'Validation error — ' + v.msg!);
      return;
    }

    const payload = this.buildPayload();
    this.submitting = true;

    this.api.postTestReports(payload).subscribe({
      next: async (_resp: any) => {
        this.submitting = false;

        this.showBanner('success', 'Batch submitted successfully!');

        try {
          await this.generatePdfByMeterType(_resp);

          this.showBanner(
            'success',
            this.pdfMode === 'print'
              ? 'Certificates sent to print dialog.'
              : 'Certificates downloaded.'
          );
        } catch (err) {
          console.error('PDF generation error:', err);
          this.showBanner('warning', 'Saved, but PDF could not be generated.');
        }

        this.rows = [this.emptyRow()];
        setTimeout(() => this.closeModal(), 600);
      },
      error: (e) => {
        console.error(e);
        this.submitting = false;
        this.showBanner(
          'error',
          'Submission failed — Something went wrong while submitting the batch.'
        );
      }
    });
  }

  showBanner(
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    autoCloseMs: number = 4000
  ) {
    if (this.banner._t) {
      clearTimeout(this.banner._t);
      this.banner._t = null;
    }
    this.banner.type = type;
    this.banner.message = message;
    this.banner.show = true;
    if (autoCloseMs && autoCloseMs > 0) {
      this.banner._t = setTimeout(() => this.clearBanner(), autoCloseMs);
    }
  }

  clearBanner() {
    if (this.banner._t) {
      clearTimeout(this.banner._t);
      this.banner._t = null;
    }
    this.banner.show = false;
    this.banner.message = '';
  }

  setPdfMode(mode: 'download' | 'print') {
    this.pdfMode = mode;
  }
}