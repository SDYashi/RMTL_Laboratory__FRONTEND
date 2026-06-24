import { resolveReportSignatureNames, signatureNameUpper } from './report-signature-name.util';

describe('report signature name utilities', () => {
  it('resolves standard PDF header fields', () => {
    expect(resolveReportSignatureNames({
      testing_user: 'Deepak Marskole',
      approving_user: 'Approver Name'
    })).toEqual({
      testerName: 'Deepak Marskole',
      approverName: 'Approver Name'
    });
  });

  it('resolves nested assignment users', () => {
    expect(resolveReportSignatureNames({
      assignment: {
        user_assigned: { name: 'Tester' },
        assigned_by_user: { username: 'Approver' }
      }
    })).toEqual({ testerName: 'Tester', approverName: 'Approver' });
  });

  it('returns visible placeholders instead of blank signature names', () => {
    expect(resolveReportSignatureNames({})).toEqual({
      testerName: '-',
      approverName: '-'
    });
    expect(signatureNameUpper('Deepak Marskole')).toBe('DEEPAK MARSKOLE');
  });
});
