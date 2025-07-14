'use strict';
const https = require('https');
const crypto = require('crypto');
// IMPORTANT: Replace with your secure values
const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';
const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';
// Filter out read-only headers that cannot be modified
function filterReadOnlyHeaders(headers) {
    const readOnlyHeaders = [
        'connection',
        'expect',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'proxy-connection',
        'trailer',
        'transfer-encoding',
        'upgrade',
        'via'
    ];
    const filteredHeaders = {};
    for (const key in headers) {
        if (!readOnlyHeaders.includes(key.toLowerCase())) {
            filteredHeaders[key] = headers[key];
        }
    }
    return filteredHeaders;
}
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
                }
                catch (err) {
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
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        console.log('Encryption successful, length:', encrypted.length);
        return encrypted;
    }
    catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}
function decrypt(text) {
    console.log('Attempting to decrypt data, length:', text ? text.length : 0);
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let decrypted = decipher.update(text, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        console.log('Decryption successful, result:', decrypted.substring(0, 50) + (decrypted.length > 50 ? '...' : ''));
        return decrypted;
    }
    catch (error) {
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
                        ...filterReadOnlyHeaders(response.headers),
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
            // Extract username from our custom header
            let userId = null;
            if (request.headers['x-auth-username'] && request.headers['x-auth-username'][0]) {
                console.log('x-auth-username header found, attempting to extract username');
                const encryptedUsername = request.headers['x-auth-username'][0].value;
                if (encryptedUsername) {
                    console.log('Found encrypted username, attempting to decrypt');
                    userId = decrypt(encryptedUsername);
                }
            }
            else {
                console.log('No x-auth-username header in request');
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
                            wafHeaders[key.replaceAll('-', '_')] = item.value;
                        }
                    });
                }
            }
            console.log(`Headers: ${JSON.stringify(request.headers)}`);
            console.log(`WAF headers: ${JSON.stringify(wafHeaders)}`);
            // Call AuthSignal API
            console.log('Calling AuthSignal API');
            const apiResponse = await httpRequest({
                hostname: 'api.authsignal.com',
                path: `/v1/users/${userId}/actions/signIn`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')
                }
            }, JSON.stringify({
                redirectUrl: `https://d3w0aux8k6z2b9.cloudfront.net/dashboard`,
                ipAddress: request.clientIp,
                userAgent: request.headers["user-agent"][0].value,
                custom: wafHeaders
            }));
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
                                ...filterReadOnlyHeaders(response.headers),
                                'location': [{
                                        key: 'Location',
                                        value: correctedLocation
                                    }]
                            }
                        };
                    }
                }
                // The response from the origin is good, just return it after filtering headers
                const safeHeaders = filterReadOnlyHeaders(response.headers);
                response = {
                    ...response,
                    headers: safeHeaders
                };
                console.log('Final headers for ALLOW response:', JSON.stringify(response.headers));
                return response;
            }
            // If AuthSignal requires a challenge, redirect to the challenge URL
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
            }
            else {
                console.log(`Unexpected AuthSignal state: ${apiResponse.body.state}`);
            }
        }
        catch (error) {
            console.error('Error in security check:', error);
            console.error('Stack trace:', error.stack);
            // In case of error, continue with the normal login flow
            return response;
        }
    }
    else {
        console.log('Not a successful login response, passing through');
    }
    // Default: return the original response
    console.log('Returning original response');
    return response;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luLXJlc3BvbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vb3JpZ2luLXJlc3BvbnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLFlBQVksQ0FBQztBQUViLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMsNkNBQTZDO0FBQzdDLE1BQU0sY0FBYyxHQUFHLDhDQUE4QyxDQUFDO0FBQ3RFLE1BQU0sYUFBYSxHQUFHLDBCQUEwQixDQUFDO0FBQ2pELE1BQU0sbUJBQW1CLEdBQUcsMERBQTBELENBQUM7QUFFdkYsdURBQXVEO0FBQ3ZELFNBQVMscUJBQXFCLENBQUMsT0FBTztJQUNwQyxNQUFNLGVBQWUsR0FBRztRQUN0QixZQUFZO1FBQ1osUUFBUTtRQUNSLFlBQVk7UUFDWixvQkFBb0I7UUFDcEIscUJBQXFCO1FBQ3JCLGtCQUFrQjtRQUNsQixTQUFTO1FBQ1QsbUJBQW1CO1FBQ25CLFNBQVM7UUFDVCxLQUFLO0tBQ04sQ0FBQztJQUVGLE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUMzQixLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDakQsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0gsQ0FBQztJQUNELE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUFFRCxxQ0FBcUM7QUFDckMsU0FBUyxXQUFXLENBQUMsT0FBTyxFQUFFLElBQUk7SUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRTtRQUNsQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVE7UUFDMUIsSUFBSSxF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O2dDQUNFLEdBQUcsRUFBRSxZQUFZO2dDQUNqQixLQUFLLEVBQUUsa0JBQWtCLGVBQWUsMENBQTBDOzZCQUNuRjs0QkFDRDtnQ0FDRSxHQUFHLEVBQUUsWUFBWTtnQ0FDakIsS0FBSyxFQUFFLHFEQUFxRDs2QkFDN0Q7eUJBQ0Y7d0JBQ0QsZUFBZSxFQUFFLENBQUM7Z0NBQ2hCLEdBQUcsRUFBRSxlQUFlO2dDQUNwQixLQUFLLEVBQUUscUNBQXFDOzZCQUM3QyxDQUFDO3FCQUNIO2lCQUNGLENBQUM7Z0JBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxREFBcUQsQ0FBQyxDQUFDO2dCQUNuRSxPQUFPLGdCQUFnQixDQUFDO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDTixPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDeEUsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqRCxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0Msd0RBQXdEO1lBQ3hELE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7SUFDSCxDQUFDO1NBQU0sQ0FBQztRQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0RBQWtELENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsd0NBQXdDO0lBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUMzQyxPQUFPLFFBQVEsQ0FBQztBQUNsQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmNvbnN0IGh0dHBzID0gcmVxdWlyZSgnaHR0cHMnKTtcbmNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuXG4vLyBJTVBPUlRBTlQ6IFJlcGxhY2Ugd2l0aCB5b3VyIHNlY3VyZSB2YWx1ZXNcbmNvbnN0IEVOQ1JZUFRJT05fS0VZID0gJzhMczZ0VWpsZjRDTFc5eHJEQWVLZ0FSRFlUbEp5S0Ewd2pMU0F2RjJaem89JztcbmNvbnN0IEVOQ1JZUFRJT05fSVYgPSAnTENYc3o1UVdVamlJSzV5amE2Q0pQQT09JztcbmNvbnN0IEFVVEhfU0lHTkFMX0FQSV9LRVkgPSAneE9YMWlVMWozWGFSZUlSMzdZQm1JMXlNSGJhSHpLSlBJaUFxLzRJL2dzWloxbFI4ZTNLZHpBPT0nO1xuXG4vLyBGaWx0ZXIgb3V0IHJlYWQtb25seSBoZWFkZXJzIHRoYXQgY2Fubm90IGJlIG1vZGlmaWVkXG5mdW5jdGlvbiBmaWx0ZXJSZWFkT25seUhlYWRlcnMoaGVhZGVycykge1xuICBjb25zdCByZWFkT25seUhlYWRlcnMgPSBbXG4gICAgJ2Nvbm5lY3Rpb24nLFxuICAgICdleHBlY3QnLFxuICAgICdrZWVwLWFsaXZlJyxcbiAgICAncHJveHktYXV0aGVudGljYXRlJyxcbiAgICAncHJveHktYXV0aG9yaXphdGlvbicsXG4gICAgJ3Byb3h5LWNvbm5lY3Rpb24nLFxuICAgICd0cmFpbGVyJyxcbiAgICAndHJhbnNmZXItZW5jb2RpbmcnLFxuICAgICd1cGdyYWRlJyxcbiAgICAndmlhJ1xuICBdO1xuXG4gIGNvbnN0IGZpbHRlcmVkSGVhZGVycyA9IHt9O1xuICBmb3IgKGNvbnN0IGtleSBpbiBoZWFkZXJzKSB7XG4gICAgaWYgKCFyZWFkT25seUhlYWRlcnMuaW5jbHVkZXMoa2V5LnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICBmaWx0ZXJlZEhlYWRlcnNba2V5XSA9IGhlYWRlcnNba2V5XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZpbHRlcmVkSGVhZGVycztcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIGZvciBIVFRQUyByZXF1ZXN0c1xuZnVuY3Rpb24gaHR0cFJlcXVlc3Qob3B0aW9ucywgYm9keSkge1xuICBjb25zb2xlLmxvZygnTWFraW5nIEhUVFAgcmVxdWVzdDonLCB7IFxuICAgIGhvc3RuYW1lOiBvcHRpb25zLmhvc3RuYW1lLFxuICAgIHBhdGg6IG9wdGlvbnMucGF0aCxcbiAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kXG4gIH0pO1xuICBcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCByZXEgPSBodHRwcy5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcbiAgICAgIGxldCBkYXRhID0gJyc7XG4gICAgICBcbiAgICAgIHJlcy5vbignZGF0YScsIChjaHVuaykgPT4gZGF0YSArPSBjaHVuayk7XG4gICAgICByZXMub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgSFRUUCBSZXNwb25zZSBzdGF0dXMgY29kZTogJHtyZXMuc3RhdHVzQ29kZX1gKTtcbiAgICAgICAgICBjb25zdCBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygnUmVzcG9uc2UgYm9keTonLCBKU09OLnN0cmluZ2lmeShwYXJzZWREYXRhKS5zdWJzdHJpbmcoMCwgMjAwKSArIChKU09OLnN0cmluZ2lmeShwYXJzZWREYXRhKS5sZW5ndGggPiAyMDAgPyAnLi4uJyA6ICcnKSk7XG4gICAgICAgICAgcmVzb2x2ZSh7IHN0YXR1c0NvZGU6IHJlcy5zdGF0dXNDb2RlLCBib2R5OiBwYXJzZWREYXRhIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgcmVzcG9uc2U6JywgZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdSYXcgcmVzcG9uc2UgZGF0YTonLCBkYXRhLnN1YnN0cmluZygwLCAyMDApICsgKGRhdGEubGVuZ3RoID4gMjAwID8gJy4uLicgOiAnJykpO1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYEZhaWxlZCB0byBwYXJzZSByZXNwb25zZTogJHtlcnIubWVzc2FnZX1gKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIFxuICAgIHJlcS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdIVFRQIHJlcXVlc3QgZXJyb3I6JywgZXJyLm1lc3NhZ2UpO1xuICAgICAgcmVqZWN0KGVycik7XG4gICAgfSk7XG4gICAgXG4gICAgaWYgKGJvZHkpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdSZXF1ZXN0IGJvZHk6JywgYm9keSk7XG4gICAgICByZXEud3JpdGUoYm9keSk7XG4gICAgfVxuICAgIHJlcS5lbmQoKTtcbiAgfSk7XG59XG5cbi8vIEVuY3J5cHRpb24gaGVscGVyc1xuZnVuY3Rpb24gZW5jcnlwdChkYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdFbmNyeXB0aW5nIGRhdGE6JywgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnID8gSlNPTi5zdHJpbmdpZnkoZGF0YSkuc3Vic3RyaW5nKDAsIDUwKSArICcuLi4nIDogZGF0YSk7XG4gIHRyeSB7XG4gICAgY29uc3QgY2lwaGVyID0gY3J5cHRvLmNyZWF0ZUNpcGhlcml2KCdhZXMtMjU2LWNiYycsIEJ1ZmZlci5mcm9tKEVOQ1JZUFRJT05fS0VZLCdiYXNlNjQnKSwgQnVmZmVyLmZyb20oRU5DUllQVElPTl9JViwnYmFzZTY0JykpO1xuICAgIGxldCBlbmNyeXB0ZWQgPSBjaXBoZXIudXBkYXRlKEpTT04uc3RyaW5naWZ5KGRhdGEpLCAndXRmOCcsICdoZXgnKTtcbiAgICBlbmNyeXB0ZWQgKz0gY2lwaGVyLmZpbmFsKCdoZXgnKTtcbiAgICBjb25zb2xlLmxvZygnRW5jcnlwdGlvbiBzdWNjZXNzZnVsLCBsZW5ndGg6JywgZW5jcnlwdGVkLmxlbmd0aCk7XG4gICAgcmV0dXJuIGVuY3J5cHRlZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFbmNyeXB0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZWNyeXB0KHRleHQpIHtcbiAgY29uc29sZS5sb2coJ0F0dGVtcHRpbmcgdG8gZGVjcnlwdCBkYXRhLCBsZW5ndGg6JywgdGV4dCA/IHRleHQubGVuZ3RoIDogMCk7XG4gIHRyeSB7XG4gICAgY29uc3QgZGVjaXBoZXIgPSBjcnlwdG8uY3JlYXRlRGVjaXBoZXJpdignYWVzLTI1Ni1jYmMnLCBCdWZmZXIuZnJvbShFTkNSWVBUSU9OX0tFWSwnYmFzZTY0JyksIEJ1ZmZlci5mcm9tKEVOQ1JZUFRJT05fSVYsJ2Jhc2U2NCcpKTtcbiAgICBsZXQgZGVjcnlwdGVkID0gZGVjaXBoZXIudXBkYXRlKHRleHQsICdiYXNlNjQnLCAndXRmOCcpO1xuICAgIGRlY3J5cHRlZCArPSBkZWNpcGhlci5maW5hbCgndXRmOCcpO1xuICAgIGNvbnNvbGUubG9nKCdEZWNyeXB0aW9uIHN1Y2Nlc3NmdWwsIHJlc3VsdDonLCBkZWNyeXB0ZWQuc3Vic3RyaW5nKDAsIDUwKSArIChkZWNyeXB0ZWQubGVuZ3RoID4gNTAgPyAnLi4uJyA6ICcnKSk7XG4gICAgcmV0dXJuIGRlY3J5cHRlZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdEZWNyeXB0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyBFeHRyYWN0IGEgc3BlY2lmaWMgY29va2llIGZyb20gaGVhZGVyc1xuZnVuY3Rpb24gZ2V0Q29va2llKGNvb2tpZUhlYWRlcnMsIG5hbWUpIHtcbiAgY29uc29sZS5sb2coYExvb2tpbmcgZm9yIGNvb2tpZTogJHtuYW1lfSBpbiBoZWFkZXJzYCk7XG4gIGlmICghY29va2llSGVhZGVycykge1xuICAgIGNvbnNvbGUubG9nKCdObyBjb29raWUgaGVhZGVycyBmb3VuZCcpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICBmb3IgKGNvbnN0IGhlYWRlciBvZiBjb29raWVIZWFkZXJzKSB7XG4gICAgY29uc29sZS5sb2coYEV4YW1pbmluZyBjb29raWUgaGVhZGVyOiAke2hlYWRlci52YWx1ZX1gKTtcbiAgICBjb25zdCBjb29raWVzID0gaGVhZGVyLnZhbHVlLnNwbGl0KCc7Jyk7XG4gICAgZm9yIChjb25zdCBjb29raWUgb2YgY29va2llcykge1xuICAgICAgY29uc3QgcGFydHMgPSBjb29raWUudHJpbSgpLnNwbGl0KCc9Jyk7XG4gICAgICBpZiAocGFydHNbMF0gPT09IG5hbWUgJiYgcGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJz0nKTtcbiAgICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7bmFtZX0gY29va2llIHdpdGggdmFsdWUgbGVuZ3RoOiAke3ZhbHVlLmxlbmd0aH1gKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlOyAvLyBIYW5kbGUgdmFsdWVzIGNvbnRhaW5pbmcgPVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgY29uc29sZS5sb2coYENvb2tpZSAke25hbWV9IG5vdCBmb3VuZGApO1xuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIGNvbnNvbGUubG9nKCdMYW1iZGFARWRnZSBmdW5jdGlvbiBzdGFydGVkJyk7XG4gIGNvbnNvbGUubG9nKCdFdmVudCB0eXBlOicsIGV2ZW50LlJlY29yZHNbMF0uY2YuY29uZmlnLmV2ZW50VHlwZSk7XG4gIFxuICBcbiAgY29uc3QgeyByZXF1ZXN0IH0gPSBldmVudC5SZWNvcmRzWzBdLmNmO1xuICBsZXQgcmVzcG9uc2UgPSBldmVudC5SZWNvcmRzWzBdLmNmLnJlc3BvbnNlO1xuICBjb25zb2xlLmxvZyhgUmVxdWVzdCBtZXRob2Q6ICR7cmVxdWVzdC5tZXRob2R9LCBVUkk6ICR7cmVxdWVzdC51cml9LCBSZXNwb25zZSBzdGF0dXM6ICR7cmVzcG9uc2UgPyByZXNwb25zZS5zdGF0dXMgOiAnTi9BJ31gKTtcbiAgXG4gIC8vIE9ubHkgcHJvY2VzcyBzdWNjZXNzZnVsIGxvZ2luIHJlc3BvbnNlcyAocmVkaXJlY3RzIHdpdGggMzAyLzMwMyBzdGF0dXMpXG4gIGlmIChyZXF1ZXN0Lm1ldGhvZCA9PT0gJ1BPU1QnICYmIHJlcXVlc3QudXJpID09PSAnL2FwaS9sb2dpbicgJiYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gJzMwMicgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSAnMzAzJykpIHtcbiAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBzdWNjZXNzZnVsIGxvZ2luIHJlZGlyZWN0IHJlc3BvbnNlJyk7XG4gICAgXG4gICAgLy8gRml4IGludGVybmFsIHJlZGlyZWN0IFVSTHMgaW4gTG9jYXRpb24gaGVhZGVyIGJ5IGNyZWF0aW5nIG5ldyByZXNwb25zZVxuICAgIGlmIChyZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uICYmIHJlc3BvbnNlLmhlYWRlcnMubG9jYXRpb25bMF0pIHtcbiAgICAgIGNvbnN0IGxvY2F0aW9uSGVhZGVyID0gcmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvblswXS52YWx1ZTtcbiAgICAgIGNvbnNvbGUubG9nKGBPcmlnaW5hbCBsb2NhdGlvbiBoZWFkZXI6ICR7bG9jYXRpb25IZWFkZXJ9YCk7XG4gICAgICBcbiAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gaW50ZXJuYWwgQVdTIGhvc3RuYW1lIChFQ1MgdGFza3Mgb3IgQUxCKVxuICAgICAgaWYgKGxvY2F0aW9uSGVhZGVyLmluY2x1ZGVzKCdlYzIuaW50ZXJuYWwnKSB8fCBcbiAgICAgICAgICBsb2NhdGlvbkhlYWRlci5pbmNsdWRlcygnOjMwMDAnKSB8fCBcbiAgICAgICAgICBsb2NhdGlvbkhlYWRlci5pbmNsdWRlcygnLmVsYi5hbWF6b25hd3MuY29tJykpIHtcbiAgICAgICAgY29uc3QgcHVibGljSG9zdCA9ICdkM3cwYXV4OGs2ejJiOS5jbG91ZGZyb250Lm5ldCc7XG4gICAgICAgIGNvbnN0IHByb3RvY29sID0gJ2h0dHBzJztcbiAgICAgICAgXG4gICAgICAgIC8vIEV4dHJhY3QganVzdCB0aGUgcGF0aCBmcm9tIHRoZSBpbnRlcm5hbCBVUkxcbiAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChsb2NhdGlvbkhlYWRlcik7XG4gICAgICAgIGNvbnN0IHBhdGggPSB1cmwucGF0aG5hbWUgKyB1cmwuc2VhcmNoICsgdXJsLmhhc2g7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGhlIGNvcnJlY3RlZCBwdWJsaWMgVVJMXG4gICAgICAgIGNvbnN0IGNvcnJlY3RlZExvY2F0aW9uID0gYCR7cHJvdG9jb2x9Oi8vJHtwdWJsaWNIb3N0fSR7cGF0aH1gO1xuICAgICAgICBjb25zb2xlLmxvZyhgQ29ycmVjdGluZyBsb2NhdGlvbiBoZWFkZXIgdG86ICR7Y29ycmVjdGVkTG9jYXRpb259YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgcmVzcG9uc2Ugb2JqZWN0IHRvIGF2b2lkIHJlYWQtb25seSBoZWFkZXIgaXNzdWVzXG4gICAgICAgIGNvbnN0IGNvcnJlY3RlZFJlc3BvbnNlID0ge1xuICAgICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c0Rlc2NyaXB0aW9uOiByZXNwb25zZS5zdGF0dXNEZXNjcmlwdGlvbixcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAuLi5maWx0ZXJSZWFkT25seUhlYWRlcnMocmVzcG9uc2UuaGVhZGVycyksXG4gICAgICAgICAgICAnbG9jYXRpb24nOiBbe1xuICAgICAgICAgICAgICBrZXk6ICdMb2NhdGlvbicsXG4gICAgICAgICAgICAgIHZhbHVlOiBjb3JyZWN0ZWRMb2NhdGlvblxuICAgICAgICAgICAgfV1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlc3BvbnNlID0gY29ycmVjdGVkUmVzcG9uc2U7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHRyeSB7XG4gICAgICAvLyBFeHRyYWN0IHVzZXJuYW1lIGZyb20gb3VyIGN1c3RvbSBoZWFkZXJcbiAgICAgIGxldCB1c2VySWQgPSBudWxsO1xuICAgICAgaWYgKHJlcXVlc3QuaGVhZGVyc1sneC1hdXRoLXVzZXJuYW1lJ10gJiYgcmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdXNlcm5hbWUnXVswXSkge1xuICAgICAgICBjb25zb2xlLmxvZygneC1hdXRoLXVzZXJuYW1lIGhlYWRlciBmb3VuZCwgYXR0ZW1wdGluZyB0byBleHRyYWN0IHVzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IGVuY3J5cHRlZFVzZXJuYW1lID0gcmVxdWVzdC5oZWFkZXJzWyd4LWF1dGgtdXNlcm5hbWUnXVswXS52YWx1ZTtcbiAgICAgICAgaWYgKGVuY3J5cHRlZFVzZXJuYW1lKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJ0ZvdW5kIGVuY3J5cHRlZCB1c2VybmFtZSwgYXR0ZW1wdGluZyB0byBkZWNyeXB0Jyk7XG4gICAgICAgICAgdXNlcklkID0gZGVjcnlwdChlbmNyeXB0ZWRVc2VybmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdObyB4LWF1dGgtdXNlcm5hbWUgaGVhZGVyIGluIHJlcXVlc3QnKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gSWYgd2UgY291bGRuJ3QgZXh0cmFjdCB0aGUgdXNlcklkLCBza2lwIHRoZSBhZGRpdGlvbmFsIHNlY3VyaXR5IGNoZWNrXG4gICAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgICBjb25zb2xlLmxvZygnTm8gdXNlcklkIGZvdW5kLCBza2lwcGluZyBzZWN1cml0eSBjaGVjaycpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKGBVc2VyIElEIGV4dHJhY3RlZDogJHt1c2VySWR9YCk7XG4gICAgICBcbiAgICAgIGNvbnN0IHdhZkhlYWRlcnMgPSB7fTtcbiAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBhbGwgcHJvcGVydGllcyBpbiB0aGUgb2JqZWN0XG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiByZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGtleSBzdGFydHMgd2l0aCBcIngtYW16bi13YWYtXCJcbiAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCd4LWFtem4td2FmLScpICYmIEFycmF5LmlzQXJyYXkocmVxdWVzdC5oZWFkZXJzW2tleV0pKSB7XG4gICAgICAgICAgLy8gRXh0cmFjdCB0aGUgdmFsdWUgZnJvbSB0aGUgYXJyYXkgb2Ygb2JqZWN0c1xuICAgICAgICAgIHJlcXVlc3QuaGVhZGVyc1trZXldLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS5rZXkgPT09IGtleSAmJiBpdGVtLnZhbHVlKSB7XG4gICAgICAgICAgICAgIHdhZkhlYWRlcnNba2V5LnJlcGxhY2VBbGwoJy0nLCdfJyldID0gaXRlbS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coYEhlYWRlcnM6ICR7SlNPTi5zdHJpbmdpZnkocmVxdWVzdC5oZWFkZXJzKX1gKVxuICAgICAgY29uc29sZS5sb2coYFdBRiBoZWFkZXJzOiAke0pTT04uc3RyaW5naWZ5KHdhZkhlYWRlcnMpfWApO1xuXG4gICAgICAvLyBDYWxsIEF1dGhTaWduYWwgQVBJXG4gICAgICBjb25zb2xlLmxvZygnQ2FsbGluZyBBdXRoU2lnbmFsIEFQSScpO1xuICAgICAgY29uc3QgYXBpUmVzcG9uc2UgPSBhd2FpdCBodHRwUmVxdWVzdChcbiAgICAgICAge1xuICAgICAgICAgIGhvc3RuYW1lOiAnYXBpLmF1dGhzaWduYWwuY29tJyxcbiAgICAgICAgICBwYXRoOiBgL3YxL3VzZXJzLyR7dXNlcklkfS9hY3Rpb25zL3NpZ25JbmAsXG4gICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogJ0Jhc2ljICcgKyBCdWZmZXIuZnJvbShBVVRIX1NJR05BTF9BUElfS0VZICsgJzonKS50b1N0cmluZygnYmFzZTY0JylcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICByZWRpcmVjdFVybDogYGh0dHBzOi8vZDN3MGF1eDhrNnoyYjkuY2xvdWRmcm9udC5uZXQvZGFzaGJvYXJkYCxcbiAgICAgICAgICBpcEFkZHJlc3M6IHJlcXVlc3QuY2xpZW50SXAsXG4gICAgICAgICAgdXNlckFnZW50OiByZXF1ZXN0LmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdWzBdLnZhbHVlLFxuICAgICAgICAgIGN1c3RvbTogd2FmSGVhZGVyc1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coYEF1dGhTaWduYWwgcmVzcG9uc2Ugc3RhdGU6ICR7YXBpUmVzcG9uc2UuYm9keS5zdGF0ZX1gKTtcbiAgICAgIFxuICAgICAgLy8gSWYgbm8gYWRkaXRpb25hbCBzZWN1cml0eSBuZWVkZWQsIGNvbnRpbnVlIHdpdGggbm9ybWFsIGxvZ2luXG4gICAgICBpZiAoYXBpUmVzcG9uc2UuYm9keS5zdGF0ZSA9PT0gJ0FMTE9XJykge1xuICAgICAgICBjb25zb2xlLmxvZygnQXV0aFNpZ25hbCBzdGF0ZSBBTExPVywgY29udGludWluZyB3aXRoIG5vcm1hbCBsb2dpbiBmbG93Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGT1JDRSBMb2NhdGlvbiBoZWFkZXIgcmV3cml0ZSBpbiBjYXNlIGl0IHdhc24ndCBjYXVnaHQgZWFybGllclxuICAgICAgICBpZiAocmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvbiAmJiByZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uWzBdKSB7XG4gICAgICAgICAgY29uc3QgbG9jYXRpb25IZWFkZXIgPSByZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uWzBdLnZhbHVlO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBEb3VibGUtY2hlY2tpbmcgbG9jYXRpb24gaGVhZGVyIGluIEFMTE9XOiAke2xvY2F0aW9uSGVhZGVyfWApO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChsb2NhdGlvbkhlYWRlci5pbmNsdWRlcygnLmVsYi5hbWF6b25hd3MuY29tJykgfHwgXG4gICAgICAgICAgICAgIGxvY2F0aW9uSGVhZGVyLmluY2x1ZGVzKCdlYzIuaW50ZXJuYWwnKSB8fCBcbiAgICAgICAgICAgICAgbG9jYXRpb25IZWFkZXIuaW5jbHVkZXMoJzozMDAwJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHB1YmxpY0hvc3QgPSAnZDN3MGF1eDhrNnoyYjkuY2xvdWRmcm9udC5uZXQnO1xuICAgICAgICAgICAgY29uc3QgcHJvdG9jb2wgPSAnaHR0cHMnOyAvLyBGb3JjZSBIVFRQUyBmb3IgQ2xvdWRGcm9udFxuICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChsb2NhdGlvbkhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gdXJsLnBhdGhuYW1lICsgdXJsLnNlYXJjaCArIHVybC5oYXNoO1xuICAgICAgICAgICAgY29uc3QgY29ycmVjdGVkTG9jYXRpb24gPSBgJHtwcm90b2NvbH06Ly8ke3B1YmxpY0hvc3R9JHtwYXRofWA7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgRk9SQ0UgY29ycmVjdGluZyBsb2NhdGlvbiBoZWFkZXIgdG86ICR7Y29ycmVjdGVkTG9jYXRpb259YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENyZWF0ZSBuZXcgcmVzcG9uc2UgdG8gYXZvaWQgcmVhZC1vbmx5IGhlYWRlciBpc3N1ZXNcbiAgICAgICAgICAgIHJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgICAgICAgc3RhdHVzRGVzY3JpcHRpb246IHJlc3BvbnNlLnN0YXR1c0Rlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgLi4uZmlsdGVyUmVhZE9ubHlIZWFkZXJzKHJlc3BvbnNlLmhlYWRlcnMpLFxuICAgICAgICAgICAgICAgICdsb2NhdGlvbic6IFt7XG4gICAgICAgICAgICAgICAgICBrZXk6ICdMb2NhdGlvbicsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogY29ycmVjdGVkTG9jYXRpb25cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGhlIHJlc3BvbnNlIGZyb20gdGhlIG9yaWdpbiBpcyBnb29kLCBqdXN0IHJldHVybiBpdCBhZnRlciBmaWx0ZXJpbmcgaGVhZGVyc1xuICAgICAgICBjb25zdCBzYWZlSGVhZGVycyA9IGZpbHRlclJlYWRPbmx5SGVhZGVycyhyZXNwb25zZS5oZWFkZXJzKTtcbiAgICAgICAgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAuLi5yZXNwb25zZSxcbiAgICAgICAgICAgIGhlYWRlcnM6IHNhZmVIZWFkZXJzXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZygnRmluYWwgaGVhZGVycyBmb3IgQUxMT1cgcmVzcG9uc2U6JywgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuaGVhZGVycykpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIElmIEF1dGhTaWduYWwgcmVxdWlyZXMgYSBjaGFsbGVuZ2UsIHJlZGlyZWN0IHRvIHRoZSBjaGFsbGVuZ2UgVVJMXG4gICAgICBlbHNlIGlmIChhcGlSZXNwb25zZS5ib2R5LnN0YXRlID09PSAnQ0hBTExFTkdFX1JFUVVJUkVEJykge1xuICAgICAgICBjb25zb2xlLmxvZygnQXV0aFNpZ25hbCBzdGF0ZSBDSEFMTEVOR0VfUkVRVUlSRUQsIHJlZGlyZWN0aW5nIHRvIGNoYWxsZW5nZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IG9yaWdpbmFsIHNlc3Npb24gY29va2llcyBhbmQgbG9jYXRpb24gZnJvbSByZXNwb25zZVxuICAgICAgICBjb25zdCBzZXNzaW9uQ29va2llcyA9IHJlc3BvbnNlLmhlYWRlcnNbJ3NldC1jb29raWUnXSB8fCBbXTtcbiAgICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7c2Vzc2lvbkNvb2tpZXMubGVuZ3RofSBzZXNzaW9uIGNvb2tpZXNgKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IG9yaWdpbmFsTG9jYXRpb24gPSByZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uID8gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuaGVhZGVycy5sb2NhdGlvblswXS52YWx1ZSA6ICcvJztcbiAgICAgICAgY29uc29sZS5sb2coYE9yaWdpbmFsIGxvY2F0aW9uOiAke29yaWdpbmFsTG9jYXRpb259YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYW5kIGVuY3J5cHQgYSBjb29raWUgd2l0aCBkYXRhIHdlIG5lZWQgdG8gcHJlc2VydmVcbiAgICAgICAgY29uc3QgY29va2llRGF0YSA9IHtcbiAgICAgICAgICB1c2VySWQ6IHVzZXJJZCxcbiAgICAgICAgICBpZGVtcG90ZW5jeUtleTogYXBpUmVzcG9uc2UuYm9keS5pZGVtcG90ZW5jeUtleSxcbiAgICAgICAgICBvcmlnaW5hbExvY2F0aW9uOiBvcmlnaW5hbExvY2F0aW9uLFxuICAgICAgICAgIHNlc3Npb25Db29raWVzOiBzZXNzaW9uQ29va2llc1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coJ0NyZWF0aW5nIGF1dGhfY2hhbGxlbmdlIGNvb2tpZSB3aXRoIGRhdGEnKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1JlZGlyZWN0IFVSTCBmcm9tIEF1dGhTaWduYWw6JywgYXBpUmVzcG9uc2UuYm9keS51cmwpO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5jcnlwdCBjb29raWUgZGF0YVxuICAgICAgICBjb25zdCBlbmNyeXB0ZWRDb29raWUgPSBlbmNyeXB0KGNvb2tpZURhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVkaXJlY3QgdG8gdGhlIGNoYWxsZW5nZSBVUkwgd2l0aCBvdXIgc2VjdXJlIGNvb2tpZVxuICAgICAgICBjb25zdCBtb2RpZmllZFJlc3BvbnNlID0ge1xuICAgICAgICAgIHN0YXR1czogJzMwMicsXG4gICAgICAgICAgc3RhdHVzRGVzY3JpcHRpb246ICdGb3VuZCcsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ2xvY2F0aW9uJzogW3tcbiAgICAgICAgICAgICAga2V5OiAnTG9jYXRpb24nLFxuICAgICAgICAgICAgICB2YWx1ZTogYXBpUmVzcG9uc2UuYm9keS51cmxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICAgICAgJ3NldC1jb29raWUnOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdTZXQtQ29va2llJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogYGF1dGhfY2hhbGxlbmdlPSR7ZW5jcnlwdGVkQ29va2llfTsgU2VjdXJlOyBIdHRwT25seTsgUGF0aD0vOyBTYW1lU2l0ZT1MYXhgXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBrZXk6ICdTZXQtQ29va2llJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogYGF1dGhfdXNlcm5hbWU9OyBQYXRoPS87IFNlY3VyZTsgSHR0cE9ubHk7IE1heC1BZ2U9MGBcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICdjYWNoZS1jb250cm9sJzogW3tcbiAgICAgICAgICAgICAga2V5OiAnQ2FjaGUtQ29udHJvbCcsXG4gICAgICAgICAgICAgIHZhbHVlOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnXG4gICAgICAgICAgICB9XVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKCdSZXR1cm5pbmcgbW9kaWZpZWQgcmVzcG9uc2Ugd2l0aCBjaGFsbGVuZ2UgcmVkaXJlY3QnKTtcbiAgICAgICAgcmV0dXJuIG1vZGlmaWVkUmVzcG9uc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhgVW5leHBlY3RlZCBBdXRoU2lnbmFsIHN0YXRlOiAke2FwaVJlc3BvbnNlLmJvZHkuc3RhdGV9YCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHNlY3VyaXR5IGNoZWNrOicsIGVycm9yKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1N0YWNrIHRyYWNlOicsIGVycm9yLnN0YWNrKTtcbiAgICAgIC8vIEluIGNhc2Ugb2YgZXJyb3IsIGNvbnRpbnVlIHdpdGggdGhlIG5vcm1hbCBsb2dpbiBmbG93XG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKCdOb3QgYSBzdWNjZXNzZnVsIGxvZ2luIHJlc3BvbnNlLCBwYXNzaW5nIHRocm91Z2gnKTtcbiAgfVxuICBcbiAgLy8gRGVmYXVsdDogcmV0dXJuIHRoZSBvcmlnaW5hbCByZXNwb25zZVxuICBjb25zb2xlLmxvZygnUmV0dXJuaW5nIG9yaWdpbmFsIHJlc3BvbnNlJyk7XG4gIHJldHVybiByZXNwb25zZTtcbn07Il19