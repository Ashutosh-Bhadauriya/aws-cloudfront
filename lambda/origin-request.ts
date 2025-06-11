import { CloudFrontRequestEvent, CloudFrontResultResponse } from 'aws-lambda';
import { decrypt } from './crypto';
import * as https from 'https';
import { parse } from 'querystring';

const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';

interface AuthSignalValidateResponse {
    state: 'CHALLENGE_SUCCEEDED' | 'CHALLENGE_FAILED';
    idempotencyKey: string;
    userId: string;
}

interface ChallengeCookieData {
    userId: string;
    idempotencyKey: string;
    originalLocation: string;
    sessionCookies: { key: string; value: string }[];
}

function getCookie(cookies: { key?: string; value: string }[], key: string): string | null {
    if (!cookies) return null;
    const cookie = cookies.find(c => c.value.trim().startsWith(`${key}=`));
    return cookie ? cookie.value.split('=')[1] : null;
}

function httpRequest(options: https.RequestOptions, body: string): Promise<AuthSignalValidateResponse> {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontResultResponse | CloudFrontRequestEvent['Records'][0]['cf']['request']> {
    const request = event.Records[0].cf.request;

    if (request.method === 'GET' && request.uri === '/api/mfa-callback') {
        const queryParams = parse(request.querystring);
        const token = queryParams.token as string;
        
        if (token && request.headers.cookie) {
            const authChallengeCookie = getCookie(request.headers.cookie, 'auth_challenge');

            if (authChallengeCookie) {
                const cookieData: ChallengeCookieData | null = JSON.parse(decrypt(authChallengeCookie) || 'null');

                if (cookieData) {
                    const validateResponse = await httpRequest(
                        {
                            hostname: 'api.authsignal.com',
                            path: '/v1/validate',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Basic ${Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')}`
                            },
                        },
                        JSON.stringify({ token })
                    );

                    const { state, idempotencyKey, userId } = validateResponse;
                    
                    if (
                        state === 'CHALLENGE_SUCCEEDED' &&
                        idempotencyKey === cookieData.idempotencyKey &&
                        userId === cookieData.userId
                    ) {
                        const headers: { [key: string]: ({ key: string; value: string; })[] } = {
                            'location': [{ key: 'Location', value: cookieData.originalLocation }],
                            'set-cookie': [
                                { key: 'Set-Cookie', value: 'auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0' }
                            ],
                            'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]
                        };

                        if (Array.isArray(cookieData.sessionCookies)) {
                            cookieData.sessionCookies.forEach(cookieObj => {
                                if (cookieObj.key) {
                                    headers['set-cookie'].push({key: 'Set-Cookie', value: cookieObj.value});
                                }
                            });
                        }

                        const response: CloudFrontResultResponse = {
                            status: '302',
                            statusDescription: 'Found',
                            headers: headers,
                        };

                        return response;
                    } else {
                         const response: CloudFrontResultResponse = {
                            status: '403',
                            statusDescription: 'Forbidden',
                            headers: {
                                'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
                                'set-cookie': [{ key: 'Set-Cookie', value: 'auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0' }]
                            },
                            body: 'Authentication challenge failed.'
                        };
                        return response;
                    }
                }
            }
        }
    }

    return request;
} 