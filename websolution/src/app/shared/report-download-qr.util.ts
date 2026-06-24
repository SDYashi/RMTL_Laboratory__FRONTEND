import { removePdfCellBackgroundColors } from './pdf-report-style.util';

/**
 * Adds a native pdfMake QR block to the end of a generated report.
 * No third-party QR package is required because pdfMake supports the `qr` node.
 */

export interface ActiveReportQrContext {
  reportId: string;
  reportType: string;
}

let activeContext: ActiveReportQrContext | null = null;

export function setActiveReportQrContext(context: ActiveReportQrContext): void {
  activeContext = {
    reportId: String(context?.reportId || '').trim(),
    reportType: String(context?.reportType || '').trim()
  };
}

export function clearActiveReportQrContext(): void {
  activeContext = null;
}

const REPORT_ID_KEYS = ['report_id', 'reportId', 'test_report_id', 'testReportId'];

const REPORT_TYPE_KEYS = ['report_type', 'reportType', 'test_report_type', 'device_testing_purpose'];
const SERIAL_KEYS = ['serial_number', 'serial_no', 'serial', 'meter_serial_no', 'meter_sr_no', 'device_serial_number'];

function firstValue(source: any, keys: string[], depth = 0): string {
  if (!source || depth > 2) return '';

  if (Array.isArray(source)) {
    for (const item of source.slice(0, 3)) {
      const found = firstValue(item, keys, depth + 1);
      if (found) return found;
    }
    return '';
  }

  if (typeof source !== 'object') return '';

  for (const key of keys) {
    const value = source[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }

  for (const value of Object.values(source).slice(0, 12)) {
    if (value && typeof value === 'object') {
      const found = firstValue(value, keys, depth + 1);
      if (found) return found;
    }
  }

  return '';
}

function applicationBaseUrl(): URL {
  const origin = window.location.origin;
  const path = window.location.pathname || '/';

  // Derive the deployment prefix from the active Angular route. This works
  // for root deployments and sub-path deployments such as /rmtl/.
  for (const marker of ['/wzlab/', '/wzlogin', '/public/report-download']) {
    const index = path.indexOf(marker);
    if (index >= 0) return new URL(path.slice(0, index + 1) || '/', origin);
  }

  const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
  if (baseHref !== '/') return new URL(baseHref, origin);
  return new URL('/', origin);
}

export function buildReportDownloadUrl(source: any, defaultReportType: string): string {
  const reportId = activeContext?.reportId || firstValue(source, REPORT_ID_KEYS);
  const reportType =
    activeContext?.reportType || firstValue(source, REPORT_TYPE_KEYS) || defaultReportType;
  const serialNumber = firstValue(source, SERIAL_KEYS);

  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return reportId ? `report:${reportType}:${reportId}` : 'report-download';
  }

  if ((!reportId && !serialNumber) || !reportType) return window.location.href;

  const url = new URL('public/report-download', applicationBaseUrl());
  // Use compact QR-only aliases to reduce the encoded module count. The
  // report screen still accepts the original long query names for backward
  // compatibility with existing links and previously generated PDFs.
  if (reportId) url.searchParams.set('r', reportId);
  else url.searchParams.set('s', serialNumber);
  url.searchParams.set('t', reportType);
  url.searchParams.set('d', '1');
  return url.toString();
}

export function appendReportDownloadQr(
  doc: any,
  source: any,
  defaultReportType = ''
): any {
  if (!doc) return doc;

  removePdfCellBackgroundColors(doc);

  const url = buildReportDownloadUrl(source, defaultReportType);
  const reportId = activeContext?.reportId || firstValue(source, REPORT_ID_KEYS);
  const reportType =
    activeContext?.reportType || firstValue(source, REPORT_TYPE_KEYS) || defaultReportType;
  const serialNumber = firstValue(source, SERIAL_KEYS);

  const qrBlock = {
    unbreakable: true,
    margin: [18, 8, 18, 6],
    table: {
      widths: ['*', 96],
      body: [[
        {
          border: [true, true, false, true],
          margin: [8, 6, 6, 6],
          stack: [
            { text: 'SCAN TO DOWNLOAD REPORT', bold: true, fontSize: 9 },
            {
              text: 'Scan with a phone camera.  the report PDF download starts automatically.',
              fontSize: 7,
              margin: [0, 3, 0, 0]
            },
            reportId
              ? { text: `Report: ${reportId}${reportType ? `  •  ${reportType}` : ''}`, fontSize: 7, bold: true, margin: [0, 4, 0, 0] }
              : serialNumber
                ? { text: `Serial: ${serialNumber}${reportType ? `  •  ${reportType}` : ''}`, fontSize: 7, bold: true, margin: [0, 4, 0, 0] }
                : { text: 'The report identifier is unavailable for this QR code.', fontSize: 7, margin: [0, 4, 0, 0] }
          ]
        },
        {
          border: [false, true, true, true],
          qr: url,
          // 80% of the previous 98 pt QR size. Native vector output,
          // medium error correction, and an 8 pt quiet area preserve scanning.
          fit: 78.4,
          eccLevel: 'M',
          alignment: 'center',
          margin: [8, 6, 8, 6]
        }
      ]]
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => '#7a7a7a',
      vLineColor: () => '#7a7a7a'
    }
  };

  const content = Array.isArray(doc.content)
    ? doc.content
    : (doc.content ? [doc.content] : []);

  content.push(qrBlock);
  doc.content = content;
  return doc;
}
