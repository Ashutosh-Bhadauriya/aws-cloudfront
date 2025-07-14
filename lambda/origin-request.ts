'use strict';

const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

// IMPORTANT: Replace with your secure values
const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';
const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';

// Helper function for HTTPS requests
function httpRequest(options, body) {
  console.log('Making HTTP request to:', options.hostname + options.path);
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      console.log(`HTTP request status: ${res.statusCode}`);

      res.on('data', (chunk) => {
        data += chunk;
        console.log('Received data chunk');
      });
      
      res.on('end', () => {
        console.log('Response completed');
        try {
          const parsedData = JSON.parse(data);
          console.log('Response parsed successfully:', JSON.stringify(parsedData).substring(0, 200));
          resolve({ statusCode: res.statusCode, body: parsedData });
        } catch (err) {
          console.error('Failed to parse response:', err.message);
          console.error('Raw response:', data.substring(0, 200));
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('HTTP request error:', err.message);
      reject(err);
    });
    
    if (body) {
      console.log('Request body:', body.substring(0, 200));
      req.write(body);
    }
    
    req.end();
    console.log('Request sent');
  });
}

// Decryption helper
function decrypt(encryptedData) {
  console.log('Attempting to decrypt data:', encryptedData.substring(0, 20) + '...');
  try {
    // Make sure keys are properly formatted for Buffer
    const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64');
    const ivBuffer = Buffer.from(ENCRYPTION_IV, 'base64');
    
    console.log(`Key length: ${keyBuffer.length}, IV length: ${ivBuffer.length}`);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('Decryption successful, parsing JSON');
    const parsedData = JSON.parse(decrypted);
    console.log('Cookie data parsed:', JSON.stringify(parsedData).substring(0, 200));
    return parsedData;
  } catch (error) {
    console.error('Decryption error details:', error.message);
    console.error('Error stack:', error.stack);
    return null;
  }
}

// Extract a specific cookie from headers
function getCookie(cookieHeaders, name) {
  console.log(`Looking for cookie: ${name}`);
  if (!cookieHeaders) {
    console.log('No cookie headers found');
    return null;
  }

  console.log(`Found ${cookieHeaders.length} cookie header(s)`);
  for (const header of cookieHeaders) {
    console.log(`Examining cookie header: ${header.value.substring(0, 50)}...`);
    const cookies = header.value.split(';');
    for (const cookie of cookies) {
      const parts = cookie.trim().split('=');
      if (parts[0] === name && parts.length > 1) {
        const value = parts.slice(1).join('=');
        console.log(`Found ${name} cookie with length: ${value.length}`);
        return value; 
      }
    }
  }
  console.log(`Cookie ${name} not found in headers`);
  return null;
}

exports.handler = async (event) => {
  console.log('Lambda function started');
  console.log('Event type:', typeof event);
  console.log('Event structure:', JSON.stringify(event).substring(0, 200));
  
  const request = event.Records[0].cf.request;
  console.log(`Processing request: ${request.method} ${request.uri}${request.querystring ? '?' + request.querystring : ''}`);
  
  // Only process GET requests to /dashboard with challenge_id parameter (AuthSignal MFA callback)
  if (request.method === 'GET' && request.uri === '/dashboard' && request.querystring && request.querystring.includes('challenge_id=')) {
    console.log('Processing MFA callback endpoint');
    const queryParams = querystring.parse(request.querystring);
    console.log('Query params:', JSON.stringify(queryParams));
    
    const token = queryParams.token;
    console.log(`Token present: ${!!token}`);
    console.log(`Cookie headers present: ${!!request.headers.cookie}`);

    // Check for both token and our secure cookie
    if (token && request.headers.cookie) {
      const authChallengeCookie = getCookie(request.headers.cookie, 'auth_challenge');
      console.log(`Auth challenge cookie present: ${!!authChallengeCookie}`);

      if (authChallengeCookie) {
        try {
          console.log('Attempting to decrypt cookie data');
          // Decrypt our cookie to get stored information
          const cookieData = decrypt(authChallengeCookie);
          if (!cookieData) {
            console.error('Failed to decrypt cookie data');
            throw new Error('Failed to decrypt cookie data');
          }
          console.log('Cookie data fields:', Object.keys(cookieData).join(', '));

          console.log('Calling AuthSignal API to validate token');
          // Validate the challenge token with AuthSignal API
          const validateResponse = await httpRequest(
            {
              hostname: 'api.authsignal.com',
              path: '/v1/validate',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')
              }
            },
            JSON.stringify({ token })
          );
          
          console.log('AuthSignal validation response status:', validateResponse.statusCode);
          console.log('AuthSignal state:', validateResponse.body.state);
          
          // Validation checks
          const stateCheck = validateResponse.body.state === 'CHALLENGE_SUCCEEDED';
          const idempotencyKeyCheck = validateResponse.body.idempotencyKey === cookieData.idempotencyKey;
          const userIdCheck = validateResponse.body.userId === cookieData.userId;
          
          console.log('Validation checks:', {
            stateCheck,
            idempotencyKeyCheck,
            userIdCheck
          });

          // Check if challenge succeeded and idempotency key matches
          if (stateCheck && idempotencyKeyCheck && userIdCheck) {
            console.log('Authentication successful, creating redirect response');
            console.log('Redirecting to:', cookieData.originalLocation);
            
            // Check session cookies
            console.log('Session cookies:', Array.isArray(cookieData.sessionCookies) 
              ? `Found ${cookieData.sessionCookies.length} cookies`
              : 'No session cookies found');
            
            // Challenge succeeded - create response
            const response = {
              status: '302',
              statusDescription: 'Found',
              headers: {
                'location': [{
                key: 'Location',
                  value: cookieData.originalLocation
                }],
                'set-cookie': [
                  {
                    key: 'Set-Cookie',
                    value: `auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0`
                  }
                ],
                'cache-control': [{
                  key: 'Cache-Control',
                  value: 'no-cache, no-store, must-revalidate'
                }]
              }
            };
            
            // Add all original session cookies
            if (Array.isArray(cookieData.sessionCookies)) {
              console.log(`Adding ${cookieData.sessionCookies.length} session cookies to response`);
              for (const cookieObj of cookieData.sessionCookies) {
                response.headers['set-cookie'].push(cookieObj);
              }
            }
            
            console.log('Returning successful response');
            return response;
          } else {
            console.log('Challenge validation failed');
            console.log('Validation failures:', {
              state: !stateCheck ? validateResponse.body.state : null,
              idempotencyKeyMismatch: !idempotencyKeyCheck ? {
                expected: cookieData.idempotencyKey,
                received: validateResponse.body.idempotencyKey
              } : null,
              userIdMismatch: !userIdCheck ? {
                expected: cookieData.userId,
                received: validateResponse.body.userId
              } : null
            });
            
            // Challenge failed or idempotency key mismatch
            return {
              status: '403',
              statusDescription: 'Forbidden',
              headers: {
                'content-type': [{
                  key: 'Content-Type',
                  value: 'text/plain'
                }],
                'set-cookie': [{
                  key: 'Set-Cookie',
                  value: `auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0`
                }]
              },
              body: 'Authentication challenge failed.'
            };
          }
        } catch (error) {
          console.error('Error validating challenge:', error.message);
          console.error('Error stack:', error.stack);
          return {
            status: '400',
            statusDescription: 'Bad Request',
            headers: {
              'content-type': [{
                key: 'Content-Type',
                value: 'text/plain'
              }],
              'set-cookie': [{
                key: 'Set-Cookie',
                value: `auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0`
              }]
            },
            body: 'Error processing authentication challenge.'
          };
        }
      }
    }
  }

  // Default: continue with the original request
  console.log('No special processing, continuing with original request');
  return request;
};