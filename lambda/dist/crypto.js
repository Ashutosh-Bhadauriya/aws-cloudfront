"use strict";
const crypto = require('crypto');
// IMPORTANT: Replace with your secure values
const ENCRYPTION_KEY = 'mlF5so11AKS4AarHXXPnw7WS8J/F4vuLF3hP5dB5mwM=';
const ENCRYPTION_IV = 'LCXsz5QWUjiIK5yja6CJPA==';
const AUTH_SIGNAL_API_KEY = 'xOX1iU1j3XaReIR37YBmI1yMHbaHzKJPIiAq/4I/gsZZ1lR8e3KdzA==';
function encrypt(data) {
    console.log('Encrypting data');
    try {
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        console.log(`Data successfully encrypted, length: ${encrypted.length}`);
        return encrypted;
    }
    catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}
function decrypt(encryptedData) {
    console.log('Attempting to decrypt data, length:', encryptedData ? encryptedData.length : 0);
    try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'base64'), Buffer.from(ENCRYPTION_IV, 'base64'));
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
function maskUsername(username) {
    if (!username)
        return 'null';
    if (username.length <= 4)
        return '*'.repeat(username.length);
    return username.substring(0, 2) + '*'.repeat(username.length - 4) + username.substring(username.length - 2);
}
module.exports = {
    encrypt,
    decrypt,
    getCookie,
    maskUsername,
    ENCRYPTION_KEY,
    ENCRYPTION_IV,
    AUTH_SIGNAL_API_KEY
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3J5cHRvLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vY3J5cHRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFakMsNkNBQTZDO0FBQzdDLE1BQU0sY0FBYyxHQUFHLDhDQUE4QyxDQUFDO0FBQ3RFLE1BQU0sYUFBYSxHQUFHLDBCQUEwQixDQUFDO0FBQ2pELE1BQU0sbUJBQW1CLEdBQUcsMERBQTBELENBQUM7QUFFdkYsU0FBUyxPQUFPLENBQUMsSUFBUztJQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDL0IsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNqSSxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25FLFNBQVMsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUMsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLGFBQXFCO0lBQ3BDLE9BQU8sQ0FBQyxHQUFH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QUFFLE9BQU8sTUFBTSxDQUFDO0lBQzdCLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDO1FBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM3RCxPQUFPLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDOUcsQ0FBQztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUc7SUFDZixPQUFPO0lBQ1AsT0FBTztJQUNQLFNBQVM7SUFDVCxZQUFZO0lBQ1osY0FBYztJQUNkLGFBQWE7SUFDYixtQkFBbUI7Q0FDcEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuXG4vLyBJTVBPUlRBTlQ6IFJlcGxhY2Ugd2l0aCB5b3VyIHNlY3VyZSB2YWx1ZXNcbmNvbnN0IEVOQ1JZUFRJT05fS0VZID0gJ21sRjVzbzExQUtTNEFhckhYWFBudzdXUzhKL0Y0dnVMRjNoUDVkQjVtd009JztcbmNvbnN0IEVOQ1JZUFRJT05fSVYgPSAnTENYc3o1UVdVamlJSzV5amE2Q0pQQT09JztcbmNvbnN0IEFVVEhfU0lHTkFMX0FQSV9LRVkgPSAneE9YMWlVMWozWGFSZUlSMzdZQm1JMXlNSGJhSHpLSlBJaUFxLzRJL2dzWloxbFI4ZTNLZHpBPT0nO1xuXG5mdW5jdGlvbiBlbmNyeXB0KGRhdGE6IGFueSk6IHN0cmluZyB7XG4gIGNvbnNvbGUubG9nKCdFbmNyeXB0aW5nIGRhdGEnKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjaXBoZXIgPSBjcnlwdG8uY3JlYXRlQ2lwaGVyaXYoJ2Flcy0yNTYtY2JjJywgQnVmZmVyLmZyb20oRU5DUllQVElPTl9LRVksICdiYXNlNjQnKSwgQnVmZmVyLmZyb20oRU5DUllQVElPTl9JViwgJ2Jhc2U2NCcpKTtcbiAgICBsZXQgZW5jcnlwdGVkID0gY2lwaGVyLnVwZGF0ZShKU09OLnN0cmluZ2lmeShkYXRhKSwgJ3V0ZjgnLCAnaGV4Jyk7XG4gICAgZW5jcnlwdGVkICs9IGNpcGhlci5maW5hbCgnaGV4Jyk7XG4gICAgY29uc29sZS5sb2coYERhdGEgc3VjY2Vzc2Z1bGx5IGVuY3J5cHRlZCwgbGVuZ3RoOiAke2VuY3J5cHRlZC5sZW5ndGh9YCk7XG4gICAgcmV0dXJuIGVuY3J5cHRlZDtcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0VuY3J5cHRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRlY3J5cHQoZW5jcnlwdGVkRGF0YTogc3RyaW5nKTogYW55IHtcbiAgY29uc29sZS5sb2coJ0F0dGVtcHRpbmcgdG8gZGVjcnlwdCBkYXRhLCBsZW5ndGg6JywgZW5jcnlwdGVkRGF0YSA/IGVuY3J5cHRlZERhdGEubGVuZ3RoIDogMCk7XG4gIHRyeSB7XG4gICAgY29uc3QgZGVjaXBoZXIgPSBjcnlwdG8uY3JlYXRlRGVjaXBoZXJpdignYWVzLTI1Ni1jYmMnLCBCdWZmZXIuZnJvbShFTkNSWVBUSU9OX0tFWSwgJ2Jhc2U2NCcpLCBCdWZmZXIuZnJvbShFTkNSWVBUSU9OX0lWLCAnYmFzZTY0JykpO1xuICAgIGxldCBkZWNyeXB0ZWQgPSBkZWNpcGhlci51cGRhdGUoZW5jcnlwdGVkRGF0YSwgJ2hleCcsICd1dGY4Jyk7XG4gICAgZGVjcnlwdGVkICs9IGRlY2lwaGVyLmZpbmFsKCd1dGY4Jyk7XG4gICAgXG4gICAgY29uc29sZS5sb2coJ0RlY3J5cHRpb24gc3VjY2Vzc2Z1bCwgcGFyc2luZyBKU09OJyk7XG4gICAgY29uc3QgcGFyc2VkRGF0YSA9IEpTT04ucGFyc2UoZGVjcnlwdGVkKTtcbiAgICBjb25zb2xlLmxvZygnQ29va2llIGRhdGEgcGFyc2VkOicsIEpTT04uc3RyaW5naWZ5KHBhcnNlZERhdGEpLnN1YnN0cmluZygwLCAyMDApKTtcbiAgICByZXR1cm4gcGFyc2VkRGF0YTtcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0RlY3J5cHRpb24gZXJyb3IgZGV0YWlsczonLCBlcnJvci5tZXNzYWdlKTtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzdGFjazonLCBlcnJvci5zdGFjayk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Q29va2llKGNvb2tpZUhlYWRlcnM6IGFueVtdLCBuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc29sZS5sb2coYExvb2tpbmcgZm9yIGNvb2tpZTogJHtuYW1lfWApO1xuICBpZiAoIWNvb2tpZUhlYWRlcnMpIHtcbiAgICBjb25zb2xlLmxvZygnTm8gY29va2llIGhlYWRlcnMgZm91bmQnKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGNvbnNvbGUubG9nKGBGb3VuZCAke2Nvb2tpZUhlYWRlcnMubGVuZ3RofSBjb29raWUgaGVhZGVyKHMpYCk7XG4gIGZvciAoY29uc3QgaGVhZGVyIG9mIGNvb2tpZUhlYWRlcnMpIHtcbiAgICBjb25zb2xlLmxvZyhgRXhhbWluaW5nIGNvb2tpZSBoZWFkZXI6ICR7aGVhZGVyLnZhbHVlLnN1YnN0cmluZygwLCA1MCl9Li4uYCk7XG4gICAgY29uc3QgY29va2llcyA9IGhlYWRlci52YWx1ZS5zcGxpdCgnOycpO1xuICAgIGZvciAoY29uc3QgY29va2llIG9mIGNvb2tpZXMpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gY29va2llLnRyaW0oKS5zcGxpdCgnPScpO1xuICAgICAgaWYgKHBhcnRzWzBdID09PSBuYW1lICYmIHBhcnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCc9Jyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke25hbWV9IGNvb2tpZSB3aXRoIGxlbmd0aDogJHt2YWx1ZS5sZW5ndGh9YCk7XG4gICAgICAgIHJldHVybiB2YWx1ZTsgXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGNvbnNvbGUubG9nKGBDb29raWUgJHtuYW1lfSBub3QgZm91bmQgaW4gaGVhZGVyc2ApO1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gbWFza1VzZXJuYW1lKHVzZXJuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoIXVzZXJuYW1lKSByZXR1cm4gJ251bGwnO1xuICBpZiAodXNlcm5hbWUubGVuZ3RoIDw9IDQpIHJldHVybiAnKicucmVwZWF0KHVzZXJuYW1lLmxlbmd0aCk7XG4gIHJldHVybiB1c2VybmFtZS5zdWJzdHJpbmcoMCwgMikgKyAnKicucmVwZWF0KHVzZXJuYW1lLmxlbmd0aCAtIDQpICsgdXNlcm5hbWUuc3Vic3RyaW5nKHVzZXJuYW1lLmxlbmd0aCAtIDIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZW5jcnlwdCxcbiAgZGVjcnlwdCxcbiAgZ2V0Q29va2llLFxuICBtYXNrVXNlcm5hbWUsXG4gIEVOQ1JZUFRJT05fS0VZLFxuICBFTkNSWVBUSU9OX0lWLFxuICBBVVRIX1NJR05BTF9BUElfS0VZXG59OyAiXX0=