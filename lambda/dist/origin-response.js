"use strict";
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
exports.handler = handler;
const crypto_1 = require("./crypto");
const https = __importStar(require("https"));
const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';
function getCookie(cookies, key) {
    if (!cookies)
        return null;
    const cookie = cookies.find(c => c.value.trim().startsWith(`${key}=`));
    return cookie ? cookie.value.split('=')[1] : null;
}
function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', (e) => {
            reject(e);
        });
        req.write(body);
        req.end();
    });
}
async function handler(event) {
    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;
    if (request.method === 'POST' && request.uri === '/api/login' && response.status === '302') {
        const encryptedUsername = getCookie(request.headers.cookie, 'auth_username');
        let userId = null;
        if (encryptedUsername) {
            userId = (0, crypto_1.decrypt)(encryptedUsername);
        }
        if (!userId) {
            return response;
        }
        const wafHeaders = {};
        for (const key in request.headers) {
            if (key.startsWith('x-amzn-waf-')) {
                wafHeaders[key.replace(/-/g, '_')] = request.headers[key][0].value;
            }
        }
        const apiResponse = await httpRequest({
            hostname: 'api.authsignal.com',
            path: `/v1/users/${encodeURIComponent(userId)}/actions/signIn`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')}`
            },
        }, JSON.stringify({
            redirectUrl: `https://${request.headers.host[0].value}/api/mfa-callback`,
            ipAddress: request.clientIp,
            userAgent: request.headers['user-agent'] ? request.headers['user-agent'][0].value : '',
            custom: wafHeaders
        }));
        if (apiResponse.state === 'ALLOW') {
            if (!response.headers['set-cookie']) {
                response.headers['set-cookie'] = [];
            }
            response.headers['set-cookie'].push({
                key: 'Set-Cookie',
                value: 'auth_username=; Path=/; Secure; HttpOnly; Max-Age=0'
            });
            return response;
        }
        else if (apiResponse.state === 'CHALLENGE_REQUIRED') {
            const sessionCookies = response.headers['set-cookie'] || [];
            const originalLocation = response.headers.location ? response.headers.location[0].value : '/';
            const cookieData = {
                userId,
                idempotencyKey: apiResponse.idempotencyKey,
                originalLocation,
                sessionCookies,
            };
            const encryptedCookie = (0, crypto_1.encrypt)(JSON.stringify(cookieData));
            const modifiedResponse = {
                status: '302',
                statusDescription: 'Found',
                headers: {
                    'location': [{
                            key: 'Location',
                            value: apiResponse.url
                        }],
                    'set-cookie': [
                        {
                            key: 'Set-Cookie',
                            value: `auth_challenge=${encryptedCookie}; Secure; HttpOnly; Path=/; SameSite=Lax`
                        },
                        {
                            key: 'Set-Cookie',
                            value: 'auth_username=; Path=/; Secure; HttpOnly; Max-Age=0'
                        }
                    ],
                    'cache-control': [{
                            key: 'Cache-Control',
                            value: 'no-cache, no-store, must-revalidate'
                        }]
                }
            };
            return modifiedResponse;
        }
    }
    return response;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luLXJlc3BvbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vb3JpZ2luLXJlc3BvbnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMkNBLDBCQTRGQztBQXRJRCxxQ0FBNEM7QUFDNUMsNkNBQStCO0FBRS9CLE1BQU0sbUJBQW1CLEdBQUcsMERBQTBELENBQUM7QUFRdkYsU0FBUyxTQUFTLENBQUMsT0FBMEMsRUFBRSxHQUFXO0lBQ3hFLElBQUksQ0FBQyxPQUFPO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDMUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZFLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3BELENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxPQUE2QixFQUFFLElBQVk7SUFDOUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3pDLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNkLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3ZCLElBQUksSUFBSSxLQUFLLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7WUFDSCxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUU7Z0JBQ2pCLElBQUksQ0FBQztvQkFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM1QixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1gsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNaLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDWixDQUFDLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ1osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRU0sS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUE4QjtJQUMxRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDNUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDO0lBRTlDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsS0FBSyxZQUFZLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxLQUFLLEVBQUUsQ0FBQztRQUMzRixNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM3RSxJQUFJLE1BQU0sR0FBa0IsSUFBSSxDQUFDO1FBRWpDLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN0QixNQUFNLEdBQUcsSUFBQSxnQkFBTyxFQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBOEIsRUFBRSxDQUFDO1FBQ2pELEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2hDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUN2RSxDQUFDO1FBQ0wsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sV0FBVyxDQUNuQztZQUNFLFFBQVEsRUFBRSxvQkFBb0I7WUFDOUIsSUFBSSxFQUFFLGFBQWEsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGlCQUFpQjtZQUM5RCxNQUFNLEVBQUUsTUFBTTtZQUNkLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyxlQUFlLEVBQUUsU0FBUyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTthQUN0RjtTQUNGLEVBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNiLFdBQVcsRUFBRSxXQUFXLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssbUJBQW1CO1lBQ3hFLFNBQVMsRUFBRSxPQUFPLENBQUMsUUFBUTtZQUMzQixTQUFTLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEYsTUFBTSxFQUFFLFVBQVU7U0FDbkIsQ0FBQyxDQUNILENBQUM7UUFFRixJQUFJLFdBQVcsQ0FBQyxLQUFLLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdEMsQ0FBQztZQUNELFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNsQyxHQUFHLEVBQUUsWUFBWTtnQkFDakIsS0FBSyxFQUFFLHFEQUFxRDthQUM3RCxDQUFDLENBQUM7WUFDSCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO2FBQU0sSUFBSSxXQUFXLENBQUMsS0FBSyxLQUFLLG9CQUFvQixFQUFFLENBQUM7WUFDdEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFFOUYsTUFBTSxVQUFVLEdBQUc7Z0JBQ2pCLE1BQU07Z0JBQ04sY0FBYyxFQUFFLFdBQVcsQ0FBQyxjQUFjO2dCQUMxQyxnQkFBZ0I7Z0JBQ2hCLGNBQWM7YUFDZixDQUFDO1lBRUYsTUFBTSxlQUFlLEdBQUcsSUFBQSxnQkFBTyxFQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUU1RCxNQUFNLGdCQUFnQixHQUE2QjtnQkFDakQsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsaUJBQWlCLEVBQUUsT0FBTztnQkFDMUIsT0FBTyxFQUFFO29CQUNQLFVBQVUsRUFBRSxDQUFDOzRCQUNYLEdBQUcsRUFBRSxVQUFVOzRCQUNmLEtBQUssRUFBRSxXQUFXLENBQUMsR0FBRzt5QkFDdkIsQ0FBQztvQkFDRixZQUFZLEVBQUU7d0JBQ1o7NEJBQ0UsR0FBRyxFQUFFLFlBQVk7NEJBQ2pCLEtBQUssRUFBRSxrQkFBa0IsZUFBZSwwQ0FBMEM7eUJBQ25GO3dCQUNEOzRCQUNFLEdBQUcsRUFBRSxZQUFZOzRCQUNqQixLQUFLLEVBQUUscURBQXFEO3lCQUM3RDtxQkFDRjtvQkFDRCxlQUFlLEVBQUUsQ0FBQzs0QkFDaEIsR0FBRyxFQUFFLGVBQWU7NEJBQ3BCLEtBQUssRUFBRSxxQ0FBcUM7eUJBQzdDLENBQUM7aUJBQ0g7YUFDRixDQUFDO1lBQ0YsT0FBTyxnQkFBZ0IsQ0FBQztRQUMxQixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbG91ZEZyb250UmVzcG9uc2VFdmVudCwgQ2xvdWRGcm9udFJlc3BvbnNlUmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBkZWNyeXB0LCBlbmNyeXB0IH0gZnJvbSAnLi9jcnlwdG8nO1xuaW1wb3J0ICogYXMgaHR0cHMgZnJvbSAnaHR0cHMnO1xuXG5jb25zdCBBVVRIX1NJR05BTF9BUElfS0VZID0gJ3hPWDFpVTFqM1hhUmVJUjM3WUJtSTF5TUhiYUh6S0pQSWlBcS80SS9nc1paMWxSOGUzS2R6QT09JztcblxuaW50ZXJmYWNlIEF1dGhTaWduYWxTaWduSW5SZXNwb25zZSB7XG4gIHN0YXRlOiAnQUxMT1cnIHwgJ0NIQUxMRU5HRV9SRVFVSVJFRCc7XG4gIGlkZW1wb3RlbmN5S2V5OiBzdHJpbmc7XG4gIHVybDogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBnZXRDb29raWUoY29va2llczogeyBrZXk/OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfVtdLCBrZXk6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoIWNvb2tpZXMpIHJldHVybiBudWxsO1xuICBjb25zdCBjb29raWUgPSBjb29raWVzLmZpbmQoYyA9PiBjLnZhbHVlLnRyaW0oKS5zdGFydHNXaXRoKGAke2tleX09YCkpO1xuICByZXR1cm4gY29va2llID8gY29va2llLnZhbHVlLnNwbGl0KCc9JylbMV0gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBodHRwUmVxdWVzdChvcHRpb25zOiBodHRwcy5SZXF1ZXN0T3B0aW9ucywgYm9keTogc3RyaW5nKTogUHJvbWlzZTxBdXRoU2lnbmFsU2lnbkluUmVzcG9uc2U+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCByZXEgPSBodHRwcy5yZXF1ZXN0KG9wdGlvbnMsIChyZXMpID0+IHtcbiAgICAgIGxldCBkYXRhID0gJyc7XG4gICAgICByZXMub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgZGF0YSArPSBjaHVuaztcbiAgICAgIH0pO1xuICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGRhdGEpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXEub24oJ2Vycm9yJywgKGUpID0+IHtcbiAgICAgIHJlamVjdChlKTtcbiAgICB9KTtcblxuICAgIHJlcS53cml0ZShib2R5KTtcbiAgICByZXEuZW5kKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQ2xvdWRGcm9udFJlc3BvbnNlRXZlbnQpOiBQcm9taXNlPENsb3VkRnJvbnRSZXNwb25zZVJlc3VsdD4ge1xuICBjb25zdCByZXF1ZXN0ID0gZXZlbnQuUmVjb3Jkc1swXS5jZi5yZXF1ZXN0O1xuICBjb25zdCByZXNwb25zZSA9IGV2ZW50LlJlY29yZHNbMF0uY2YucmVzcG9uc2U7XG5cbiAgaWYgKHJlcXVlc3QubWV0aG9kID09PSAnUE9TVCcgJiYgcmVxdWVzdC51cmkgPT09ICcvYXBpL2xvZ2luJyAmJiByZXNwb25zZS5zdGF0dXMgPT09ICczMDInKSB7XG4gICAgY29uc3QgZW5jcnlwdGVkVXNlcm5hbWUgPSBnZXRDb29raWUocmVxdWVzdC5oZWFkZXJzLmNvb2tpZSwgJ2F1dGhfdXNlcm5hbWUnKTtcbiAgICBsZXQgdXNlcklkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIGlmIChlbmNyeXB0ZWRVc2VybmFtZSkge1xuICAgICAgdXNlcklkID0gZGVjcnlwdChlbmNyeXB0ZWRVc2VybmFtZSk7XG4gICAgfVxuXG4gICAgaWYgKCF1c2VySWQpIHtcbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG4gICAgXG4gICAgY29uc3Qgd2FmSGVhZGVyczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xuICAgIGZvciAoY29uc3Qga2V5IGluIHJlcXVlc3QuaGVhZGVycykge1xuICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3gtYW16bi13YWYtJykpIHtcbiAgICAgICAgICAgIHdhZkhlYWRlcnNba2V5LnJlcGxhY2UoLy0vZywgJ18nKV0gPSByZXF1ZXN0LmhlYWRlcnNba2V5XVswXS52YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGFwaVJlc3BvbnNlID0gYXdhaXQgaHR0cFJlcXVlc3QoXG4gICAgICB7XG4gICAgICAgIGhvc3RuYW1lOiAnYXBpLmF1dGhzaWduYWwuY29tJyxcbiAgICAgICAgcGF0aDogYC92MS91c2Vycy8ke2VuY29kZVVSSUNvbXBvbmVudCh1c2VySWQpfS9hY3Rpb25zL3NpZ25JbmAsXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCYXNpYyAke0J1ZmZlci5mcm9tKEFVVEhfU0lHTkFMX0FQSV9LRVkgKyAnOicpLnRvU3RyaW5nKCdiYXNlNjQnKX1gXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICByZWRpcmVjdFVybDogYGh0dHBzOi8vJHtyZXF1ZXN0LmhlYWRlcnMuaG9zdFswXS52YWx1ZX0vYXBpL21mYS1jYWxsYmFja2AsXG4gICAgICAgIGlwQWRkcmVzczogcmVxdWVzdC5jbGllbnRJcCxcbiAgICAgICAgdXNlckFnZW50OiByZXF1ZXN0LmhlYWRlcnNbJ3VzZXItYWdlbnQnXSA/IHJlcXVlc3QuaGVhZGVyc1sndXNlci1hZ2VudCddWzBdLnZhbHVlIDogJycsXG4gICAgICAgIGN1c3RvbTogd2FmSGVhZGVyc1xuICAgICAgfSlcbiAgICApO1xuXG4gICAgaWYgKGFwaVJlc3BvbnNlLnN0YXRlID09PSAnQUxMT1cnKSB7XG4gICAgICBpZiAoIXJlc3BvbnNlLmhlYWRlcnNbJ3NldC1jb29raWUnXSkge1xuICAgICAgICByZXNwb25zZS5oZWFkZXJzWydzZXQtY29va2llJ10gPSBbXTtcbiAgICAgIH1cbiAgICAgIHJlc3BvbnNlLmhlYWRlcnNbJ3NldC1jb29raWUnXS5wdXNoKHtcbiAgICAgICAga2V5OiAnU2V0LUNvb2tpZScsXG4gICAgICAgIHZhbHVlOiAnYXV0aF91c2VybmFtZT07IFBhdGg9LzsgU2VjdXJlOyBIdHRwT25seTsgTWF4LUFnZT0wJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfSBlbHNlIGlmIChhcGlSZXNwb25zZS5zdGF0ZSA9PT0gJ0NIQUxMRU5HRV9SRVFVSVJFRCcpIHtcbiAgICAgIGNvbnN0IHNlc3Npb25Db29raWVzID0gcmVzcG9uc2UuaGVhZGVyc1snc2V0LWNvb2tpZSddIHx8IFtdO1xuICAgICAgY29uc3Qgb3JpZ2luYWxMb2NhdGlvbiA9IHJlc3BvbnNlLmhlYWRlcnMubG9jYXRpb24gPyByZXNwb25zZS5oZWFkZXJzLmxvY2F0aW9uWzBdLnZhbHVlIDogJy8nO1xuXG4gICAgICBjb25zdCBjb29raWVEYXRhID0ge1xuICAgICAgICB1c2VySWQsXG4gICAgICAgIGlkZW1wb3RlbmN5S2V5OiBhcGlSZXNwb25zZS5pZGVtcG90ZW5jeUtleSxcbiAgICAgICAgb3JpZ2luYWxMb2NhdGlvbixcbiAgICAgICAgc2Vzc2lvbkNvb2tpZXMsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBlbmNyeXB0ZWRDb29raWUgPSBlbmNyeXB0KEpTT04uc3RyaW5naWZ5KGNvb2tpZURhdGEpKTtcblxuICAgICAgY29uc3QgbW9kaWZpZWRSZXNwb25zZTogQ2xvdWRGcm9udFJlc3BvbnNlUmVzdWx0ID0ge1xuICAgICAgICBzdGF0dXM6ICczMDInLFxuICAgICAgICBzdGF0dXNEZXNjcmlwdGlvbjogJ0ZvdW5kJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdsb2NhdGlvbic6IFt7XG4gICAgICAgICAgICBrZXk6ICdMb2NhdGlvbicsXG4gICAgICAgICAgICB2YWx1ZTogYXBpUmVzcG9uc2UudXJsXG4gICAgICAgICAgfV0sXG4gICAgICAgICAgJ3NldC1jb29raWUnOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGtleTogJ1NldC1Db29raWUnLFxuICAgICAgICAgICAgICB2YWx1ZTogYGF1dGhfY2hhbGxlbmdlPSR7ZW5jcnlwdGVkQ29va2llfTsgU2VjdXJlOyBIdHRwT25seTsgUGF0aD0vOyBTYW1lU2l0ZT1MYXhgXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBrZXk6ICdTZXQtQ29va2llJyxcbiAgICAgICAgICAgICAgdmFsdWU6ICdhdXRoX3VzZXJuYW1lPTsgUGF0aD0vOyBTZWN1cmU7IEh0dHBPbmx5OyBNYXgtQWdlPTAnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXSxcbiAgICAgICAgICAnY2FjaGUtY29udHJvbCc6IFt7XG4gICAgICAgICAgICBrZXk6ICdDYWNoZS1Db250cm9sJyxcbiAgICAgICAgICAgIHZhbHVlOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnXG4gICAgICAgICAgfV1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHJldHVybiBtb2RpZmllZFJlc3BvbnNlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXNwb25zZTtcbn0gIl19