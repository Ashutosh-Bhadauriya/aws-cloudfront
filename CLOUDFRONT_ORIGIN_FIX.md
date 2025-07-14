# 🔧 CloudFront Origin Configuration Fix

## 🚨 **The Problem**

You're getting a DNS error: `ip-10-0-3-38.ec2.internal` because your **CloudFront origin is pointing to an internal ECS task IP** instead of the **Application Load Balancer URL**.

This is the most common CloudFront + ECS misconfiguration issue.

---

## 🎯 **The Solution**

You need to configure CloudFront to use your **Application Load Balancer DNS name** as the origin, not the ECS service directly.

### **Step 1: Get Your Load Balancer URL**

Run this command to find your load balancer URL:

```bash
# Get the load balancer DNS name
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?contains(LoadBalancerName, `NextjsAuthSignal-dev`)].DNSName' \
  --output text

# Or get all load balancers and find yours manually
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerName,DNSName]' \
  --output table
```

The output should look like:
```
NextjsAuthSignal-dev-fargate-123456789-1234567890.us-east-1.elb.amazonaws.com
```

### **Step 2: Test Your Load Balancer**

Verify your app is running correctly on the load balancer:

```bash
# Replace with your actual load balancer URL
curl -I http://NextjsAuthSignal-dev-fargate-123456789-1234567890.us-east-1.elb.amazonaws.com

# You should get a 200 or 302 response
```

---

## 🌐 **CloudFront Configuration**

### **Correct Origin Configuration:**

1. **Origin Domain Name**: Use your **Load Balancer DNS name**
   ```
   NextjsAuthSignal-dev-fargate-123456789-1234567890.us-east-1.elb.amazonaws.com
   ```
   
2. **Protocol**: HTTP (ALB handles HTTPS termination internally)

3. **Port**: 80

### **❌ What NOT to Use:**

- ❌ ECS service internal IPs (`ip-10-0-3-38.ec2.internal`)
- ❌ Container IPs directly
- ❌ ECS service discovery DNS names

---

## 🛠 **Fix Your CloudFront Distribution**

### **Option 1: AWS Console (Recommended)**

1. **Go to CloudFront Console**
2. **Select your distribution**
3. **Go to Origins tab**
4. **Edit your origin**
5. **Change Origin Domain to your Load Balancer DNS name**
6. **Save changes**
7. **Wait for deployment (15-20 minutes)**

### **Option 2: AWS CLI**

```bash
# Get your distribution ID
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,Comment]' --output table

# Update the origin (replace DISTRIBUTION_ID and ALB_DNS_NAME)
aws cloudfront get-distribution-config --id YOUR_DISTRIBUTION_ID > distribution-config.json

# Edit the distribution-config.json file:
# - Update "DomainName" in Origins to your ALB DNS name
# - Remove the "ETag" field from the root level
# - Keep only the "DistributionConfig" section

# Apply the changes
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --distribution-config file://distribution-config.json \
  --if-match ETAG_FROM_GET_COMMAND
```

---

## 🔍 **Troubleshooting Steps**

### **1. Verify ECS Service is Running**

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster NextjsAuthSignal-dev-cluster \
  --services NextjsAuthSignal-dev-service

# Check tasks are running
aws ecs list-tasks \
  --cluster NextjsAuthSignal-dev-cluster \
  --service-name NextjsAuthSignal-dev-service
```

### **2. Check Load Balancer Health**

```bash
# Get target group ARN
aws elbv2 describe-target-groups \
  --names NextjsAuthSignal-dev-fargate-TargetGroup

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn TARGET_GROUP_ARN_FROM_ABOVE
```

### **3. Test Load Balancer Directly**

```bash
# Test your load balancer URL directly
curl -v http://YOUR_LOAD_BALANCER_DNS_NAME/

# Check if it returns your Next.js app
curl -s http://YOUR_LOAD_BALANCER_DNS_NAME/ | grep -i "next.js\|react"
```

---

## 🎯 **Complete CloudFront Configuration**

Once you have the correct origin, your CloudFront should be configured with:

### **Origins:**
- **Origin 1**: Your Load Balancer DNS name (HTTP, port 80)

### **Cache Behaviors:**

1. **Path Pattern**: `/api/login`
   - **Lambda@Edge**: Viewer Request + Origin Response
   - **Cache**: Disabled
   - **Methods**: All methods

2. **Path Pattern**: `/dashboard`  
   - **Lambda@Edge**: Origin Request
   - **Cache**: Disabled
   - **Methods**: GET, HEAD, OPTIONS

3. **Default**: `/*`
   - **Cache**: Enabled for static assets

---

## 🚀 **Expected Behavior After Fix**

1. ✅ CloudFront domain loads your Next.js app
2. ✅ Login form submissions work correctly
3. ✅ Lambda@Edge functions process authentication
4. ✅ No more `ip-10-0-3-38.ec2.internal` errors

---

## 💡 **Quick Verification Commands**

After fixing the origin:

```bash
# Test CloudFront domain
curl -I https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/

# Test login page specifically  
curl -s https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/ | grep -i login

# Check CloudFront distribution status
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID --query 'Distribution.Status'
```

---

## 🆘 **If You're Still Having Issues**

1. **Check CloudWatch Logs**: Look for ECS task logs and Lambda@Edge logs
2. **Verify Security Groups**: Ensure ALB can reach ECS tasks on port 3000
3. **Check VPC Configuration**: Ensure proper subnet routing
4. **Test Without CloudFront**: Verify app works directly on ALB first

The key is ensuring CloudFront points to your **Load Balancer**, not the individual ECS tasks! 🎯 