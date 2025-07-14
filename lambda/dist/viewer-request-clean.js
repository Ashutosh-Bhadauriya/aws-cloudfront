'use strict';

const crypto = require('crypto');

const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';

function maskUsername(username) {
    if (username && username.length > 3) {
        return username.substring(0, 2) + '***' + username.substring(username.length - 2);
    }
    return '***';
}

function encrypt(text) {
    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}

exports.handler = (event, context, callback) => {
    console.log('Viewer Request: Processing request');
    
    const request = event.Records[0].cf.request;
    console.log(`Viewer Request: ${request.method} ${request.uri}`);
    
    if (request.method === 'POST' && request.uri === '/api/login') {
        console.log('Processing login form submission');
        
        try {
            if (request.body && request.body.data) {
                const bodyData = Buffer.from(request.body.data, 'base64').toString('utf8');
                console.log('Decoded body from base64:', bodyData);
                
                const params = new URLSearchParams(bodyData);
                const email = params.get('email');
                const password = params.get('password');
                
                console.log('Form data keys:', Array.from(params.keys()));
                console.log('Email found in form data:', email ? maskUsername(email) : 'null');
                
                if (email) {
                    console.log('Encrypting username:', maskUsername(email));
                    const encryptedUsername = encrypt(email);
                    
                    console.log('Adding auth_username to request headers for origin');
                    
                    // Create new cookie header value
                    const cookieValue = `auth_username=${encryptedUsername}`;
                    
                    // Initialize cookie headers if they don't exist
                    if (!request.headers.cookie) {
                        request.headers.cookie = [];
                    }
                    
                    // Check if auth_username cookie already exists
                    let cookieFound = false;
                    for (let i = 0; i < request.headers.cookie.length; i++) {
                        if (request.headers.cookie[i].value.includes('auth_username=')) {
                            request.headers.cookie[i].value = cookieValue;
                            cookieFound = true;
                            break;
                        }
                    }
                    
                    // Add new cookie if not found - use safe array replacement
                    if (!cookieFound) {
                        const newCookies = [
                            ...request.headers.cookie,
                            {
                                key: 'Cookie',
                                value: cookieValue
                            }
                        ];
                        request.headers.cookie = newCookies;
                    }
                    
                    console.log('Auth username added to request headers, forwarding to origin');
                }
            }
        } catch (error) {
            console.error('Error processing login form:', error);
        }
    }
    
    console.log('Forwarding request to origin');
    callback(null, request);
}; 