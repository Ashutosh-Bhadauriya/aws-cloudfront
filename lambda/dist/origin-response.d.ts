declare const https: any;
declare const crypto: any;
declare const ENCRYPTION_KEY = "8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=";
declare const ENCRYPTION_IV = "LCXsz5QWUjiIK5yja6CJPA==";
declare const AUTH_SIGNAL_API_KEY = "xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==";
declare function filterReadOnlyHeaders(headers: any): {};
declare function httpRequest(options: any, body: any): Promise<unknown>;
declare function encrypt(data: any): any;
declare function decrypt(text: any): any;
declare function getCookie(cookieHeaders: any, name: any): any;
