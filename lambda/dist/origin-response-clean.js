'use strict';

const https = require('https');
const crypto = require('crypto');

const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';
const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';

function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve({ statusCode: res.statusCode, body: parsedData });
                } catch (err) {
                    reject(new Error(`Failed to parse response: ${err.message}`));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        if (body) {
            req.write(body);
        }
        req.end();
    });
}

function encrypt(data) {
    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}

function decrypt(text) {
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let decrypted = decipher.update(text, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

function getCookie(cookieHeaders, name) {
    if (!cookieHeaders) return null;
    
    for (const header of cookieHeaders) {
        const cookies = header.value.split(';');
        for (const cookie of cookies) {
            const parts = cookie.trim().split('=');
            if (parts[0] === name && parts.length > 1) {
                return parts.slice(1).join('=');
            }
        }
    }
    return null;
}

exports.handler = async (event) => {
    console.log('Origin Response: Lambda@Edge function started');
    
    const { request } = event.Records[0].cf;
    let response = event.Records[0].cf.response;
    
    console.log(`Request: ${request.method} ${request.uri}, Response status: ${response ? response.status : 'N/A'}`);
    
    // Only process successful login responses (redirects with 302/303 status)
    if (request.method === 'POST' && request.uri === '/api/login' && (response.status === '302' || response.status === '303')) {
        console.log('Processing successful login redirect response');
        
        try {
            // Extract username from cookie
            let userId = null;
            if (request.headers.cookie) {
                const encryptedUsername = getCookie(request.headers.cookie, 'auth_username');
                if (encryptedUsername) {
                    userId = decrypt(encryptedUsername);
                }
            }
            
            if (!userId) {
                console.log('No userId found, passing through original response');
                return response;
            }
            
            console.log(`User ID extracted: ${userId}`);
            
            // Call AuthSignal API
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
                    userAgent: request.headers["user-agent"][0].value
                })
            );
            
            console.log(`AuthSignal response state: ${apiResponse.body.state}`);
            
            if (apiResponse.body.state === 'ALLOW') {
                console.log('AuthSignal state ALLOW, continuing with normal login flow');
                
                // Create completely new response to avoid any header modification issues
                const newResponse = {
                    status: response.status,
                    statusDescription: response.statusDescription,
                    headers: {}
                };
                
                // Copy all headers from original response
                for (const headerName in response.headers) {
                    newResponse.headers[headerName] = [...response.headers[headerName]];
                }
                
                // Fix location header if needed
                if (newResponse.headers.location && newResponse.headers.location[0]) {
                    const locationHeader = newResponse.headers.location[0].value;
                    if (locationHeader.includes('.elb.amazonaws.com') || 
                        locationHeader.includes('ec2.internal') || 
                        locationHeader.includes(':3000')) {
                        newResponse.headers.location = [{
                            key: 'Location',
                            value: locationHeader.replace(/https?:\/\/[^\/]+/, 'https://d3w0aux8k6z2b9.cloudfront.net')
                        }];
                    }
                }
                
                // Add cookie to clear auth_username
                const existingCookies = newResponse.headers['set-cookie'] || [];
                newResponse.headers['set-cookie'] = [
                    ...existingCookies,
                    {
                        key: 'Set-Cookie',
                        value: `auth_username=; Path=/; Secure; HttpOnly; Max-Age=0`
                    }
                ];
                
                return newResponse;
            } 
            else if (apiResponse.body.state === 'CHALLENGE_REQUIRED') {
                console.log('AuthSignal state CHALLENGE_REQUIRED, redirecting to challenge');
                
                // Get session cookies and original location
                const sessionCookies = response.headers['set-cookie'] || [];
                const originalLocation = response.headers.location ? response.headers.location[0].value : '/';
                
                // Create challenge data
                const cookieData = {
                    userId: userId,
                    idempotencyKey: apiResponse.body.idempotencyKey,
                    originalLocation: originalLocation,
                    sessionCookies: sessionCookies
                };
                
                const encryptedCookie = encrypt(cookieData);
                
                // Create completely new challenge response
                const challengeResponse = {
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
                
                console.log('Returning challenge redirect response');
                return challengeResponse;
            }
        } catch (error) {
            console.error('Error in security check:', error);
            // Return original response on error
            return response;
        }
    }
    
    console.log('Passing through original response');
    return response;
}; 