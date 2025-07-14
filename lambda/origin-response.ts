'use strict';

const https = require('https');
const crypto = require('crypto');

// IMPORTANT: Replace with your secure values
const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';
const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';

// Helper function for HTTPS requests
function httpRequest(options, body) {
  console.log('Making HTTP request:', { 
    hostname: options.hostname,
    path: options.path,
    method: options.method
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          console.log(`HTTP Response status code: ${res.statusCode}`);
          const parsedData = JSON.parse(data);
          console.log('Response body:', JSON.stringify(parsedData).substring(0, 200) + (JSON.stringify(parsedData).length > 200 ? '...' : ''));
          resolve({ statusCode: res.statusCode, body: parsedData });
        } catch (err) {
          console.error('Failed to parse response:', err.message);
          console.log('Raw response data:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (err) => {
      console.error('HTTP request error:', err.message);
      reject(err);
    });
    
    if (body) {
      console.log('Request body:', body);
      req.write(body);
    }
    req.end();
  });
}

// Encryption helpers
function encrypt(data) {
  console.log('Encrypting data:', typeof data === 'object' ? JSON.stringify(data).substring(0, 50) + '...' : data);
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY,'base64'), Buffer.from(ENCRYPTION_IV,'base64'));
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    console.log('Encryption successful, length:', encrypted.length);
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

function decrypt(text) {
  console.log('Attempting to decrypt data, length:', text ? text.length : 0);
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY,'base64'), Buffer.from(ENCRYPTION_IV,'base64'));
    let decrypted = decipher.update(text, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    console.log('Decryption successful, result:', decrypted.substring(0, 50) + (decrypted.length > 50 ? '...' : ''));
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Extract a specific cookie from headers
function getCookie(cookieHeaders, name) {
  console.log(`Looking for cookie: ${name} in headers`);
  if (!cookieHeaders) {
    console.log('No cookie headers found');
    return null;
  }
  
  for (const header of cookieHeaders) {
    console.log(`Examining cookie header: ${header.value}`);
    const cookies = header.value.split(';');
    for (const cookie of cookies) {
      const parts = cookie.trim().split('=');
      if (parts[0] === name && parts.length > 1) {
        const value = parts.slice(1).join('=');
        console.log(`Found ${name} cookie with value length: ${value.length}`);
        return value; // Handle values containing =
      }
    }
  }
  
  console.log(`Cookie ${name} not found`);
  return null;
}

exports.handler = async (event) => {
  console.log('Lambda@Edge function started');
  console.log('Event type:', event.Records[0].cf.config.eventType);
  
  
  const { request } = event.Records[0].cf;
  let response = event.Records[0].cf.response;
  console.log(`Request method: ${request.method}, URI: ${request.uri}, Response status: ${response ? response.status : 'N/A'}`);
  
  // Only process successful login responses (redirects with 302/303 status)
  if (request.method === 'POST' && request.uri === '/api/login' && (response.status === '302' || response.status === '303')) {
    console.log('Processing successful login redirect response');
    
    // Fix internal redirect URLs in Location header by creating new response
    if (response.headers.location && response.headers.location[0]) {
      const locationHeader = response.headers.location[0].value;
      console.log(`Original location header: ${locationHeader}`);
      
      // Check if it's an internal AWS hostname (ECS tasks or ALB)
      if (locationHeader.includes('ec2.internal') || 
          locationHeader.includes(':3000') || 
          locationHeader.includes('.elb.amazonaws.com')) {
        const publicHost = 'd3w0aux8k6z2b9.cloudfront.net';
        const protocol = 'https';
        
        // Extract just the path from the internal URL
        const url = new URL(locationHeader);
        const path = url.pathname + url.search + url.hash;
        
        // Create the corrected public URL
        const correctedLocation = `${protocol}://${publicHost}${path}`;
        console.log(`Correcting location header to: ${correctedLocation}`);
        
        // Create a new response object to avoid read-only header issues
        const correctedResponse = {
          status: response.status,
          statusDescription: response.statusDescription,
          headers: {
            ...response.headers,
            'location': [{
              key: 'Location',
              value: correctedLocation
            }]
          }
        };
        response = correctedResponse;
      }
    }
    
    try {
      // Extract username from our cookie
      let userId = null;
      if (request.headers.cookie) {
        console.log('Cookie headers found, attempting to extract auth_username');
        const encryptedUsername = getCookie(request.headers.cookie, 'auth_username');
        if (encryptedUsername) {
          console.log('Found encrypted username, attempting to decrypt');
          userId = decrypt(encryptedUsername);
        }
      } else {
        console.log('No cookie headers in request');
      }
      
      // If we couldn't extract the userId, skip the additional security check
      if (!userId) {
        console.log('No userId found, skipping security check');
        return response;
      }
      
      console.log(`User ID extracted: ${userId}`);
      
      const wafHeaders = {};
      // Iterate through all properties in the object
      for (const key in request.headers) {
        // Check if the key starts with "x-amzn-waf-"
        if (key.startsWith('x-amzn-waf-') && Array.isArray(request.headers[key])) {
          // Extract the value from the array of objects
          request.headers[key].forEach(item => {
            if (item.key === key && item.value) {
              wafHeaders[key.replaceAll('-','_')] = item.value;
            }
          });
        }
      }
      console.log(`Headers: ${JSON.stringify(request.headers)}`)
      console.log(`WAF headers: ${JSON.stringify(wafHeaders)}`);

      // Call AuthSignal API
      console.log('Calling AuthSignal API');
      const apiResponse = await httpRequest(
        {
          hostname: 'api.authsignal.com',
          path: `/v1/users/${userId}/actions/signIn`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')
          }
        },
        JSON.stringify({
          redirectUrl: `https://d3w0aux8k6z2b9.cloudfront.net/dashboard`,
          ipAddress: request.clientIp,
          userAgent: request.headers["user-agent"][0].value,
          custom: wafHeaders
        })
      );
      
      console.log(`AuthSignal response state: ${apiResponse.body.state}`);
      
      // If no additional security needed, continue with normal login
      if (apiResponse.body.state === 'ALLOW') {
        console.log('AuthSignal state ALLOW, continuing with normal login flow');
        
        // FORCE Location header rewrite in case it wasn't caught earlier
        if (response.headers.location && response.headers.location[0]) {
          const locationHeader = response.headers.location[0].value;
          console.log(`Double-checking location header in ALLOW: ${locationHeader}`);
          
          if (locationHeader.includes('.elb.amazonaws.com') || 
              locationHeader.includes('ec2.internal') || 
              locationHeader.includes(':3000')) {
            const publicHost = 'd3w0aux8k6z2b9.cloudfront.net';
            const protocol = 'https'; // Force HTTPS for CloudFront
            const url = new URL(locationHeader);
            const path = url.pathname + url.search + url.hash;
            const correctedLocation = `${protocol}://${publicHost}${path}`;
            console.log(`FORCE correcting location header to: ${correctedLocation}`);
            
            // Create new response to avoid read-only header issues
            response = {
              status: response.status,
              statusDescription: response.statusDescription,
              headers: {
                ...response.headers,
                'location': [{
                  key: 'Location',
                  value: correctedLocation
                }]
              }
            };
          }
        }
        
        // Add a cookie to clear the username cookie when returning the response
        const existingCookies = response.headers['set-cookie'] || [];
        response = {
          status: response.status,
          statusDescription: response.statusDescription,
          headers: {
            ...response.headers,
            'set-cookie': [
              ...existingCookies,
              {
                key: 'Set-Cookie',
                value: `auth_username=; Path=/; Secure; HttpOnly; Max-Age=0`
              }
            ]
          }
        };
        console.log('Added cookie to clear auth_username');
        return response;
      } // If challenge required, save original state and redirect to challenge
      else if (apiResponse.body.state === 'CHALLENGE_REQUIRED') {
        console.log('AuthSignal state CHALLENGE_REQUIRED, redirecting to challenge');
        
        // Get original session cookies and location from response
        const sessionCookies = response.headers['set-cookie'] || [];
        console.log(`Found ${sessionCookies.length} session cookies`);
        
        const originalLocation = response.headers.location ? 
                               response.headers.location[0].value : '/';
        console.log(`Original location: ${originalLocation}`);
        
        // Create and encrypt a cookie with data we need to preserve
        const cookieData = {
          userId: userId,
          idempotencyKey: apiResponse.body.idempotencyKey,
          originalLocation: originalLocation,
          sessionCookies: sessionCookies
        };
        
        console.log('Creating auth_challenge cookie with data');
        console.log('Redirect URL from AuthSignal:', apiResponse.body.url);
        
        // Encrypt cookie data
        const encryptedCookie = encrypt(cookieData);
        
        // Redirect to the challenge URL with our secure cookie
        const modifiedResponse = {
          status: '302',
          statusDescription: 'Found',
          headers: {
            'location': [{
              key: 'Location',
              value: apiResponse.body.url
            }],
            'set-cookie': [
              {
                key: 'Set-Cookie',
                value: `auth_challenge=${encryptedCookie}; Secure; HttpOnly; Path=/; SameSite=Lax`
              },
              {
                key: 'Set-Cookie',
                value: `auth_username=; Path=/; Secure; HttpOnly; Max-Age=0`
              }
            ],
            'cache-control': [{
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate'
            }]
          }
        };
        
        console.log('Returning modified response with challenge redirect');
        return modifiedResponse;
      } else {
        console.log(`Unexpected AuthSignal state: ${apiResponse.body.state}`);
      }
    } catch (error) {
      console.error('Error in security check:', error);
      console.error('Stack trace:', error.stack);
      // In case of error, continue with the normal login flow
      return response;
    }
  } else {
    console.log('Not a successful login response, passing through');
  }
  
  // Default: return the original response
  console.log('Returning original response');
  return response;
};