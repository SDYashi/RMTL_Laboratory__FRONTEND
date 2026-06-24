import { HttpContextToken } from '@angular/common/http';

/**
 * Marks an HTTP request as intentionally public.
 * Public requests do not receive an Authorization header and a 401 response
 * must not force the browser to the login page.
 */
export const PUBLIC_API_REQUEST = new HttpContextToken<boolean>(() => false);
