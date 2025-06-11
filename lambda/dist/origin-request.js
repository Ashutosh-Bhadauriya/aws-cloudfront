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
const querystring_1 = require("querystring");
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
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}
async function handler(event) {
    const request = event.Records[0].cf.request;
    if (request.method === 'GET' && request.uri === '/api/mfa-callback') {
        const queryParams = (0, querystring_1.parse)(request.querystring);
        const token = queryParams.token;
        if (token && request.headers.cookie) {
            const authChallengeCookie = getCookie(request.headers.cookie, 'auth_challenge');
            if (authChallengeCookie) {
                const cookieData = JSON.parse((0, crypto_1.decrypt)(authChallengeCookie) || 'null');
                if (cookieData) {
                    const validateResponse = await httpRequest({
                        hostname: 'api.authsignal.com',
                        path: '/v1/validate',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Basic ${Buffer.from(AUTH_SIGNAL_API_KEY + ':').toString('base64')}`
                        },
                    }, JSON.stringify({ token }));
                    const { state, idempotencyKey, userId } = validateResponse;
                    if (state === 'CHALLENGE_SUCCEEDED' &&
                        idempotencyKey === cookieData.idempotencyKey &&
                        userId === cookieData.userId) {
                        const headers = {
                            'location': [{ key: 'Location', value: cookieData.originalLocation }],
                            'set-cookie': [
                                { key: 'Set-Cookie', value: 'auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0' }
                            ],
                            'cache-control': [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }]
                        };
                        if (Array.isArray(cookieData.sessionCookies)) {
                            cookieData.sessionCookies.forEach(cookieObj => {
                                if (cookieObj.key) {
                                    headers['set-cookie'].push({ key: 'Set-Cookie', value: cookieObj.value });
                                }
                            });
                        }
                        const response = {
                            status: '302',
                            statusDescription: 'Found',
                            headers: headers,
                        };
                        return response;
                    }
                    else {
                        const response = {
                            status: '403',
                            statusDescription: 'Forbidden',
                            headers: {
                                'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
                                'set-cookie': [{ key: 'Set-Cookie', value: 'auth_challenge=; Secure; HttpOnly; Path=/; Max-Age=0' }]
                            },
                            body: 'Authentication challenge failed.'
                        };
                        return response;
                    }
                }
            }
        }
    }
    return request;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JpZ2luLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9vcmlnaW4tcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZDQSwwQkEyRUM7QUF2SEQscUNBQW1DO0FBQ25DLDZDQUErQjtBQUMvQiw2Q0FBb0M7QUFFcEMsTUFBTSxtQkFBbUIsR0FBRywwREFBMEQsQ0FBQztBQWV2RixTQUFTLFNBQVMsQ0FBQyxPQUEwQyxFQUFFLEdBQVc7SUFDdEUsSUFBSSxDQUFDLE9BQU87UUFBRSxPQUFPLElBQUksQ0FBQztJQUMxQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdkUsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEQsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQTZCLEVBQUUsSUFBWTtJQUM1RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ25DLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDdkMsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDM0MsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FB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QyxTQUFTLENBQUMsRUFBRTtnQ0FDMUMsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUM7b0NBQ2hCLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBQyxHQUFHLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztnQ0FDNUUsQ0FBQzs0QkFDTCxDQUFDLENBQUMsQ0FBQzt3QkFDUCxDQUFDO3dCQUVELE1BQU0sUUFBUSxHQUE2Qjs0QkFDdkMsTUFBTSxFQUFFLEtBQUs7NEJBQ2IsaUJBQWlCLEVBQUUsT0FBTzs0QkFDMUIsT0FBTyxFQUFFLE9BQU87eUJBQ25CLENBQUM7d0JBRUYsT0FBTyxRQUFRLENBQUM7b0JBQ3BCLENBQUM7eUJBQU0sQ0FBQzt3QkFDSCxNQUFNLFFBQVEsR0FBNkI7NEJBQ3hDLE1BQU0sRUFBRSxLQUFLOzRCQUNiLGlCQUFpQixFQUFFLFdBQVc7NEJBQzlCLE9BQU8sRUFBRTtnQ0FDTCxjQUFjLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDO2dDQUM5RCxZQUFZLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLHNEQUFzRCxFQUFFLENBQUM7NkJBQ3ZHOzRCQUNELElBQUksRUFBRSxrQ0FBa0M7eUJBQzNDLENBQUM7d0JBQ0YsT0FBTyxRQUFRLENBQUM7b0JBQ3BCLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ25CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDbG91ZEZyb250UmVxdWVzdEV2ZW50LCBDbG91ZEZyb250UmVzdWx0UmVzcG9uc2UgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IGRlY3J5cHQgfSBmcm9tICcuL2NyeXB0byc7XG5pbXBvcnQgKiBhcyBodHRwcyBmcm9tICdodHRwcyc7XG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ3F1ZXJ5c3RyaW5nJztcblxuY29uc3QgQVVUSF9TSUdOQUxfQVBJX0tFWSA9ICd4T1gxaVUxajNYYVJlSVIzN1lCbUkxeU1IYmFIektKUElpQXEvNEkvZ3NaWjFsUjhlM0tkekE9PSc7XG5cbmludGVyZmFjZSBBdXRoU2lnbmFsVmFsaWRhdGVSZXNwb25zZSB7XG4gICAgc3RhdGU6ICdDSEFMTEVOR0VfU1VDQ0VFREVEJyB8ICdDSEFMTEVOR0VfRkFJTEVEJztcbiAgICBpZGVtcG90ZW5jeUtleTogc3RyaW5nO1xuICAgIHVzZXJJZDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2hhbGxlbmdlQ29va2llRGF0YSB7XG4gICAgdXNlcklkOiBzdHJpbmc7XG4gICAgaWRlbXBvdGVuY3lLZXk6IHN0cmluZztcbiAgICBvcmlnaW5hbExvY2F0aW9uOiBzdHJpbmc7XG4gICAgc2Vzc2lvbkNvb2tpZXM6IHsga2V5OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfVtdO1xufVxuXG5mdW5jdGlvbiBnZXRDb29raWUoY29va2llczogeyBrZXk/OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmcgfVtdLCBrZXk6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgIGlmICghY29va2llcykgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgY29va2llID0gY29va2llcy5maW5kKGMgPT4gYy52YWx1ZS50cmltKCkuc3RhcnRzV2l0aChgJHtrZXl9PWApKTtcbiAgICByZXR1cm4gY29va2llID8gY29va2llLnZhbHVlLnNwbGl0KCc9JylbMV0gOiBudWxsO1xufVxuXG5mdW5jdGlvbiBodHRwUmVxdWVzdChvcHRpb25zOiBodHRwcy5SZXF1ZXN0T3B0aW9ucywgYm9keTogc3RyaW5nKTogUHJvbWlzZTxBdXRoU2lnbmFsVmFsaWRhdGVSZXNwb25zZT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlcSA9IGh0dHBzLnJlcXVlc3Qob3B0aW9ucywgKHJlcykgPT4ge1xuICAgICAgICAgICAgbGV0IGRhdGEgPSAnJztcbiAgICAgICAgICAgIHJlcy5vbignZGF0YScsIChjaHVuaykgPT4gKGRhdGEgKz0gY2h1bmspKTtcbiAgICAgICAgICAgIHJlcy5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShkYXRhKSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXEub24oJ2Vycm9yJywgKGUpID0+IHJlamVjdChlKSk7XG4gICAgICAgIHJlcS53cml0ZShib2R5KTtcbiAgICAgICAgcmVxLmVuZCgpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudDogQ2xvdWRGcm9udFJlcXVlc3RFdmVudCk6IFByb21pc2U8Q2xvdWRGcm9udFJlc3VsdFJlc3BvbnNlIHwgQ2xvdWRGcm9udFJlcXVlc3RFdmVudFsnUmVjb3JkcyddWzBdWydjZiddWydyZXF1ZXN0J10+IHtcbiAgICBjb25zdCByZXF1ZXN0ID0gZXZlbnQuUmVjb3Jkc1swXS5jZi5yZXF1ZXN0O1xuXG4gICAgaWYgKHJlcXVlc3QubWV0aG9kID09PSAnR0VUJyAmJiByZXF1ZXN0LnVyaSA9PT0gJy9hcGkvbWZhLWNhbGxiYWNrJykge1xuICAgICAgICBjb25zdCBxdWVyeVBhcmFtcyA9IHBhcnNlKHJlcXVlc3QucXVlcnlzdHJpbmcpO1xuICAgICAgICBjb25zdCB0b2tlbiA9IHF1ZXJ5UGFyYW1zLnRva2VuIGFzIHN0cmluZztcbiAgICAgICAgXG4gICAgICAgIGlmICh0b2tlbiAmJiByZXF1ZXN0LmhlYWRlcnMuY29va2llKSB7XG4gICAgICAgICAgICBjb25zdCBhdXRoQ2hhbGxlbmdlQ29va2llID0gZ2V0Q29va2llKHJlcXVlc3QuaGVhZGVycy5jb29raWUsICdhdXRoX2NoYWxsZW5nZScpO1xuXG4gICAgICAgICAgICBpZiAoYXV0aENoYWxsZW5nZUNvb2tpZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvb2tpZURhdGE6IENoYWxsZW5nZUNvb2tpZURhdGEgfCBudWxsID0gSlNPTi5wYXJzZShkZWNyeXB0KGF1dGhDaGFsbGVuZ2VDb29raWUpIHx8ICdudWxsJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY29va2llRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWxpZGF0ZVJlc3BvbnNlID0gYXdhaXQgaHR0cFJlcXVlc3QoXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdG5hbWU6ICdhcGkuYXV0aHNpZ25hbC5jb20nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6ICcvdjEvdmFsaWRhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmFzaWMgJHtCdWZmZXIuZnJvbShBVVRIX1NJR05BTF9BUElfS0VZICsgJzonKS50b1N0cmluZygnYmFzZTY0Jyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyB0b2tlbiB9KVxuICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgc3RhdGUsIGlkZW1wb3RlbmN5S2V5LCB1c2VySWQgfSA9IHZhbGlkYXRlUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9PT0gJ0NIQUxMRU5HRV9TVUNDRUVERUQnICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBpZGVtcG90ZW5jeUtleSA9PT0gY29va2llRGF0YS5pZGVtcG90ZW5jeUtleSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlcklkID09PSBjb29raWVEYXRhLnVzZXJJZFxuICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnM6IHsgW2tleTogc3RyaW5nXTogKHsga2V5OiBzdHJpbmc7IHZhbHVlOiBzdHJpbmc7IH0pW10gfSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbG9jYXRpb24nOiBbeyBrZXk6ICdMb2NhdGlvbicsIHZhbHVlOiBjb29raWVEYXRhLm9yaWdpbmFsTG9jYXRpb24gfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3NldC1jb29raWUnOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsga2V5OiAnU2V0LUNvb2tpZScsIHZhbHVlOiAnYXV0aF9jaGFsbGVuZ2U9OyBTZWN1cmU7IEh0dHBPbmx5OyBQYXRoPS87IE1heC1BZ2U9MCcgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NhY2hlLWNvbnRyb2wnOiBbeyBrZXk6ICdDYWNoZS1Db250cm9sJywgdmFsdWU6ICduby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZScgfV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGNvb2tpZURhdGEuc2Vzc2lvbkNvb2tpZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29va2llRGF0YS5zZXNzaW9uQ29va2llcy5mb3JFYWNoKGNvb2tpZU9iaiA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb29raWVPYmoua2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzWydzZXQtY29va2llJ10ucHVzaCh7a2V5OiAnU2V0LUNvb2tpZScsIHZhbHVlOiBjb29raWVPYmoudmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZTogQ2xvdWRGcm9udFJlc3VsdFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogJzMwMicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzRGVzY3JpcHRpb246ICdGb3VuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZTogQ2xvdWRGcm9udFJlc3VsdFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogJzQwMycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzRGVzY3JpcHRpb246ICdGb3JiaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbnRlbnQtdHlwZSc6IFt7IGtleTogJ0NvbnRlbnQtVHlwZScsIHZhbHVlOiAndGV4dC9wbGFpbicgfV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXQtY29va2llJzogW3sga2V5OiAnU2V0LUNvb2tpZScsIHZhbHVlOiAnYXV0aF9jaGFsbGVuZ2U9OyBTZWN1cmU7IEh0dHBPbmx5OyBQYXRoPS87IE1heC1BZ2U9MCcgfV1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6ICdBdXRoZW50aWNhdGlvbiBjaGFsbGVuZ2UgZmFpbGVkLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVxdWVzdDtcbn0gIl19