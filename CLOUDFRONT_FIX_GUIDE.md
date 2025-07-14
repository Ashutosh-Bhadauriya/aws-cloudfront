# 🚨 CRITICAL: CloudFront Configuration Fix Guide

## **The Problem You're Experiencing**

Your CloudFront distribution is redirecting users from your CloudFront URL (`https://d3w0aux8k6z2b9.cloudfront.net/`) directly to your ECS load balancer URL (`http://nextjs-nextj-hc4wgrqokudq-216456510.us-east-1.elb.amazonaws.com/`). This defeats the purpose of using CloudFront and exposes internal AWS infrastructure.

## **Root Cause Analysis**

Based on your CloudWatch logs, I identified the core issues:

### 1. **Lambda@Edge Response Status Mismatch**
- **Issue**: Your origin-response lambda was checking for `response.status === '200'`
- **Reality**: Your Next.js login route returns `303` redirects (See Other)
- **Fix**: ✅ **FIXED** - Updated lambda to check for `302` or `303` status codes

### 2. **CRITICAL: Encryption Key Mismatch** 🚨
- **Issue**: Lambda functions used `mlF5so11AKS4AarHXXPnw7WS8J/F4vuLF3hP5dB5mwM=`
- **Next.js App**: Uses `8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=` from .env
- **Fix**: ✅ **FIXED** - All Lambda functions now use your .env ENCRYPTION_SECRET

### 3. **CloudFront Origin Configuration**
- **Issue**: CloudFront origin is likely pointing to internal ECS IPs instead of the load balancer
- **Required**: CloudFront must point to your Application Load Balancer DNS name

### 4. **Lambda@Edge Cache Behavior Configuration**
- **Issue**: Lambda functions may not be properly associated with the correct CloudFront cache behaviors

---

## 🔧 **IMMEDIATE FIXES REQUIRED**

### **Step 1: Update Lambda@Edge Functions**

I've identified and fixed the critical issue. You need to update **TWO** Lambda functions:

**A. Update viewer-request function:**
1. Copy the code from `lambda/dist/viewer-request.js`
2. Go to AWS Lambda Console → Find your `viewer-request` function
3. Paste the updated code and click "Deploy"
4. **Deploy to Lambda@Edge** (critical step!)

**B. Update origin-response function:**
1. Copy the code from `lambda/dist/origin-response.js` 
2. Go to AWS Lambda Console → Find your `origin-response` function
3. Paste the updated code and click "Deploy"
4. **Deploy to Lambda@Edge** (critical step!)

**Critical Fix Explanation:**
- **viewer-request**: Now adds auth_username to request headers AND uses correct encryption key
- **origin-response**: Now handles 302/303 redirects AND uses correct encryption key  
- **origin-request**: Now uses correct encryption key to decrypt cookies
- **🔑 ENCRYPTION KEY**: All Lambda functions now use `8Ls6tUjlf4CLW9xrDAeKgARDYTlJyKA0wjLSAvF2Zzo=` (from your .env)

### **Step 2: Fix CloudFront Origin Configuration**

Your CloudFront distribution must use your **Load Balancer DNS name** as the origin:

**✅ Correct Origin Domain:**
```
Nextjs-Nextj-hC4WGrQOkUdQ-216456510.us-east-1.elb.amazonaws.com
```

**❌ Incorrect (what you might have):**
- `ip-10-0-3-38.ec2.internal` (internal ECS task IP)
- Direct ECS service references
- Container IPs

**To Fix:**
1. Go to **CloudFront Console**
2. Select your distribution (`d3w0aux8k6z2b9.cloudfront.net`)
3. Go to **Origins** tab
4. **Edit** your origin
5. Set **Origin Domain** to: `Nextjs-Nextj-hC4WGrQOkUdQ-216456510.us-east-1.elb.amazonaws.com`
6. Set **Protocol** to: `HTTP`
7. Set **Port** to: `80`
8. **Save changes**
9. **Wait for deployment** (15-20 minutes)

### **Step 3: Verify Cache Behaviors**

Your CloudFront distribution needs these cache behaviors:

#### **Cache Behavior 1: `/api/login`**
- **Path Pattern**: `/api/login`
- **Origin**: Your ALB origin
- **Cache Policy**: `CachingDisabled`
- **Origin Request Policy**: `CORS-S3Origin` (or allow all headers/query strings)
- **Lambda@Edge Associations**:
  - **Viewer Request**: `arn:aws:lambda:us-east-1:YOUR_ACCOUNT:function:viewer-request:VERSION`
  - **Origin Response**: `arn:aws:lambda:us-east-1:YOUR_ACCOUNT:function:origin-response:VERSION`

#### **Cache Behavior 2: `/dashboard`**
- **Path Pattern**: `/dashboard`
- **Origin**: Your ALB origin
- **Cache Policy**: `CachingDisabled`
- **Lambda@Edge Associations**:
  - **Origin Request**: `arn:aws:lambda:us-east-1:YOUR_ACCOUNT:function:origin-request:VERSION`

#### **Cache Behavior 3: Default `/*`**
- **Path Pattern**: `*` (default)
- **Origin**: Your ALB origin
- **Cache Policy**: `CachingOptimized` (for static assets)

---

## 🧪 **Testing & Verification**

### **Step 1: Test Load Balancer Directly**
First, verify your app works on the load balancer:
```bash
curl -I http://Nextjs-Nextj-hC4WGrQOkUdQ-216456510.us-east-1.elb.amazonaws.com/
# Should return HTTP 200 or 302
```

### **Step 2: Test CloudFront After Fixes**
```bash
curl -I https://d3w0aux8k6z2b9.cloudfront.net/
# Should return your app, NOT redirect to ALB
```

### **Step 3: Test Authentication Flow**
1. Go to `https://d3w0aux8k6z2b9.cloudfront.net/`
2. Enter credentials: `test@example.com` / `password`
3. **Expected**: MFA challenge or direct dashboard access
4. **Should NOT**: Redirect to ALB URL

---

## 🎯 **Expected Authentication Flow After Fix**

### **1. User Submits Login Form**
- **Request**: `POST https://d3w0aux8k6z2b9.cloudfront.net/api/login`
- **Viewer Request Lambda**: Captures email, encrypts as `auth_username` cookie
- **Next.js App**: Validates credentials → returns `303` redirect to `/dashboard`
- **Origin Response Lambda**: Intercepts redirect, calls AuthSignal API

### **2. AuthSignal Response**
- **If ALLOW**: User goes directly to dashboard
- **If CHALLENGE_REQUIRED**: User redirected to AuthSignal MFA → back to `/dashboard?challenge_id=...&token=...`

### **3. MFA Validation**
- **Origin Request Lambda**: Validates MFA token → restores session → redirects to `/dashboard`
- **User**: Successfully authenticated on CloudFront domain

---

## 🚀 **Quick Fix Commands**

### **Update Lambda Function**
```bash
cd lambda/dist
zip origin-response-fixed.zip origin-response.js

# Upload via AWS CLI (replace FUNCTION_NAME with your actual function name)
aws lambda update-function-code \
  --function-name YOUR_ORIGIN_RESPONSE_FUNCTION_NAME \
  --zip-file fileb://origin-response-fixed.zip

# Deploy to Lambda@Edge
aws lambda publish-version --function-name YOUR_ORIGIN_RESPONSE_FUNCTION_NAME
```

### **Get Your CloudFront Distribution Details**
```bash
# List all distributions
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName,Comment]' \
  --output table

# Get your distribution config
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID
```

---

## 🆘 **If You're Still Having Issues**

### **Check CloudWatch Logs**
```bash
# Check Lambda@Edge logs in us-east-1 (Lambda@Edge logs appear here)
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/us-east-1
```

### **Debug Steps**
1. **Test ALB directly**: Ensure app works without CloudFront
2. **Check Lambda function versions**: Ensure latest version is deployed to Lambda@Edge
3. **Verify cache behaviors**: Ensure Lambda functions are attached to correct path patterns
4. **Check origin configuration**: Ensure CloudFront points to ALB, not ECS tasks

---

## 📋 **Verification Checklist**

- [ ] Origin-response lambda updated to handle `302`/`303` status codes
- [ ] Lambda function deployed to Lambda@Edge
- [ ] CloudFront origin points to ALB DNS name (not ECS IPs)
- [ ] Cache behaviors configured with correct Lambda@Edge associations
- [ ] CloudFront deployment completed (15-20 minutes)
- [ ] Authentication flow works on CloudFront domain
- [ ] No redirects to ALB URLs in browser

---

## 🎉 **Success Indicators**

After applying these fixes:
1. ✅ `https://d3w0aux8k6z2b9.cloudfront.net/` loads your Next.js app
2. ✅ Login form works correctly through CloudFront
3. ✅ AuthSignal MFA integration functions properly
4. ✅ Users never see the ALB URL in their browser
5. ✅ All authentication happens on the CloudFront domain

The key is ensuring CloudFront acts as the public face of your application, while your ECS infrastructure remains hidden behind it. 