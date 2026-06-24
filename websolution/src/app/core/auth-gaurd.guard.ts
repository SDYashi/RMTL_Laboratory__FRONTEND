import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  // Backward compatibility for QR codes printed before the dedicated public
  // route was introduced. Convert only an auto-download report URL to the
  // public page; every other /wzlab route remains protected.
  const parsedUrl = router.parseUrl(state.url);
  const primaryPath = parsedUrl.root.children['primary']?.segments
    .map(segment => segment.path)
    .join('/') || '';
  const query = parsedUrl.queryParams;
  const isAutoDownload = query['d'] === '1' ||
    query['download'] === '1' ||
    query['autoDownload'] === '1';
  const hasReportKey = !!(query['r'] || query['report_id'] || query['s'] || query['serial_number']);
  const hasReportType = !!(query['t'] || query['report_type']);

  if (
    primaryPath === 'wzlab/testing/view-testreports' &&
    isAutoDownload &&
    hasReportKey &&
    hasReportType
  ) {
    return router.createUrlTree(['/public/report-download'], {
      queryParams: query
    });
  }

  return router.createUrlTree(['/wzlogin'], { queryParams: { returnUrl: state.url } });
};
