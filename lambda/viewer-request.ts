import { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';
import { parse } from 'querystring';
import { encrypt } from './crypto';

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const request = event.Records[0].cf.request;

  if (request.method === 'POST' && request.uri === '/api/login') {
    if (request.body && request.body.data) {
      let decodedBody: string;

      if (request.body.encoding === 'base64') {
        decodedBody = Buffer.from(request.body.data, 'base64').toString('utf8');
      } else {
        decodedBody = request.body.data;
      }

      const formData = parse(decodedBody);
      const username = formData.email as string;

      if (username) {
        const encryptedUsername = encrypt(username);

        if (!request.headers.cookie) {
          request.headers.cookie = [];
        }

        const cookieValue = `auth_username=${encryptedUsername}; Path=/; Secure; HttpOnly; SameSite=Lax`;
        request.headers.cookie.push({ key: 'Cookie', value: cookieValue });
      }
    }
  }

  return request;
} 