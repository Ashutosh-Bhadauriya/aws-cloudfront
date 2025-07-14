'use strict';

const crypto = require('crypto');
const querystring = require('querystring');

// IMPORTANT: Replace with your secure values
const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';

// Safe username masking function
function maskUsername(username) {
  if (!username) return 'null';
  if (username.length <= 4) return '*'.repeat(username.length);
  return username.substring(0, 2) + '*'.repeat(username.length - 4) + username.substring(username.length - 2);
}

// Simple encryption function to secure the username in cookie
function encrypt(text) {
  console.log(`Encrypting username: ${maskUsername(text)}`);
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

export const handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  console.log(`Viewer Request: ${request.method} ${request.uri}`);

  // Only process POST requests to /api/login (login form submission)
  if (request.method === 'POST' && request.uri === '/api/login') {
    console.log('Processing login form submission');
    
    if (request.body && request.body.data) {
      try {
        const body = Buffer.from(request.body.data, 'base64').toString('utf-8');
        console.log(`Decoded body from base64: ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);

        const formData = querystring.parse(body);
        console.log(`Form data keys: ${Object.keys(formData).join(', ')}`);

        const email = formData.email;
        if (email && typeof email === 'string') {
          console.log(`Email found in form data: ${maskUsername(email)}`);

          const encryptedEmail = encrypt(email);
          if (encryptedEmail) {
            console.log('Adding auth_username to request headers for origin');
            
            // Add the auth_username to the request headers so origin-response can access it
            if (!request.headers.cookie) {
              request.headers.cookie = [];
            }
            
            // Add or update the auth_username cookie in the request
            const cookieValue = `auth_username=${encryptedEmail}`;
            let cookieFound = false;
            
            for (let i = 0; i < request.headers.cookie.length; i++) {
              if (request.headers.cookie[i].value.includes('auth_username=')) {
                request.headers.cookie[i].value = cookieValue;
                cookieFound = true;
                break;
              }
            }
            
            if (!cookieFound) {
              request.headers.cookie.push({
                key: 'Cookie',
                value: cookieValue
              });
            }
            
            console.log('Auth username added to request headers, forwarding to origin');
            callback(null, request);
            return;
          }
        } else {
          console.warn('Email not found or invalid in form data');
        }
      } catch (error) {
        console.error('Error processing login form:', error);
      }
    } else {
      console.warn('No body data found in login request');
    }
  }

  // For all other requests, just pass through without modification
  console.log('Passing request through without modification');
  callback(null, request);
};