# Next.js AuthSignal ECS Deployment Guide

This guide will help you deploy your Next.js application with AuthSignal to AWS ECS using Fargate. The deployment creates a production-ready, scalable infrastructure with load balancing, auto-scaling, and monitoring.

## Architecture Overview

The deployment creates the following AWS resources:

- **VPC**: Custom VPC with public and private subnets across 2 availability zones
- **ECS Cluster**: Fargate cluster for running containerized applications
- **Application Load Balancer (ALB)**: Distributes traffic across container instances
- **ECS Service**: Manages and maintains desired number of tasks
- **CloudWatch**: Logging and monitoring for containers
- **Auto Scaling**: Automatically scales containers based on CPU/memory usage

## Prerequisites

Before you begin, ensure you have:

1. **AWS Account**: With appropriate permissions for ECS, VPC, IAM, and CloudFormation
2. **AWS CLI**: Installed and configured with your credentials
3. **Docker**: Installed and running on your local machine
4. **Node.js**: Version 18 or later
5. **pnpm**: Package manager (you can use npm if preferred)

### Installing Prerequisites

```bash
# Install AWS CLI (if not already installed)
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configure AWS CLI
aws configure

# Install Docker Desktop (if not already installed)
# Download from: https://docs.docker.com/desktop/install/

# Install Node.js and pnpm (if not already installed)
# Download Node.js from: https://nodejs.org/
npm install -g pnpm

# Install AWS CDK (done automatically by deployment script)
npm install -g aws-cdk
```

## Environment Configuration

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your configuration:**
   ```bash
   # Required for production
   JWT_SECRET=your-secure-jwt-secret-change-in-production
   ENCRYPTION_SECRET=your-secure-encryption-secret-change-in-production
   AUTH_SIGNAL_API_KEY=your-authsignal-api-key
   
   # Optional - will use AWS CLI defaults if not set
   AWS_REGION=us-east-1
   ```

### Generating Secure Secrets

Generate secure secrets for production:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate encryption secret  
openssl rand -base64 32
```

## Quick Deployment

For a quick deployment to the development environment:

```bash
# Deploy to development environment
./scripts/deploy.sh

# Check deployment status
./scripts/status.sh

# View logs
aws logs tail /ecs/NextjsAuthSignal-dev --follow
```

## Detailed Deployment Steps

### Step 1: Prepare Your Environment

1. **Verify prerequisites:**
   ```bash
   # Check Docker
   docker --version
   
   # Check AWS CLI
   aws --version
   aws sts get-caller-identity
   
   # Check Node.js
   node --version
   pnpm --version
   ```

2. **Configure your environment variables** in `.env` file

### Step 2: Deploy to Development

```bash
# Deploy with default settings (development environment)
./scripts/deploy.sh

# Or specify environment explicitly
./scripts/deploy.sh dev
```

This will:
- Build and test your Docker image
- Bootstrap CDK (if needed)
- Deploy the complete infrastructure
- Output the application URL

### Step 3: Deploy to Production

```bash
# Deploy to production environment with higher resources
./scripts/deploy.sh prod

# Or with custom stack name
./scripts/deploy.sh prod MyApp
```

Production deployment differences:
- 3 tasks instead of 2
- Higher CPU (1024) and memory (2048 MiB)
- More stringent environment variable validation

### Step 4: Verify Deployment

```bash
# Check overall status
./scripts/status.sh

# Test the application
curl -I http://your-load-balancer-url

# View real-time logs
aws logs tail /ecs/NextjsAuthSignal-dev --follow
```

## Configuration Options

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Secret for signing JWT tokens | - |
| `ENCRYPTION_SECRET` | Yes | Secret for encrypting cookies | - |
| `AUTH_SIGNAL_API_KEY` | Prod only | AuthSignal API key for MFA | - |
| `AWS_REGION` | No | AWS deployment region | us-east-1 |

### Deployment Parameters

You can customize the deployment by modifying `infrastructure/bin/infrastructure.ts`:

```typescript
// Example: Custom configuration
desiredCount: environment === 'prod' ? 5 : 2,  // Number of containers
cpu: environment === 'prod' ? 2048 : 512,      // CPU units
memoryLimitMiB: environment === 'prod' ? 4096 : 1024,  // Memory in MiB
```

## Monitoring and Troubleshooting

### Viewing Logs

```bash
# Real-time logs
aws logs tail /ecs/NextjsAuthSignal-dev --follow

# Specific time range
aws logs tail /ecs/NextjsAuthSignal-dev --since 1h

# Filter logs
aws logs tail /ecs/NextjsAuthSignal-dev --filter ERROR
```

### Common Issues

1. **Docker build fails:**
   - Ensure Docker is running
   - Check Dockerfile syntax
   - Verify pnpm-lock.yaml exists

2. **CDK bootstrap fails:**
   - Verify AWS credentials
   - Ensure sufficient permissions
   - Check AWS region is correct

3. **Application not responding:**
   - Check ECS task status
   - View container logs
   - Verify security group rules

4. **Environment variables not loaded:**
   - Verify .env file exists
   - Check variable names match exactly
   - Restart deployment after changes

### Health Checks

The load balancer performs health checks on the root path (`/`). The application should return a 200 or 302 status code for the health check to pass.

## Scaling and Performance

### Auto Scaling Configuration

The deployment includes automatic scaling based on:
- **CPU utilization**: Scales when average CPU > 70%
- **Memory utilization**: Scales when average memory > 80%
- **Min capacity**: 2 tasks (dev) / 3 tasks (prod)
- **Max capacity**: 10 tasks

### Manual Scaling

```bash
# Scale to specific number of tasks
aws ecs update-service \
    --cluster NextjsAuthSignal-dev-cluster \
    --service NextjsAuthSignal-dev-service \
    --desired-count 5
```

## Cost Optimization

- **Development**: ~$25-50/month (2 small Fargate tasks)
- **Production**: ~$100-200/month (3-5 medium Fargate tasks)

Cost factors:
- Fargate task pricing (CPU + memory)
- Application Load Balancer (~$18/month)
- NAT Gateway (~$45/month)
- Data transfer costs

### Cost Reduction Tips

1. **Use smaller task sizes** for development
2. **Schedule scaling** for predictable traffic patterns
3. **Use Fargate Spot** for non-critical workloads
4. **Optimize Docker image size** with multi-stage builds

## Security Considerations

### Network Security
- Private subnets for containers
- Public subnets only for load balancer
- Security groups restrict access to necessary ports only

### Application Security
- JWT tokens for session management
- Encrypted cookies for sensitive data
- Environment variables for secrets management
- IAM roles with minimal required permissions

### Best Practices
1. **Rotate secrets regularly** in production
2. **Use AWS Secrets Manager** for sensitive data
3. **Enable CloudTrail** for audit logging
4. **Implement WAF** for production workloads

## Updating the Application

To deploy updates:

1. **Make your code changes**
2. **Test locally:**
   ```bash
   pnpm dev
   ```
3. **Deploy updates:**
   ```bash
   ./scripts/deploy.sh
   ```

The deployment will:
- Build a new Docker image
- Update the ECS service
- Perform rolling updates with zero downtime

## Cleanup

To remove all AWS resources:

```bash
# Destroy development environment
./scripts/destroy.sh

# Destroy production environment  
./scripts/destroy.sh prod

# Or destroy specific stack
./scripts/destroy.sh dev MyApp
```

**⚠️ Warning**: This permanently deletes all resources and data.

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. **Register domain** in Route 53 or external provider
2. **Create SSL certificate** in AWS Certificate Manager
3. **Modify the CDK stack** to use HTTPS and custom domain
4. **Update DNS records** to point to the load balancer

### Multi-Region Deployment

For high availability across regions:

1. **Deploy to multiple regions:**
   ```bash
   AWS_REGION=us-east-1 ./scripts/deploy.sh prod
   AWS_REGION=us-west-2 ./scripts/deploy.sh prod
   ```
2. **Use Route 53** for traffic routing
3. **Configure database replication** if using RDS

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy to AWS ECS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy
        run: ./scripts/deploy.sh prod
```

## Support and Troubleshooting

### Useful AWS Console Links

After deployment, access these AWS services:

- **ECS Console**: Monitor containers and services
- **CloudWatch**: View logs and metrics  
- **CloudFormation**: Manage infrastructure
- **VPC Console**: Network configuration
- **Load Balancer**: Traffic routing and health checks

### Getting Help

1. **Check CloudWatch logs** for application errors
2. **Review ECS task events** for container issues
3. **Verify security group** and network configuration
4. **Test locally** with the same environment variables

### Common Commands

```bash
# Check AWS account/region
aws sts get-caller-identity

# List ECS clusters
aws ecs list-clusters

# Get service status
aws ecs describe-services --cluster CLUSTER_NAME --services SERVICE_NAME

# Force new deployment
aws ecs update-service --cluster CLUSTER_NAME --service SERVICE_NAME --force-new-deployment

# View task definition
aws ecs describe-task-definition --task-definition TASK_DEFINITION_ARN
```

This deployment provides a robust, scalable foundation for your Next.js application with AuthSignal integration on AWS. 