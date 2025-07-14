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
exports.handler = void 0;
const crypto = __importStar(require("crypto"));
const querystring = __importStar(require("querystring"));
// IMPORTANT: Replace with your secure values
const ENCRYPTION_KEY = '8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';
// Safe username masking function
function maskUsername(username) {
    if (!username)
        return 'null';
    if (username.length <= 4)
        return '*'.repeat(username.length);
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
    }
    catch (error) {
        console.error('Encryption error:', error);
        return null;
    }
}
const handler = (event, context, callback) => {
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
                        // Add the auth_username to a custom request header so origin-response can access it
                        request.headers['x-auth-username'] = [{
                                key: 'x-auth-username',
                                value: encryptedEmail
                            }];
                        console.log('Auth username added to request headers, forwarding to origin');
                        callback(null, request);
                        return;
                    }
                }
                else {
                    console.warn('Email not found or invalid in form data');
                }
            }
            catch (error) {
                console.error('Error processing login form:', error);
            }
        }
        else {
            console.warn('No body data found in login request');
        }
    }
    // For all other requests, just pass through without modification
    console.log('Passing request through without modification');
    callback(null, request);
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld2VyLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi92aWV3ZXItcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUViLCtDQUFpQztBQUNqQyx5REFBMkM7QUFFM0MsNkNBQTZDO0FBQzdDLE1BQU0sY0FBYyxHQUFHLDhDQUE4QyxDQUFDO0FBQ3RFLE1BQU0sYUFBYSxHQUFHLDBCQUEwQixDQUFDO0FBRWpELGlDQUFpQztBQUNqQyxTQUFTLFlBQVksQ0FBQyxRQUFRO0lBQzVCLElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxNQUFNLENBQUM7SUFDN0IsSUFBSSxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUM7UUFBRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdELE9BQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM5RyxDQUFDO0FBRUQsOERBQThEO0FBQzlELFNBQVMsT0FBTyxDQUFDLElBQUk7SUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxRCxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ2pJLElBQUksU0FBUyxH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QUFDO1lBQ3ZELENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsQ0FBQztRQUN0RCxDQUFDO0lBQ0gsQ0FBQztJQUVELGlFQUFpRTtJQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7SUFDNUQsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUM7QUFoRFcsUUFBQSxPQUFPLFdBZ0RsQiIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5pbXBvcnQgKiBhcyBxdWVyeXN0cmluZyBmcm9tICdxdWVyeXN0cmluZyc7XG5cbi8vIElNUE9SVEFOVDogUmVwbGFjZSB3aXRoIHlvdXIgc2VjdXJlIHZhbHVlc1xuY29uc3QgRU5DUllQVElPTl9LRVkgPSAnOExzNnRVamxmNENMVzl4ckRBZUtnQVJEWVRsSnlLQTB3akxTQXZGMlp6bz0nO1xuY29uc3QgRU5DUllQVElPTl9JViA9ICdMQ1hzejVRV1VqaUlLNXlqYTZDSlBBPT0nO1xuXG4vLyBTYWZlIHVzZXJuYW1lIG1hc2tpbmcgZnVuY3Rpb25cbmZ1bmN0aW9uIG1hc2tVc2VybmFtZSh1c2VybmFtZSkge1xuICBpZiAoIXVzZXJuYW1lKSByZXR1cm4gJ251bGwnO1xuICBpZiAodXNlcm5hbWUubGVuZ3RoIDw9IDQpIHJldHVybiAnKicucmVwZWF0KHVzZXJuYW1lLmxlbmd0aCk7XG4gIHJldHVybiB1c2VybmFtZS5zdWJzdHJpbmcoMCwgMikgKyAnKicucmVwZWF0KHVzZXJuYW1lLmxlbmd0aCAtIDQpICsgdXNlcm5hbWUuc3Vic3RyaW5nKHVzZXJuYW1lLmxlbmd0aCAtIDIpO1xufVxuXG4vLyBTaW1wbGUgZW5jcnlwdGlvbiBmdW5jdGlvbiB0byBzZWN1cmUgdGhlIHVzZXJuYW1lIGluIGNvb2tpZVxuZnVuY3Rpb24gZW5jcnlwdCh0ZXh0KSB7XG4gIGNvbnNvbGUubG9nKGBFbmNyeXB0aW5nIHVzZXJuYW1lOiAke21hc2tVc2VybmFtZSh0ZXh0KX1gKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYoJ2Flcy0yNTYtY2JjJywgQnVmZmVyLmZyb20oRU5DUllQVElPTl9LRVksICdiYXNlNjQnKSwgQnVmZmVyLmZyb20oRU5DUllQVElPTl9JViwgJ2Jhc2U2NCcpKTtcbiAgICBsZXQgZW5jcnlwdGVkID0gY2lwaGVyLnVwZGF0ZSh0ZXh0LCAndXRmOCcsICdiYXNlNjQnKTtcbiAgICBlbmNyeXB0ZWQgKz0gY2lwaGVyLmZpbmFsKCdiYXNlNjQnKTtcbiAgICByZXR1cm4gZW5jcnlwdGVkO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0VuY3J5cHRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gKGV2ZW50LCBjb250ZXh0LCBjYWxsYmFjaykgPT4ge1xuICBjb25zdCByZXF1ZXN0ID0gZXZlbnQuUmVjb3Jkc1swXS5jZi5yZXF1ZXN0O1xuICBjb25zb2xlLmxvZyhgVmlld2VyIFJlcXVlc3Q6ICR7cmVxdWVzdC5tZXRob2R9ICR7cmVxdWVzdC51cml9YCk7XG5cbiAgLy8gT25seSBwcm9jZXNzIFBPU1QgcmVxdWVzdHMgdG8gL2FwaS9sb2dpbiAobG9naW4gZm9ybSBzdWJtaXNzaW9uKVxuICBpZiAocmVxdWVzdC5tZXRob2QgPT09ICdQT1NUJyAmJiByZXF1ZXN0LnVyaSA9PT0gJy9hcGkvbG9naW4nKSB7XG4gICAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgbG9naW4gZm9ybSBzdWJtaXNzaW9uJyk7XG4gICAgXG4gICAgaWYgKHJlcXVlc3QuYm9keSAmJiByZXF1ZXN0LmJvZHkuZGF0YSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYm9keSA9IEJ1ZmZlci5mcm9tKHJlcXVlc3QuYm9keS5kYXRhLCAnYmFzZTY0JykudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBEZWNvZGVkIGJvZHkgZnJvbSBiYXNlNjQ6ICR7Ym9keS5zdWJzdHJpbmcoMCwgNTApfSR7Ym9keS5sZW5ndGggPiA1MCA/ICcuLi4nIDogJyd9YCk7XG5cbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSBxdWVyeXN0cmluZy5wYXJzZShib2R5KTtcbiAgICAgICAgY29uc29sZS5sb2coYEZvcm0gZGF0YSBrZXlzOiAke09iamVjdC5rZXlzKGZvcm1EYXRhKS5qb2luKCcsICcpfWApO1xuXG4gICAgICAgIGNvbnN0IGVtYWlsID0gZm9ybURhdGEuZW1haWw7XG4gICAgICAgIGlmIChlbWFpbCAmJiB0eXBlb2YgZW1haWwgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYEVtYWlsIGZvdW5kIGluIGZvcm0gZGF0YTogJHttYXNrVXNlcm5hbWUoZW1haWwpfWApO1xuXG4gICAgICAgICAgY29uc3QgZW5jcnlwdGVkRW1haWwgPSBlbmNyeXB0KGVtYWlsKTtcbiAgICAgICAgICBpZiAoZW5jcnlwdGVkRW1haWwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBZGRpbmcgYXV0aF91c2VybmFtZSB0byByZXF1ZXN0IGhlYWRlcnMgZm9yIG9yaWdpbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgdGhlIGF1dGhfdXNlcm5hbWUgdG8gYSBjdXN0b20gcmVxdWVzdCBoZWFkZXIgc28gb3JpZ2luLXJlc3BvbnNlIGNhbiBhY2Nlc3MgaXRcbiAgICAgICAgICAgIHJlcXVlc3QuaGVhZGVyc1sneC1hdXRoLXVzZXJuYW1lJ10gPSBbe1xuICAgICAgICAgICAgICBrZXk6ICd4LWF1dGgtdXNlcm5hbWUnLFxuICAgICAgICAgICAgICB2YWx1ZTogZW5jcnlwdGVkRW1haWxcbiAgICAgICAgICAgIH1dO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQXV0aCB1c2VybmFtZSBhZGRlZCB0byByZXF1ZXN0IGhlYWRlcnMsIGZvcndhcmRpbmcgdG8gb3JpZ2luJyk7XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdFbWFpbCBub3QgZm91bmQgb3IgaW52YWxpZCBpbiBmb3JtIGRhdGEnKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBsb2dpbiBmb3JtOicsIGVycm9yKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKCdObyBib2R5IGRhdGEgZm91bmQgaW4gbG9naW4gcmVxdWVzdCcpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEZvciBhbGwgb3RoZXIgcmVxdWVzdHMsIGp1c3QgcGFzcyB0aHJvdWdoIHdpdGhvdXQgbW9kaWZpY2F0aW9uXG4gIGNvbnNvbGUubG9nKCdQYXNzaW5nIHJlcXVlc3QgdGhyb3VnaCB3aXRob3V0IG1vZGlmaWNhdGlvbicpO1xuICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbn07Il19