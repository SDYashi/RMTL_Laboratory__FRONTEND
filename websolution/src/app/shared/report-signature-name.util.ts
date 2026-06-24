/**
 * Resolves tester and approver display names from the different header/meta
 * shapes used by the PDF report services and API responses.
 */
export interface ReportSignatureNames {
  testerName: string;
  approverName: string;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  const result = String(value).trim();
  return result === '-' ? '' : result;
}

function personName(value: any): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return text(value);
  return text(value.name) || text(value.full_name) || text(value.username);
}

function firstName(...values: any[]): string {
  for (const value of values) {
    const resolved = personName(value);
    if (resolved) return resolved;
  }
  return '';
}

export function resolveReportSignatureNames(
  source: any,
  fallback = '-'
): ReportSignatureNames {
  const meta = source || {};
  const assignment = meta.assignment || {};
  const testing = meta.testing || {};

  const testerName = firstName(
    meta.testing_user,
    meta.testerName,
    meta.testedByName,
    meta.tested_by_name,
    meta.user,
    meta.user_assigned,
    assignment.user_assigned,
    testing.testing_user,
    testing.tester_name,
    testing.tested_by_name
  ) || fallback;

  const approverName = firstName(
    meta.approving_user,
    meta.approverName,
    meta.approvedByName,
    meta.approved_by_name,
    meta.approver,
    meta.assigned_by_user,
    assignment.assigned_by_user,
    testing.approving_user,
    testing.approver_name,
    testing.approved_by_name
  ) || fallback;

  return { testerName, approverName };
}

export function signatureNameUpper(value: string): string {
  return text(value).toUpperCase() || '-';
}
