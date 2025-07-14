# CloudFront Configuration Guide

## Current Issue Analysis

Your origin request lambda is being triggered for POST requests to `/api/login`, but it's designed to only process GET requests (MFA callbacks). This is causing the "No special processing" logs you're seeing.

**CRITICAL MISMATCH DISCOVERED:** Your origin-response lambda redirects to `/api/mfa-callback` but your origin-request lambda is checking for `/api/login`.

## Root Cause

Looking at your compiled code:
- **Origin Response Lambda** (`lambda/dist/origin-response.js`): Sets `redirectUrl: 'https://${host}/api/mfa-callback'`
- **Origin Request Lambda** (`lambda/origin-request.ts`): Checks for `request.uri === '/api/login'`

This mismatch means the MFA callback never gets processed!

## Fix Options

### Option 1: Fix the Origin Request Lambda (Recommended)

Update your origin request lambda to check for the correct endpoint:

```typescript
// In lambda/origin-request.ts, line 105, change:
if (request.method === 'GET' && request.uri === '/api/login') {

// To:
if (request.method === 'GET' && request.uri === '/api/mfa-callback') {
```

### Option 2: Fix the Origin Response Lambda

Update your origin response lambda to redirect to `/api/login`:

```typescript
// In lambda/origin-response.ts, change the redirectUrl to:
redirectUrl: `https://${request.headers.host[0].value}/api/login`
```

## Correct CloudFront Cache Behaviors

Based on your lambda functions, here's the correct CloudFront configuration:

### 1. Cache Behavior for `/api/login` (Login Endpoint)

**Path Pattern:** `/api/login`
**Allowed HTTP Methods:** GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
**Cache Policy:** Disabled (no caching)
**Origin Request Policy:** CORS-S3Origin or similar (allows all headers/query strings)

**Lambda@Edge Functions:**
- **Viewer Request:** `viewer-request` function
  - **Event Type:** Viewer Request
  - **Purpose:** Captures username from POST body and stores in encrypted cookie
- **Origin Response:** `origin-response` function  
  - **Event Type:** Origin Response
  - **Purpose:** Intercepts successful login responses and triggers AuthSignal MFA if needed

### 2. Cache Behavior for `/api/mfa-callback` (MFA Callback)

**Path Pattern:** `/api/mfa-callback`
**Allowed HTTP Methods:** GET, HEAD, OPTIONS
**Cache Policy:** Disabled (no caching)

**Lambda@Edge Functions:**
- **Origin Request:** `origin-request` function
  - **Event Type:** Origin Request
  - **Purpose:** Validates MFA token and restores user session

### 3. Default Cache Behavior (All Other Routes)

**Path Pattern:** `*` (default)
**Cache as normal for static assets and other routes

## Current Configuration Problem

Your origin request lambda is currently configured for `/api/login` instead of `/api/mfa-callback`. This is why you're seeing it trigger for POST requests but do nothing.

## Step-by-Step Fix

### Recommended: Update Lambda Code + CloudFront

1. **Fix the origin request lambda code** (see Option 1 above)
2. **Update CloudFront cache behaviors:**
   - Remove origin request lambda from `/api/login` cache behavior
   - Add cache behavior for `/api/mfa-callback` with origin request lambda

### Alternative: Quick CloudFront Fix Only

If you can't update lambda code immediately:
1. **Change the cache behavior path pattern** from `/api/login` to `/api/mfa-callback` for your origin request lambda
2. **Keep viewer request and origin response lambdas on `/api/login`**

## Complete CloudFront CLI Configuration

If using AWS CLI, here's the cache behavior structure:

```json
{
  "CacheBehaviors": {
    "Items": [
      {
        "PathPattern": "/api/login",
        "TargetOriginId": "your-origin-id",
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "LambdaFunctionAssociations": {
          "Items": [
            {
              "LambdaFunctionARN": "arn:aws:lambda:us-east-1:account:function:viewer-request:version",
              "EventType": "viewer-request"
            },
            {
              "LambdaFunctionARN": "arn:aws:lambda:us-east-1:account:function:origin-response:version", 
              "EventType": "origin-response"
            }
          ]
        }
      },
      {
        "PathPattern": "/api/mfa-callback",
        "TargetOriginId": "your-origin-id", 
        "ViewerProtocolPolicy": "redirect-to-https",
        "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        "LambdaFunctionAssociations": {
          "Items": [
            {
              "LambdaFunctionARN": "arn:aws:lambda:us-east-1:account:function:origin-request:version",
              "EventType": "origin-request"  
            }
          ]
        }
      }
    ]
  }
}
```

## Expected Flow After Fix

1. **User submits login form** → POST `/api/login`
   - Viewer Request Lambda: Captures username in encrypted cookie
   - Next.js: Validates credentials, returns redirect with session cookie
   - Origin Response Lambda: Calls AuthSignal, either allows or redirects to MFA

2. **MFA completion** → GET `/api/mfa-callback?token=...`
   - Origin Request Lambda: Validates token, restores session, redirects to destination

3. **User reaches dashboard** → Authenticated and logged in

## Immediate Action Required

The quickest fix is to update your origin request lambda to check for `/api/mfa-callback` instead of `/api/login`, then rebuild and redeploy the lambda function. 