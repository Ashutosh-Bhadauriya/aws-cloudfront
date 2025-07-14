'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const https = __importStar(require("https"));
const crypto = __importStar(require("crypto"));
const querystring = __importStar(require("querystring"));
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
                }
                catch (err) {
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
    }
    catch (error) {
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
                    const validateResponse = await httpRequest({
                        hostname: 'api.authsignal.com',
                        path: '/v1/validate',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Basic ' + Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')
                        }
                    }, JSON.stringify({ token }));
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
                    }
                    else {
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
                }
                catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9vcmlnaW4tcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRWIsNkNBQStCO0FBQy9CLCtDQUFpQztBQUNqQyx5REFBMkM7QUFFM0MsNkNBQTZDO0FBQzdDLE1BQU0sY0FBYyxHQUFHLDhDQUE4QyxDQUFDO0FBQ3RFLE1BQU0sYUFBYSxHQUFHLDBCQUEwQixDQUFDO0FBQ2pELE1BQU0sbUJBQW1CLEdBQUcsMERBQTBELENBQUM7QUFFdkYscUNBQXFDO0FBQ3JDLFNBQVMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJO0lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFeEUsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3pDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBRXRELEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3ZCLElBQUksSUFBSSxLQUFLLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3JDLENBQUMsQ0FBQyxDQUFDO1lBRUgsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO2dCQUNqQixPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENB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Qzt3Q0FDYixHQUFHLEVBQUUsWUFBWTt3Q0FDakIsS0FBSyxFQUFFLHNEQUFzRDtxQ0FDOUQsQ0FBQzs2QkFDSDs0QkFDRCxJQUFJLEVBQUUsa0NBQWtDO3lCQUN6QyxDQUFDO29CQUNKLENBQUM7Z0JBQ0gsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUM1RCxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzNDLE9BQU87d0JBQ0wsTUFBTSxFQUFFLEtBQUs7d0JBQ2IsaUJBQWlCLEVBQUUsYUFBYTt3QkFDaEMsT0FBTyxFQUFFOzRCQUNQLGNBQWMsRUFBRSxDQUFDO29DQUNmLEdBQUcsRUFBRSxjQUFjO29DQUNuQixLQUFLLEVBQUUsWUFBWTtpQ0FDcEIsQ0FBQzs0QkFDRixZQUFZLEVBQUUsQ0FBQztvQ0FDYixHQUFHLEVBQUUsWUFBWTtvQ0FDakIsS0FBSyxFQUFFLHNEQUFzRDtpQ0FDOUQsQ0FBQzt5QkFDSDt3QkFDRCxJQUFJLEVBQUUsNENBQTRDO3FCQUNuRCxDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCw4Q0FBOEM7SUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0lBQ3ZFLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgKiBhcyBxdWVyeXN0cmluZyBmcm9tICdxdWVyeXN0cmluZyc7XG5cbi8vIElNUE9SVEFOVDogUmVwbGFjZSB3aXRoIHlvdXIgc2VjdXJlIHZhbHVlc1xuY29uc3QgRU5DUllQVElPTl9LRVkgPSAnOExzNnRVamxmNENMVzl4ckRBZUtnQVJEWVRsSnlLQTB3akxTQXZGMlp6bz0nO1xuY29uc3QgRU5DUllQVElPTl9JViA9ICdMQ1hzejVRV1VqaUlLNXlqYTZDSlBBPT0nO1xuY29uc3QgQVVUSF9TSUdOQUxfQVBJX0tFWSA9ICd4T1gxaVUxajNYYVJlSVIzN1lCbUkxeU1IYmFIektKUElpQXEvNEkvZ3NaWjFsUjhlM0tkekE9PSc7XG5cbi8vIEhlbHBlciBmdW5jdGlvbiBmb3IgSFRUUFMgcmVxdWVzdHNcbmZ1bmN0aW9uIGh0dHBSZXF1ZXN0KG9wdGlvbnMsIGJvZHkpIHtcbiAgY29uc29sZS5sb2coJ01ha2luZyBIVFRQIHJlcXVlc3QgdG86Jywgb3B0aW9ucy5ob3N0bmFtZSArIG9wdGlvbnMucGF0aCk7XG4gIFxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHJlcSA9IGh0dHBzLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuICAgICAgbGV0IGRhdGEgPSAnJztcbiAgICAgIGNvbnNvbGUubG9nKGBIVFRQIHJlcXVlc3Qgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfWApO1xuXG4gICAgICByZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgZGF0YSArPSBjaHVuaztcbiAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIGRhdGEgY2h1bmsnKTtcbiAgICAgIH0pO1xuICAgICAgXG4gICAgICByZXMub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ1Jlc3BvbnNlIGNvbXBsZXRlZCcpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXNwb25zZSBwYXJzZWQgc3VjY2Vzc2Z1bGx5OicsIEpTT04uc3RyaW5naWZ5KHBhcnNlZERhdGEpLnN1YnN0cmluZygwLCAyMDApKTtcbiAgICAgICAgICByZXNvbHZlKHsgc3RhdHVzQ29kZTogcmVzLnN0YXR1c0NvZGUsIGJvZHk6IHBhcnNlZERhdGEgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSByZXNwb25zZTonLCBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignUmF3IHJlc3BvbnNlOicsIGRhdGEuc3Vic3RyaW5nKDAsIDIwMCkpO1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBwYXJzZSByZXNwb25zZTogJHtlcnIubWVzc2FnZX1gKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIHJlcS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdIVFRQIHJlcXVlc3QgZXJyb3I6JywgZXJyLm1lc3NhZ2UpO1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gICAgXG4gICAgaWYgKGJvZHkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdSZXF1ZXN0IGJvZHk6JywgYm9keS5zdWJzdHJpbmcoMCwgMjAwKSk7XG4gICAgICByZXEud3JpdGUoYm9keSk7XG4gICAgfVxuICAgIFxuICAgIHJlcS5lbmQoKTtcbiAgICBjb25zb2xlLmxvZygnUmVxdWVzdCBzZW50Jyk7XG4gIH0pO1xufVxuXG4vLyBEZWNyeXB0aW9uIGhlbHBlclxuZnVuY3Rpb24gZGVjcnlwdChlbmNyeXB0ZWREYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdBdHRlbXB0aW5nIHRvIGRlY3J5cHQgZGF0YTonLCBlbmNyeXB0ZWREYXRhLnN1YnN0cmluZygwLCAyMCkgKyAnLi4uJyk7XG4gIHRyeSB7XG4gICAgLy8gTWFrZSBzdXJlIGtleXMgYXJlIHByb3Blcmx5IGZvcm1hdHRlZCBmb3IgQnVmZmVyXG4gICAgY29uc3Qga2V5QnVmZmVyID0gQnVmZmVyLmZyb20oRU5DUllQVElPTl9LRVksICdiYXNlNjQnKTtcbiAgICBjb25zdCBpdkJ1ZmZlciA9IEJ1ZmZlci5mcm9tKEVOQ1JZUFRJT05fSVYsICdiYXNlNjQnKTtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhgS2V5IGxlbmd0aDogJHtrZXlCdWZmZXIubGVuZ3RofSwgSVYgbGVuZ3RoOiAke2l2QnVmZmVyLmxlbmd0aH1gKTtcbiAgICBcbiAgICBjb25zdCBkZWNpcGhlciA9IGNyeXB0by5jcmVhdGVEZWNpcGhlcml2KCdhZXMtMjU2LWNiYycsIGtleUJ1ZmZlciwgaXZCdWZmZXIpO1xuICAgIGxldCBkZWNyeXB0ZWQgPSBkZWNpcGhlci51cGRhdGUoZW5jcnlwdGVkRGF0YSwgJ2hleCcsICd1dGY4Jyk7XG4gICAgZGVjcnlwdGVkICs9IGRlY2lwaGVyLmZpbmFsKCd1dGY4Jyk7XG4gICAgXG4gICAgY29uc29sZS5sb2coJ0RlY3J5cHRpb24gc3VjY2Vzc2Z1bCwgcGFyc2luZyBKU09OJyk7XG4gICAgY29uc3QgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGVjcnlwdGVkKTtcbiAgICBjb25zb2xlLmxvZygnQ29va2llIGRhdGEgcGFyc2VkOicsIEpTT04uc3RyaW5naWZ5KHBhcnNlZERhdGEpLnN1YnN0cmluZygwLCAyMDApKTtcbiAgICByZXR1cm4gcGFyc2VkRGF0YTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdEZWNyeXB0aW9uIGVycm9yIGRldGFpbHM6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc3RhY2s6JywgZXJyb3Iuc3RhY2spO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vIEV4dHJhY3QgYSBzcGVjaWZpYyBjb29raWUgZnJvbSBoZWFkZXJzXG5mdW5jdGlvbiBnZXRDb29raWUoY29va2llSGVhZGVycywgbmFtZSkge1xuICBjb25zb2xlLmxvZyhgTG9va2luZyBmb3IgY29va2llOiAke25hbWV9YCk7XG4gIGlmICghY29va2llSGVhZGVycykge1xuICAgIGNvbnNvbGUubG9nKCdObyBjb29raWUgaGVhZGVycyBmb3VuZCcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc29sZS5sb2coYEZvdW5kICR7Y29va2llSGVhZGVycy5sZW5ndGh9IGNvb2tpZSBoZWFkZXIocylgKTtcbiAgZm9yIChjb25zdCBoZWFkZXIgb2YgY29va2llSGVhZGVycykge1xuICAgIGNvbnNvbGUubG9nKGBFeGFtaW5pbmcgY29va2llIGhlYWRlcjogJHtoZWFkZXIudmFsdWUuc3Vic3RyaW5nKDAsIDUwKX0uLi5gKTtcbiAgICBjb25zdCBjb29raWVzID0gaGVhZGVyLnZhbHVlLnNwbGl0KCc7Jyk7XG4gICAgZm9yIChjb25zdCBjb29raWUgb2YgY29va2llcykge1xuICAgICAgY29uc3QgcGFydHMgPSBjb29raWUudHJpbSgpLnNwbGl0KCc9Jyk7XG4gICAgICBpZiAocGFydHNbMF0gPT09IG5hbWUgJiYgcGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJz0nKTtcbiAgICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7bmFtZX0gY29va2llIHdpdGggbGVuZ3RoOiAke3ZhbHVlLmxlbmd0aH1gKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlOyBcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgY29uc29sZS5sb2coYENvb2tpZSAke25hbWV9IG5vdCBmb3VuZCBpbiBoZWFkZXJzYCk7XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgY29uc29sZS5sb2coJ0xhbWJkYSBmdW5jdGlvbiBzdGFydGVkJyk7XG4gIGNvbnNvbGUubG9nKCdFdmVudCB0eXBlOicsIHR5cGVvZiBldmVudCk7XG4gIGNvbnNvbGUubG9nKCdFdmVudCBzdHJ1Y3R1cmU6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQpLnN1YnN0cmluZygwLCAyMDApKTtcbiAgXG4gIGNvbnN0IHJlcXVlc3QgPSBldmVudC5SZWNvcmRzWzBdLmNmLnJlcXVlc3Q7XG4gIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIHJlcXVlc3Q6ICR7cmVxdWVzdC5tZXRob2R9ICR7cmVxdWVzdC51cml9JHtyZXF1ZXN0LnF1ZXJ5c3RyaW5nID8gJz8nICsgcmVxdWVzdC5xdWVyeXN0cmluZyA6ICcnfWApO1xuICBcbiAgLy8gT25seSBwcm9jZXNzIEdFVCByZXF1ZXN0cyB0byAvZGFzaGJvYXJkIHdpdGggY2hhbGxlbmdlX2lkIHBhcmFtZXRlciAoQXV0aFNpZ25hbCBNRkEgY2FsbGJhY2spXG4gIGlmIChyZXF1ZXN0Lm1ldGhvZCA9PT0gJ0dFVCcgJiYgcmVxdWVzdC51cmkgPT09ICcvZGFzaGJvYXJkJyAmJiByZXF1ZXN0LnF1ZXJ5c3RyaW5nICYmIHJlcXVlc3QucXVlcnlzdHJpbmcuaW5jbHVkZXMoJ2NoYWxsZW5nZV9pZD0nKSkge1xuICAgIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIE1GQSBjYWxsYmFjayBlbmRwb2ludCcpO1xuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gcXVlcnlzdHJpbmcucGFyc2UocmVxdWVzdC5xdWVyeXN0cmluZyk7XG4gICAgY29uc29sZS5sb2coJ1F1ZXJ5IHBhcmFtczonLCBKU09OLnN0cmluZ2lmeShxdWVyeVBhcmFtcykpO1xuICAgIFxuICAgIGNvbnN0IHRva2VuID0gcXVlcnlQYXJhbXMudG9rZW47XG4gICAgY29uc29sZS5sb2coYFRva2VuIHByZXNlbnQ6ICR7ISF0b2tlbn1gKTtcbiAgICBjb25zb2xlLmxvZyhgQ29va2llIGhlYWRlcnMgcHJlc2VudDogJHshIXJlcXVlc3QuaGVhZGVycy5jb29raWV9YCk7XG5cbiAgICAvLyBDaGVjayBmb3IgYm90aCB0b2tlbiBhbmQgb3VyIHNlY3VyZSBjb29raWVcbiAgICBpZiAodG9rZW4gJiYgcmVxdWVzdC5oZWFkZXJzLmNvb2tpZSkge1xuICAgICAgY29uc3QgYXV0aENoYWxsZW5nZUNvb2tpZSA9IGdldENvb2tpZShyZXF1ZXN0LmhlYWRlcnMuY29va2llLCAnYXV0aF9jaGFsbGVuZ2UnKTtcbiAgICAgIGNvbnNvbGUubG9nKGBBdXRoIGNoYWxsZW5nZSBjb29raWUgcHJlc2VudDogJHshIWF1dGhDaGFsbGVuZ2VDb29raWV9YCk7XG5cbiAgICAgIGlmIChhdXRoQ2hhbGxlbmdlQ29va2llKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0F0dGVtcHRpbmcgdG8gZGVjcnlwdCBjb29raWUgZGF0YScpO1xuICAgICAgICAgIC8vIERlY3J5cHQgb3VyIGNvb2tpZSB0byBnZXQgc3RvcmVkIGluZm9ybWF0aW9uXG4gICAgICAgICAgY29uc3QgY29va2llRGF0YSA9IGRlY3J5cHQoYXV0aENoYWxsZW5nZUNvb2tpZSk7XG4gICAgICAgICAgaWYgKCFjb29raWVEYXRhKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVjcnlwdCBjb29raWUgZGF0YScpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZGVjcnlwdCBjb29raWUgZGF0YScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZygnQ29va2llIGRhdGEgZmllbGRzOicsIE9iamVjdC5rZXlzKGNvb2tpZURhdGEpLmpvaW4oJywgJykpO1xuXG4gICAgICAgICAgdHlwZSBWYWxpZGF0ZVJlc3BvbnNlVHlwZSA9IHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IG51bWJlcixcbiAgICAgICAgICAgIGJvZHk6IHtcbiAgICAgICAgICAgICAgc3RhdGU6IHN0cmluZyxcbiAgICAgICAgICAgICAgaWRlbXBvdGVuY3lLZXk6IHN0cmluZyxcbiAgICAgICAgICAgICAgdXNlcklkOiBzdHJpbmcsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKCdDYWxsaW5nIEF1dGhTaWduYWwgQVBJIHRvIHZhbGlkYXRlIHRva2VuJyk7XG4gICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIGNoYWxsZW5nZSB0b2tlbiB3aXRoIEF1dGhTaWduYWwgQVBJXG4gICAgICAgICAgY29uc3QgdmFsaWRhdGVSZXNwb25zZSA9IGF3YWl0IGh0dHBSZXF1ZXN0KFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBob3N0bmFtZTogJ2FwaS5hdXRoc2lnbmFsLmNvbScsXG4gICAgICAgICAgICAgIHBhdGg6ICcvdjEvdmFsaWRhdGUnLFxuICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiAnQmFzaWMgJyArIEJ1ZmZlci5mcm9tKEFVVEhfU0lHTkFMX0FQSV9LRVkgKyAnOicpLnRvU3RyaW5nKCdiYXNlNjQnKVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyB0b2tlbiB9KVxuICAgICAgICAgICkgYXMgVmFsaWRhdGVSZXNwb25zZVR5cGU7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc29sZS5sb2coJ0F1dGhTaWduYWwgdmFsaWRhdGlvbiByZXNwb25zZSBzdGF0dXM6JywgdmFsaWRhdGVSZXNwb25zZS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnQXV0aFNpZ25hbCBzdGF0ZTonLCB2YWxpZGF0ZVJlc3BvbnNlLmJvZHkuc3RhdGUpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFZhbGlkYXRpb24gY2hlY2tzXG4gICAgICAgICAgY29uc3Qgc3RhdGVDaGVjayA9IHZhbGlkYXRlUmVzcG9uc2UuYm9keS5zdGF0ZSA9PT0gJ0NIQUxMRU5HRV9TVUNDRUVERUQnO1xuICAgICAgICAgIGNvbnN0IGlkZW1wb3RlbmN5S2V5Q2hlY2sgPSB2YWxpZGF0ZVJlc3BvbnNlLmJvZHkuaWRlbXBvdGVuY3lLZXkgPT09IGNvb2tpZURhdGEuaWRlbXBvdGVuY3lLZXk7XG4gICAgICAgICAgY29uc3QgdXNlcklkQ2hlY2sgPSB2YWxpZGF0ZVJlc3BvbnNlLmJvZHkudXNlcklkID09PSBjb29raWVEYXRhLnVzZXJJZDtcbiAgICAgICAgICBcbiAgICAgICAgICBjb25zb2xlLmxvZygnVmFsaWRhdGlvbiBjaGVja3M6Jywge1xuICAgICAgICAgICAgc3RhdGVDaGVjayxcbiAgICAgICAgICAgIGlkZW1wb3RlbmN5S2V5Q2hlY2ssXG4gICAgICAgICAgICB1c2VySWRDaGVja1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgY2hhbGxlbmdlIHN1Y2NlZWRlZCBhbmQgaWRlbXBvdGVuY3kga2V5IG1hdGNoZXNcbiAgICAgICAgICBpZiAoc3RhdGVDaGVjayAmJiBpZGVtcG90ZW5jeUtleUNoZWNrICYmIHVzZXJJZENoZWNrKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQXV0aGVudGljYXRpb24gc3VjY2Vzc2Z1bCwgY3JlYXRpbmcgcmVkaXJlY3QgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWRpcmVjdGluZyB0bzonLCBjb29raWVEYXRhLm9yaWdpbmFsTG9jYXRpb24pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBzZXNzaW9uIGNvb2tpZXNcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZXNzaW9uIGNvb2tpZXM6JywgQXJyYXkuaXNBcnJheShjb29raWVEYXRhLnNlc3Npb25Db29raWVzKSBcbiAgICAgICAgICAgICAgPyBgRm91bmQgJHtjb29raWVEYXRhLnNlc3Npb25Db29raWVzLmxlbmd0aH0gY29va2llc2BcbiAgICAgICAgICAgICAgOiAnTm8gc2Vzc2lvbiBjb29raWVzIGZvdW5kJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoYWxsZW5nZSBzdWNjZWVkZWQgLSBjcmVhdGUgcmVzcG9uc2VcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICBzdGF0dXM6ICczMDInLFxuICAgICAgICAgICAgICBzdGF0dXNEZXNjcmlwdGlvbjogJ0ZvdW5kJyxcbiAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdsb2NhdGlvbic6IFt7XG4gICAgICAgICAgICAgICAga2V5OiAnTG9jYXRpb24nLFxuICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvb2tpZURhdGEub3JpZ2luYWxMb2NhdGlvblxuICAgICAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgICAgICdzZXQtY29va2llJzogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBrZXk6ICdTZXQtQ29va2llJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGBhdXRoX2NoYWxsZW5nZT07IFNlY3VyZTsgSHR0cE9ubHk7IFBhdGg9LzsgTWF4LUFnZT0wYFxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgJ2NhY2hlLWNvbnRyb2wnOiBbe1xuICAgICAgICAgICAgICAgICAga2V5OiAnQ2FjaGUtQ29udHJvbCcsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogJ25vLWNhY2hlLCBuby1zdG9yZSwgbXVzdC1yZXZhbGlkYXRlJ1xuICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhbGwgb3JpZ2luYWwgc2Vzc2lvbiBjb29raWVzXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb29raWVEYXRhLnNlc3Npb25Db29raWVzKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQWRkaW5nICR7Y29va2llRGF0YS5zZXNzaW9uQ29va2llcy5sZW5ndGh9IHNlc3Npb24gY29va2llcyB0byByZXNwb25zZWApO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvb2tpZU9iaiBvZiBjb29raWVEYXRhLnNlc3Npb25Db29raWVzKSB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuaGVhZGVyc1snc2V0LWNvb2tpZSddLnB1c2goY29va2llT2JqKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmV0dXJuaW5nIHN1Y2Nlc3NmdWwgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0NoYWxsZW5nZSB2YWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1ZhbGlkYXRpb24gZmFpbHVyZXM6Jywge1xuICAgICAgICAgICAgICBzdGF0ZTogIXN0YXRlQ2hlY2sgPyB2YWxpZGF0ZVJlc3BvbnNlLmJvZHkuc3RhdGUgOiBudWxsLFxuICAgICAgICAgICAgICBpZGVtcG90ZW5jeUtleU1pc21hdGNoOiAhaWRlbXBvdGVuY3lLZXlDaGVjayA/IHtcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogY29va2llRGF0YS5pZGVtcG90ZW5jeUtleSxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogdmFsaWRhdGVSZXNwb25zZS5ib2R5LmlkZW1wb3RlbmN5S2V5XG4gICAgICAgICAgICAgIH0gOiBudWxsLFxuICAgICAgICAgICAgICB1c2VySWRNaXNtYXRjaDogIXVzZXJJZENoZWNrID8ge1xuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBjb29raWVEYXRhLnVzZXJJZCxcbiAgICAgICAgICAgICAgICByZWNlaXZlZDogdmFsaWRhdGVSZXNwb25zZS5ib2R5LnVzZXJJZFxuICAgICAgICAgICAgICB9IDogbnVsbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoYWxsZW5nZSBmYWlsZWQgb3IgaWRlbXBvdGVuY3kga2V5IG1pc21hdGNoXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBzdGF0dXM6ICc0MDMnLFxuICAgICAgICAgICAgICBzdGF0dXNEZXNjcmlwdGlvbjogJ0ZvcmJpZGRlbicsXG4gICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAnY29udGVudC10eXBlJzogW3tcbiAgICAgICAgICAgICAgICAgIGtleTogJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogJ3RleHQvcGxhaW4nXG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgJ3NldC1jb29raWUnOiBbe1xuICAgICAgICAgICAgICAgICAga2V5OiAnU2V0LUNvb2tpZScsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogYGF1dGhfY2hhbGxlbmdlPTsgU2VjdXJlOyBIdHRwT25seTsgUGF0aD0vOyBNYXgtQWdlPTBgXG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgYm9keTogJ0F1dGhlbnRpY2F0aW9uIGNoYWxsZW5nZSBmYWlsZWQuJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgdmFsaWRhdGluZyBjaGFsbGVuZ2U6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc3RhY2s6JywgZXJyb3Iuc3RhY2spO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGF0dXM6ICc0MDAnLFxuICAgICAgICAgICAgc3RhdHVzRGVzY3JpcHRpb246ICdCYWQgUmVxdWVzdCcsXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICdjb250ZW50LXR5cGUnOiBbe1xuICAgICAgICAgICAgICAgIGtleTogJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgICAgICAgdmFsdWU6ICd0ZXh0L3BsYWluJ1xuICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgJ3NldC1jb29raWUnOiBbe1xuICAgICAgICAgICAgICAgIGtleTogJ1NldC1Db29raWUnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBgYXV0aF9jaGFsbGVuZ2U9OyBTZWN1cmU7IEh0dHBPbmx5OyBQYXRoPS87IE1heC1BZ2U9MGBcbiAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBib2R5OiAnRXJyb3IgcHJvY2Vzc2luZyBhdXRoZW50aWNhdGlvbiBjaGFsbGVuZ2UuJ1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBEZWZhdWx0OiBjb250aW51ZSB3aXRoIHRoZSBvcmlnaW5hbCByZXF1ZXN0XG4gIGNvbnNvbGUubG9nKCdObyBzcGVjaWFsIHByb2Nlc3NpbmcsIGNvbnRpbnVpbmcgd2l0aCBvcmlnaW5hbCByZXF1ZXN0Jyk7XG4gIHJldHVybiByZXF1ZXN0O1xufTsiXX0=