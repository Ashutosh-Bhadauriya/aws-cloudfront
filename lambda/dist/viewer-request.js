"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const querystring_1 = require("querystring");
const crypto_1 = require("./crypto");
async function handler(event) {
    const request = event.Records[0].cf.request;
    if (request.method === 'POST' && request.uri === '/api/login') {
        if (request.body && request.body.data) {
            let decodedBody;
            if (request.body.encoding === 'base64') {
                decodedBody = Buffer.from(request.body.data, 'base64').toString('utf8');
            }
            else {
                decodedBody = request.body.data;
            }
            const formData = (0, querystring_1.parse)(decodedBody);
            const username = formData.email;
            if (username) {
                const encryptedUsername = (0, crypto_1.encrypt)(username);
                if (!request.headers.cookie) {
                    request.headers.cookie = [];
                }
                const cookieValue = `auth_username=${encryptedUsername}; Path=/; Secure; HttpOnly; SameSite=Lax`;
                request.headers.cookie.push({ key: 'Cookie', value: cookieValue });
            }
        }
    }
    return request;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld2VyLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi92aWV3ZXItcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLDBCQThCQztBQWpDRCw2Q0FBb0M7QUFDcEMscUNBQW1DO0FBRTVCLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBNkI7SUFDekQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDO0lBRTVDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsS0FBSyxZQUFZLEVBQUUsQ0FBQztRQUM5RCxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN0QyxJQUFJLFdBQW1CLENBQUM7WUFFeEIsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdkMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFFLENBQUM7aUJBQU0sQ0FBQztnQkFDTixXQUFXLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbEMsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLElBQUEsbUJBQUssRUFBQyxXQUFXLENBQUMsQ0FBQztZQUNwQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsS0FBZSxDQUFDO1lBRTFDLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2IsTUFBTSxpQkFBaUIsR0FBRyxJQUFBLGdCQUFPLEVBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTVDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUM1QixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7Z0JBQzlCLENBQUM7Z0JBRUQsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLGlCQUFpQiwwQ0FBMEMsQ0FBQztnQkFDakcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUNyRSxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ2xvdWRGcm9udFJlcXVlc3RFdmVudCwgQ2xvdWRGcm9udFJlcXVlc3RSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0IHsgZW5jcnlwdCB9IGZyb20gJy4vY3J5cHRvJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQ6IENsb3VkRnJvbnRSZXF1ZXN0RXZlbnQpOiBQcm9taXNlPENsb3VkRnJvbnRSZXF1ZXN0UmVzdWx0PiB7XG4gIGNvbnN0IHJlcXVlc3QgPSBldmVudC5SZWNvcmRzWzBdLmNmLnJlcXVlc3Q7XG5cbiAgaWYgKHJlcXVlc3QubWV0aG9kID09PSAnUE9TVCcgJiYgcmVxdWVzdC51cmkgPT09ICcvYXBpL2xvZ2luJykge1xuICAgIGlmIChyZXF1ZXN0LmJvZHkgJiYgcmVxdWVzdC5ib2R5LmRhdGEpIHtcbiAgICAgIGxldCBkZWNvZGVkQm9keTogc3RyaW5nO1xuXG4gICAgICBpZiAocmVxdWVzdC5ib2R5LmVuY29kaW5nID09PSAnYmFzZTY0Jykge1xuICAgICAgICBkZWNvZGVkQm9keSA9IEJ1ZmZlci5mcm9tKHJlcXVlc3QuYm9keS5kYXRhLCAnYmFzZTY0JykudG9TdHJpbmcoJ3V0ZjgnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlY29kZWRCb2R5ID0gcmVxdWVzdC5ib2R5LmRhdGE7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZvcm1EYXRhID0gcGFyc2UoZGVjb2RlZEJvZHkpO1xuICAgICAgY29uc3QgdXNlcm5hbWUgPSBmb3JtRGF0YS5lbWFpbCBhcyBzdHJpbmc7XG5cbiAgICAgIGlmICh1c2VybmFtZSkge1xuICAgICAgICBjb25zdCBlbmNyeXB0ZWRVc2VybmFtZSA9IGVuY3J5cHQodXNlcm5hbWUpO1xuXG4gICAgICAgIGlmICghcmVxdWVzdC5oZWFkZXJzLmNvb2tpZSkge1xuICAgICAgICAgIHJlcXVlc3QuaGVhZGVycy5jb29raWUgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvb2tpZVZhbHVlID0gYGF1dGhfdXNlcm5hbWU9JHtlbmNyeXB0ZWRVc2VybmFtZX07IFBhdGg9LzsgU2VjdXJlOyBIdHRwT25seTsgU2FtZVNpdGU9TGF4YDtcbiAgICAgICAgcmVxdWVzdC5oZWFkZXJzLmNvb2tpZS5wdXNoKHsga2V5OiAnQ29va2llJywgdmFsdWU6IGNvb2tpZVZhbHVlIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXF1ZXN0O1xufSAiXX0=