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

function decrypt(encryptedData) {
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const result = JSON.parse(decrypted);
        return result;
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

exports.handler = async (event, context, callback) => {
    console.log('Origin Request: Lambda@Edge function started');
    
    const request = event.Records[0].cf.request;
    console.log(`Origin Request: ${request.method} ${request.uri}`);
    
    // Check for auth_challenge cookie (MFA callback)
    if (request.headers.cookie) {
        const authChallengeCookie = getCookie(request.headers.cookie, 'auth_challenge');
        
        if (authChallengeCookie) {
            console.log('Auth challenge cookie found, processing MFA callback');
            
            try {
                const cookieData = decrypt(authChallengeCookie);
                
                if (!cookieData) {
                    console.log('Failed to decrypt challenge cookie');
                    callback(null, request);
                    return;
                }
                
                console.log('Challenge cookie decrypted successfully');
                
                // Validate the challenge with AuthSignal
                const validateResponse = await httpRequest(
                    {
                        hostname: 'api.authsignal.com',
                        path: `/v1/users/${cookieData.userId}/actions/signIn/${cookieData.idempotencyKey}`,
                        method: 'GET',
                        headers: {
                            'Authorization': 'Basic ' + Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')
                        }
                    }
                );
                
                console.log('AuthSignal validation response:', validateResponse.statusCode);
                console.log('AuthSignal state:', validateResponse.body.state);
                
                if (validateResponse.body.state === 'CHALLENGE_SUCCEEDED') {
                    console.log('Challenge succeeded, creating success response');
                    
                    // Create completely new response for successful challenge
                    const successResponse = {
                        status: '302',
                        statusDescription: 'Found',
                        headers: {
                            'location': [{
                                key: 'Location',
                                value: cookieData.originalLocation.replace(/https?:\/\/[^\/]+/, 'https://d3w0aux8k6z2b9.cloudfront.net')
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
                    
                    // Add original session cookies if they exist
                    if (Array.isArray(cookieData.sessionCookies) && cookieData.sessionCookies.length > 0) {
                        console.log(`Adding ${cookieData.sessionCookies.length} session cookies to response`);
                        successResponse.headers['set-cookie'] = [
                            ...successResponse.headers['set-cookie'],
                            ...cookieData.sessionCookies
                        ];
                    }
                    
                    console.log('Returning successful challenge response');
                    callback(null, successResponse);
                    return;
                } else {
                    console.log('Challenge validation failed, redirecting to home');
                    
                    const failureResponse = {
                        status: '302',
                        statusDescription: 'Found',
                        headers: {
                            'location': [{
                                key: 'Location',
                                value: 'https://d3w0aux8k6z2b9.cloudfront.net/'
                            }],
                            'set-cookie': [{
                                key: 'Set-Cookie',
                                value: `auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0`
                            }],
                            'cache-control': [{
                                key: 'Cache-Control',
                                value: 'no-cache, no-store, must-revalidate'
                            }]
                        }
                    };
                    
                    callback(null, failureResponse);
                    return;
                }
            } catch (error) {
                console.error('Error processing auth challenge:', error);
                // Continue with normal request on error
            }
        }
    }
    
    console.log('No auth challenge found, forwarding request to origin');
    callback(null, request);
}; 