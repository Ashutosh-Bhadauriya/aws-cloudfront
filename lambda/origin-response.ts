import { CloudFrontResponseEvent, CloudFrontResponseResult } from 'aws-lambda';
import { decrypt, encrypt } from './crypto';
import * as https from 'https';

const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';

interface AuthSignalSignInResponse {
  state: 'ALLOW' | 'CHALLENGE_REQUIRED';
  idempotencyKey: string;
  url: string;
}

function getCookie(cookies: { key?: string; value: string }[], key: string): string | null {
  if (!cookies) return null;
  const cookie = cookies.find(c => c.value.trim().startsWith(`${key}=`));
  return cookie ? cookie.value.split('=')[1] : null;
}

function httpRequest(options: https.RequestOptions, body: string): Promise<AuthSignalSignInResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(body);
    req.end();
  });
}

export async function handler(event: CloudFrontResponseEvent): Promise<CloudFrontResponseResult> {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;

  if (request.method === 'POST' && request.uri === '/api/login' && response.status === '302') {
    const encryptedUsername = getCookie(request.headers.cookie, 'auth_username');
    let userId: string | null = null;

    if (encryptedUsername) {
      userId = decrypt(encryptedUsername);
    }

    if (!userId) {
      return response;
    }
    
    const wafHeaders: { [key: string]: string } = {};
    for (const key in request.headers) {
        if (key.startsWith('x-amzn-waf-')) {
            wafHeaders[key.replace(/-/g, '_')] = request.headers[key][0].value;
        }
    }

    const apiResponse = await httpRequest(
      {
        hostname: 'api.authsignal.com',
        path: `/v1/users/${encodeURIComponent(userId)}/actions/signIn`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')}`
        },
      },
      JSON.stringify({
        redirectUrl: `https://${request.headers.host[0].value}/api/mfa-callback`,
        ipAddress: request.clientIp,
        userAgent: request.headers['user-agent'] ? request.headers['user-agent'][0].value : '',
        custom: wafHeaders
      })
    );

    if (apiResponse.state === 'ALLOW') {
      if (!response.headers['set-cookie']) {
        response.headers['set-cookie'] = [];
      }
      response.headers['set-cookie'].push({
        key: 'Set-Cookie',
        value: 'auth_username=; Path=/; Secure; HttpOnly; Max-Age=0'
      });
      return response;
    } else if (apiResponse.state === 'CHALLENGE_REQUIRED') {
      const sessionCookies = response.headers['set-cookie'] || [];
      const originalLocation = response.headers.location ? response.headers.location[0].value : '/';

      const cookieData = {
        userId,
        idempotencyKey: apiResponse.idempotencyKey,
        originalLocation,
        sessionCookies,
      };

      const encryptedCookie = encrypt(JSON.stringify(cookieData));

      const modifiedResponse: CloudFrontResponseResult = {
        status: '302',
        statusDescription: 'Found',
        headers: {
          'location': [{
            key: 'Location',
            value: apiResponse.url
          }],
          'set-cookie': [
            {
              key: 'Set-Cookie',
              value: `auth_challenge=${encryptedCookie}; Secure; HttpOnly; Path=/; SameSite=Lax`
            },
            {
              key: 'Set-Cookie',
              value: 'auth_username=; Path=/; Secure; HttpOnly; Max-Age=0'
            }
          ],
          'cache-control': [{
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }]
        }
      };
      return modifiedResponse;
    }
  }

  return response;
} 