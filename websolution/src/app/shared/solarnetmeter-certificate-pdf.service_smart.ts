import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = pdfFonts.vfs;

export type SolarHeader = {
  location_code?: string | null;
  location_name?: string | null;
  testMethod?: string | null;
  testStatus?: string | null;

  // extra for PDF header/meta
  testing_bench?: string | null;
  testing_user?: string | null;
  approving_user?: string | null;
  date?: string | null;

  // lab info + logos
  lab_name?: string | null;
  lab_address?: string | null;
  lab_email?: string | null;
  lab_phone?: string | null;
  leftLogoUrl?: string | null;
  rightLogoUrl?: string | null;

  // signature images
  testedBySignatureUrl?: string | null;
  verifiedBySignatureUrl?: string | null;
  approvedBySignatureUrl?: string | null;

  // names / designations
  testedByName?: string | null;
  testedByDesignation?: string | null;

  verifiedByName?: string | null;
  verifiedByDesignation?: string | null;

  approvedByName?: string | null;
  approvedByDesignation?: string | null;
};

export type SolarRow = {
  certificate_no?: string;
  consumer_name?: string;
  address?: string;

  meter_make?: string;
  meter_sr_no?: string;
  meter_capacity?: string;

  date_of_testing?: string | null;

  // Fees
  testing_fees?: number | null;
  mr_no?: string | null;
  mr_date?: string | null;
  ref_no?: string | null;

  // Existing reading values
  starting_reading?: number | null;
  final_reading_r?: number | null;
  final_reading_e?: number | null;
  difference?: number | null;

  // Import
  start_reading_import?: number | null;
  final_reading__import?: number | null;
  difference__import?: number | null;
  import_ref_start_reading?: number | null;
  import_ref_end_reading?: number | null;
  error_percentage_import?: number | null;

  // Export
  start_reading_export?: number | null;
  final_reading_export?: number | null;
  difference_export?: number | null;
  export_ref_start_reading?: number | null;
  export_ref_end_reading?: number | null;
  error_percentage_export?: number | null;

  // Final Δ (I − E)
  final_Meter_Difference?: number | null;

  // SHUNT channel
  shunt_reading_before_test?: number | null;
  shunt_reading_after_test?: number | null;
  shunt_ref_start_reading?: number | null;
  shunt_ref_end_reading?: number | null;
  shunt_error_percentage?: number | null;

  // NUTRAL channel
  nutral_reading_before_test?: number | null;
  nutral_reading_after_test?: number | null;
  nutral_ref_start_reading?: number | null;
  nutral_ref_end_reading?: number | null;
  nutral_error_percentage?: number | null;

  // Qualitative tests / remarks
  starting_current_test?: string | null;
  creep_test?: string | null;
  dial_test?: string | null;

  test_result?: string | null;
  remark?: string | null;
  final_remark?: string | null;

  // physical condition
  physical_condition_of_device?: string | null;
  seal_status?: string | null;
  meter_glass_cover?: string | null;
  terminal_block?: string | null;
  meter_body?: string | null;

  // ---------- LIMITS OF ACCURACY : IMPORT ----------
  import_upf_100_imax?: number | null;
  import_upf_100_ib?: number | null;
  import_upf_5_ib?: number | null;

  import_lag_05_100_imax?: number | null;
  import_lag_05_100_ib?: number | null;
  import_lag_05_10_ib?: number | null;

  import_lead_08_100_imax?: number | null;
  import_lead_08_100_ib?: number | null;
  import_lead_08_10_ib?: number | null;

  // ---------- LIMITS OF ACCURACY : EXPORT ----------
  export_upf_100_imax?: number | null;
  export_upf_100_ib?: number | null;
  export_upf_5_ib?: number | null;

  export_lag_05_100_imax?: number | null;
  export_lag_05_100_ib?: number | null;
  export_lag_05_10_ib?: number | null;

  export_lead_08_100_imax?: number | null;
  export_lead_08_100_ib?: number | null;
  export_lead_08_10_ib?: number | null;

  // ---------- DIAL TEST ----------
  dial_sr_import?: number | null;
  dial_sr_export?: number | null;

  dial_fr_import?: number | null;
  dial_fr_export?: number | null;

  dial_dosage_import?: number | null;
  dial_dosage_export?: number | null;

  dial_result_import?: number | null;
  dial_result_export?: number | null;

  net_imp_exp?: number | null;
};

@Injectable({ providedIn: 'root' })
export class SolarNetMeterCertificatePdfService_1 {
  private theme = {
    grid: '#9aa3ad',
    subtle: '#6b7280',
    lightFill: '#f5f5f5'
  };

  async download(
    header: SolarHeader,
    rows: SolarRow[],
    fileName = 'SOLAR_NETMETER_CERTIFICATES_smart.pdf'
  ) {
    const doc = await this.buildDocWithAssets(header, rows);
    await new Promise<void>(res =>
      pdfMake.createPdf(doc).download(fileName, () => res())
    );
  }

  async open(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithAssets(header, rows);
    pdfMake.createPdf(doc).open();
  }

  async print(header: SolarHeader, rows: SolarRow[]) {
    const doc = await this.buildDocWithAssets(header, rows);
    pdfMake.createPdf(doc).print();
  }

  async generateAllSeparate(
    reports: { header: SolarHeader; rows: SolarRow[]; fileName?: string }[]
  ) {
    for (const r of reports) {
      try {
        const doc = await this.buildDocWithAssets(r.header, r.rows);
        await new Promise<void>((res, rej) => {
          try {
            pdfMake.createPdf(doc).download(r.fileName || 'report.pdf', () => res());
          } catch (e) {
            try {
              pdfMake.createPdf(doc).open();
              res();
            } catch (err) {
              rej(err);
            }
          }
        });
      } catch (err) {
        console.error('Failed to generate report', err);
      }
    }
  }

  async mergeAndDownloadAll(
    reports: { header: SolarHeader; rows: SolarRow[] }[],
    fileName = 'ALL_SOLAR_NETMETER_CERTIFICATES_smart.pdf'
  ) {
    const builtDocs: any[] = [];
    for (const r of reports) {
      try {
        builtDocs.push(await this.buildDocWithAssets(r.header, r.rows));
      } catch (err) {
        console.error('Failed to build doc for header', r.header, err);
      }
    }

    if (!builtDocs.length) {
      throw new Error('No documents could be built');
    }

    const mergedImages: Record<string, string> = {};
    const mergedContent: any[] = [];

    builtDocs.forEach((d, idx) => {
      Object.assign(mergedImages, d.images || {});
      if (Array.isArray(d.content)) {
        d.content.forEach((block: any) => mergedContent.push(block));
        if (idx < builtDocs.length - 1) {
          mergedContent.push({ text: '', pageBreak: 'after' });
        }
      }
    });

    const mergedDoc: any = {
      pageSize: builtDocs[0].pageSize || 'A4',
      pageMargins: builtDocs[0].pageMargins || [10, 10, 10, 30],
      defaultStyle: builtDocs[0].defaultStyle || {
        fontSize: 9,
        color: '#111',
        lineHeight: 1.05
      },
      images: mergedImages,
      footer: builtDocs[0].footer,
      info: { title: fileName },
      content: mergedContent
    };

    return await new Promise<void>((res, rej) => {
      try {
        pdfMake.createPdf(mergedDoc).download(fileName, () => res());
      } catch (e) {
        try {
          pdfMake.createPdf(mergedDoc).open();
          res();
        } catch (err) {
          rej(err);
        }
      }
    });
  }

  private fmtTxt(v: unknown) {
    if (v === undefined || v === null || v === '') return '';
    return String(v);
  }

  private fmtNum(n: number | string | null | undefined, digits = 4) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return (v as number).toFixed(digits).replace(/\.?0+$/, '');
  }

  private fmtMoney(n: number | string | null | undefined) {
    if (n === null || n === undefined || n === '') return '';
    const v = typeof n === 'string' ? Number(n) : n;
    if (Number.isNaN(v as number)) return String(n);
    return `${(v as number).toFixed(2).replace(/\.00$/, '')}/-`;
  }

  private fmtDateShort(s?: string | null) {
    if (!s) return '';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s as string;
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  private fmtPercent(n: number | string | null | undefined, digits = 2) {
    const v = this.fmtNum(n, digits);
    return v ? `${v}%` : '';
  }

  private gridLayout() {
    return {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => this.theme.grid,
      vLineColor: () => this.theme.grid,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 2,
      paddingBottom: () => 2
    };
  }

  private async buildDocWithAssets(header: SolarHeader, rows: SolarRow[]) {
    const images: Record<string, string> = {};
    const isData = (u?: string | null) =>
      !!u && /^data:image\/[a-zA-Z]+;base64,/.test(u || '');

    const toDataURL = async (url: string) => {
      const abs = new URL(url, document.baseURI).toString();
      const res = await fetch(abs, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`asset fetch failed ${abs}`);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    };

    const safe = async (
      key:
        | 'leftLogo'
        | 'rightLogo'
        | 'testedBySignature'
        | 'verifiedBySignature'
        | 'approvedBySignature',
      url?: string | null
    ) => {
      if (!url) return;
      try {
        images[key] = isData(url) ? url : await toDataURL(url);
      } catch (err) {
        console.warn('Asset fetch failed for', url, err);
      }
    };

    await Promise.all([
      safe('leftLogo', header.leftLogoUrl),
      safe('rightLogo', header.rightLogoUrl),
      safe('testedBySignature', header.testedBySignatureUrl),
      safe('verifiedBySignature', header.verifiedBySignatureUrl),
      safe('approvedBySignature', header.approvedBySignatureUrl)
    ]);

    if (!images['leftLogo'] && images['rightLogo']) {
      images['leftLogo'] = images['rightLogo'];
    }
    if (!images['rightLogo'] && images['leftLogo']) {
      images['rightLogo'] = images['leftLogo'];
    }

    return this.buildDoc(header, rows, images);
  }

  private headerBar(meta: any, images: Record<string, string>) {
    return {
      margin: [12, 4, 12, 4],
      columnGap: 4,
      columns: [
        images['leftLogo']
          ? { image: 'leftLogo', width: 26, alignment: 'left' }
          : { width: 26, text: '' },

        {
          width: '*',
          stack: [
            {
              text: 'MADHYA PRADESH PASCHIM KSHETRA VIDYUT VITARAN COMPANY LIMITED',
              alignment: 'center',
              bold: true,
              fontSize: 11
            },
            {
              text: meta.lab_name || '',
              alignment: 'center',
              color: '#333',
              margin: [0, 1, 0, 0],
              fontSize: 10
            },
            {
              text: meta.lab_address || '',
              alignment: 'center',
              color: '#555',
              margin: [0, 1, 0, 0],
              fontSize: 8
            },
            {
              text: `Email: ${meta.lab_email || ''}    Phone: ${meta.lab_phone || ''}`,
              alignment: 'center',
              color: '#555',
              margin: [0, 1, 0, 0],
              fontSize: 8
            },
            {
              canvas: [
                {
                  type: 'line',
                  x1: 0,
                  y1: 0,
                  x2: 500,
                  y2: 0,
                  lineWidth: 0.8
                }
              ],
              margin: [0, 3, 0, 0]
            }
          ]
        },

        images['rightLogo']
          ? { image: 'rightLogo', width: 26, alignment: 'right' }
          : { width: 26, text: '' }
      ]
    };
  }

  private metaRow(meta: any) {
    const lbl = { bold: true, fillColor: this.theme.lightFill };
    return {
      layout: this.gridLayout(),
      margin: [18, 0, 18, 4],
      table: {
        widths: ['auto', '*', 'auto', '*', 'auto', '*'],
        body: [
          [
            { text: 'DC/Zone', ...lbl },
            { text: meta.zone || '-' },
            { text: 'Method', ...lbl },
            { text: meta.method || '-' },
            { text: 'Status', ...lbl },
            { text: meta.status || '-' }
          ],
          [
            { text: 'Bench', ...lbl },
            { text: meta.bench || '-' },
            { text: 'User', ...lbl },
            { text: meta.user || '-' },
            { text: 'Date', ...lbl },
            { text: meta.date || '-' }
          ]
        ]
      }
    };
  }

  private rowLabel(t: string) {
    return { text: t, bold: true };
  }

  private accuracyPairRow(
    leftLabel: string,
    leftValue: number | string | null | undefined,
    rightLabel: string,
    rightValue: number | string | null | undefined
  ) {
    return [
      { text: leftLabel, alignment: 'left' },
      { text: this.fmtNum(leftValue, 3), alignment: 'center' },
      { text: rightLabel, alignment: 'left' },
      { text: this.fmtNum(rightValue, 3), alignment: 'center' }
    ];
  }

  private certTable(r: SolarRow) {
    // const W = [120, 70, 130, 70, 130] as any;

    const mrText = (() => {
      const no = r.mr_no ?? '';
      const dt = this.fmtDateShort(r.mr_date);
      if (!no && !dt) return '';
      if (no && dt) return `${no} DT ${dt}`;
      return no || dt;
    })();

    const body: any[] = [
      [
        this.rowLabel('Name of consumer'),
        { text: this.fmtTxt(r.consumer_name), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Address'),
        { text: this.fmtTxt(r.address), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Meter Make'),
        { text: this.fmtTxt(r.meter_make), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Meter Sr. No.'),
        { text: this.fmtTxt(r.meter_sr_no), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Meter Capacity'),
        { text: this.fmtTxt(r.meter_capacity), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Testing Fees Rs.'),
        { text: this.fmtMoney(r.testing_fees as any), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('M.R. No & Date'),
        { text: mrText, colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Ref.'),
        { text: this.fmtTxt(r.ref_no), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Date of Testing'),
        { text: this.fmtDateShort(r.date_of_testing), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Starting Current Test'),
        { text: this.fmtTxt(r.starting_current_test), colSpan: 4 },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Creep Test'),
        { text: this.fmtTxt(r.creep_test), colSpan: 4 },
        {},
        {},
        {}
      ],

      // LIMITS OF ACCURACY
      [
        {
          text: 'LIMITS OF ACCURACY',
          rowSpan: 10,
          bold: true,
          alignment: 'center',
          margin: [0, 30, 0, 0]
        },
        {
          text: 'IMPORT',
          colSpan: 2,
          bold: true,
          alignment: 'center',
          fillColor: '#f0f0f0'
        },
        {},
        {
          text: 'EXPORT',
          colSpan: 2,
          bold: true,
          alignment: 'center',
          fillColor: '#f0f0f0'
        },
        {}
      ],
      [
        {},
        {
          text: 'UPF',
          rowSpan: 3,
          bold: true,
          alignment: 'center',
          margin: [0, 14, 0, 0]
        },
        { text: `100% Imax -    ${this.fmtNum(r.import_upf_100_imax, 3)}` },
        {
          text: 'UPF',
          rowSpan: 3,
          bold: true,
          alignment: 'center',
          margin: [0, 14, 0, 0]
        },
        { text: `100% Imax -    ${this.fmtNum(r.export_upf_100_imax, 3)}` },
      ],
      [
        {},
        {},
        { text: `100% IB -    ${this.fmtNum(r.import_upf_100_ib, 3)}` },
        {},
        { text: `100% IB -    ${this.fmtNum(r.export_upf_100_ib, 3)}` }
      ],
      [       
        {},
        {},
         { text: `5% IB -        ${this.fmtNum(r.import_upf_5_ib, 3)}` },
        {},
       { text: `5% IB -        ${this.fmtNum(r.export_upf_5_ib, 3)}` }
      ],
      [
        {},
        { text: '0.5 Lag', rowSpan: 3, bold: true, alignment: 'center', margin: [0, 14, 0, 0] },
       { text: `100% Imax -   ${this.fmtNum(r.import_lag_05_100_imax, 3)}` },
        { text: '0.5 Lag', rowSpan: 3, bold: true, alignment: 'center', margin: [0, 14, 0, 0] },
          { text: `100% Imax -    ${this.fmtNum(r.export_lag_05_100_imax, 3)}` }
      ],
      [
        {},
        {},
        { text: `100% IB -      ${this.fmtNum(r.import_lag_05_100_ib, 3)}` },
        {},
        { text: `100% IB -      ${this.fmtNum(r.export_lag_05_100_ib, 3)}` }
      ],
      [
        {},
        {},
        { text: `10% IB -      ${this.fmtNum(r.import_lag_05_10_ib, 3)}` },
        {},
        { text: `10% IB -      ${this.fmtNum(r.export_lag_05_10_ib, 3)}` }
      ],
      [
        {},
        { text: '0.8 Lead', rowSpan: 3, bold: true, alignment: 'center', margin: [0, 14, 0, 0] },
        { text: `100% Imax -   ${this.fmtNum(r.import_lead_08_100_imax, 3)}` },
        { text: '0.8 Lead', rowSpan: 3, bold: true, alignment: 'center', margin: [0, 14, 0, 0] },
        { text: `100% Imax -    ${this.fmtNum(r.export_lead_08_100_imax, 3)}` }
      ],
      [
        {},
        {},
        { text: `100% IB -      ${this.fmtNum(r.import_lead_08_100_ib, 3)}` },
        {},
        { text: `100% IB -      ${this.fmtNum(r.export_lead_08_100_ib, 3)}` }
      ],
      [
        {},
        {},
        { text: `10% IB -       ${this.fmtNum(r.import_lead_08_10_ib, 3)}` },
        {},
        { text: `10% IB -       ${this.fmtNum(r.export_lead_08_10_ib, 3)}` }
      ],

      // DIAL TEST
      [
        {
          text: 'DIAL TEST',
          rowSpan: 4,
          bold: true,
          alignment: 'center',
          margin: [0, 20, 0, 0]
        },
        { text: 'SR', bold: true, alignment: 'center' },
        { text: `IMP - ${this.fmtNum(r.dial_sr_import, 5)}` },
        { text: '', border: [false, true, false, true] },
        { text: `EXP - ${this.fmtNum(r.dial_sr_export, 5)}` }
      ],
      [
        {},
        { text: 'FR', bold: true, alignment: 'center' },
        { text: `IMP - ${this.fmtNum(r.dial_fr_import, 5)}` },
        { text: '', border: [false, true, false, true] },
        { text: `EXP - ${this.fmtNum(r.dial_fr_export, 5)}` }
      ],
      [
        {},
        { text: 'DOSAGE', bold: true, alignment: 'center' },
        { text: this.fmtNum(r.dial_dosage_import, 4), alignment: 'center' },
        { text: '', border: [false, true, false, true] },
        { text: this.fmtNum(r.dial_dosage_export, 4), alignment: 'center' }
      ],
      [
        {},
        { text: 'RESULT', bold: true, alignment: 'center' },
        { text: this.fmtPercent(r.dial_result_import, 2), alignment: 'center' },
        { text: '', border: [false, true, false, true] },
        { text: this.fmtPercent(r.dial_result_export, 2), alignment: 'center' }
      ],
      [
        {
          text: 'NET (IMP-EXP)',
          bold: true,
        },
        {
          text: this.fmtNum(r.net_imp_exp, 4),
          bold: true,
          alignment: 'center',          
          colSpan: 4
        },
        {},
        {},
        {},
      ],

      [
        this.rowLabel('Remark'),
        {
          text: this.fmtTxt(r.remark ?? r.final_remark),
          colSpan: 4,
          margin: [0, 6, 0, 6]
        },
        {},
        {},
        {}
      ],
      [
        this.rowLabel('Test Result'),
        {
          text: this.fmtTxt(r.test_result),
          bold: true,
          colSpan: 4
        },
        {},
        {},
        {}
      ],

  
    ];

    return {
      margin: [18, 0, 18, 0],
      layout: this.gridLayout(),
      table: {
        widths: [100, 70, 125, 70, 125],
        body
      }
    };
  }

  private signatureBlock(meta: any, images: Record<string, string>) {
    const signBox = (
      title: string,
      imageKey: 'testedBySignature' | 'verifiedBySignature' | 'approvedBySignature',
      name?: string,
      designation?: string
    ) => ({
      width: '*',
      stack: [
        {
          text: title,
          alignment: 'center',
          bold: true,
          margin: [0, 0, 0, 4]
        },

        images[imageKey]
          ? {
              image: imageKey,
              fit: [110, 38],
              alignment: 'center',
              margin: [0, 0, 0, 2]
            }
          : {
              text: ' ',
              margin: [0, 20, 0, 20]
            },

        {
          canvas: [
            {
              type: 'line',
              x1: 20,
              y1: 0,
              x2: 140,
              y2: 0,
              lineWidth: 0.8,
              lineColor: '#666'
            }
          ],
          margin: [0, 2, 0, 2]
        },
        {
          text: this.fmtTxt(name),
          alignment: 'center',
          fontSize: 9,
          color: '#000',
          bold: !!name
        },
        {
          text: this.fmtTxt(designation),
          alignment: 'center',
          color: this.theme.subtle,
          fontSize: 8
        }
      ]
    });

    return {
      margin: [18, 10, 18, 0],
      columnGap: 12,
      columns: [
        signBox(
          'Tested by',
          'testedBySignature',
          meta.testedByName || meta.testing_user || '',
          meta.testedByDesignation || 'TESTING ASSISTANT'
        ),
        signBox(
          'Verified by',
          'verifiedBySignature',
          meta.verifiedByName || '',
          meta.verifiedByDesignation || 'JUNIOR ENGINEER'
        ),
        signBox(
          'Approved by',
          'approvedBySignature',
          meta.approvedByName || meta.approving_user || '',
          meta.approvedByDesignation || 'ASSISTANT ENGINEER'
        )
      ]
    };
  }

  private page(r: SolarRow, meta: any, images: Record<string, string>) {
    const blocks: any[] = [];

    blocks.push(this.headerBar(meta, images));

    blocks.push(
      {
        text: 'SOLAR NET METER TEST REPORT',
        alignment: 'center',
        bold: true,
        fontSize: 12,
        margin: [0, 0, 0, 2]
      },
      {
        text: 'CERTIFICATE FOR A.C. SINGLE/THREE PHASE METER',
        alignment: 'center',
        bold: true,
        fontSize: 10,
        margin: [0, 0, 0, 4]
      },
      ...(r.certificate_no
        ? [
            {
              text: `Certificate No: ${r.certificate_no}`,
              alignment: 'right',
              bold: true,
              fontSize: 9,
              margin: [18, 0, 18, 4]
            }
          ]
        : [])
    );

    blocks.push(this.metaRow(meta));
    blocks.push(this.certTable(r));
    blocks.push(this.signatureBlock(meta, images));

    return blocks;
  }

  private buildDoc(
    header: SolarHeader,
    rows: SolarRow[],
    images: Record<string, string>
  ) {
    const meta = {
      zone:
        (header.location_code ? header.location_code + ' - ' : '') +
        (header.location_name || ''),
      method: header.testMethod || '-',
      status: header.testStatus || '-',
      bench: header.testing_bench || '-',
      user: header.testing_user || '-',
      date: header.date || new Date().toISOString().slice(0, 10),

      lab_name: header.lab_name || '',
      lab_address: header.lab_address || '',
      lab_email: header.lab_email || '',
      lab_phone: header.lab_phone || '',

      testing_user: header.testing_user || '',
      approving_user: header.approving_user || '',

      testedByName: header.testedByName || '',
      testedByDesignation: header.testedByDesignation || '',
      verifiedByName: header.verifiedByName || '',
      verifiedByDesignation: header.verifiedByDesignation || '',
      approvedByName: header.approvedByName || '',
      approvedByDesignation: header.approvedByDesignation || ''
    };

    const data = (rows || []).filter(
      r => !!(r?.meter_sr_no && String(r.meter_sr_no).trim())
    );

    const content: any[] = [];
    if (!data.length) {
      content.push(...this.page({} as SolarRow, meta, images));
    } else {
      data.forEach((r, i) => {
        content.push(...this.page(r, meta, images));
        if (i < data.length - 1) {
          content.push({ text: '', pageBreak: 'after' });
        }
      });
    }

    return {
      pageSize: 'A4',
       pageMargins: [12, 10, 12, 30],
      defaultStyle: {
        fontSize: 9,
        color: '#111',
        lineHeight: 1.05
      },
      images,
      footer: (current: number, total: number) => ({
        margin: [18, 0, 18, 6],
        columns: [
          {
            text: `Page ${current} of ${total}`,
            alignment: 'left',
            fontSize: 8,
            color: '#666'
          },
          {
            text: 'MPPKVVCL  Indore',
            alignment: 'right',
            fontSize: 8,
            color: '#666'
          }
        ]
      }),
      info: { title: 'Solar_NetMeter_Certificates_SMART' },
      content
    } as any;
  }
}