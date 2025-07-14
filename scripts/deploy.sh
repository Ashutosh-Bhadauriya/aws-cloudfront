#!/bin/bash

# Deploy Next.js Application to AWS ECS using Fargate
# Usage: ./scripts/deploy.sh [environment] [stack-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-dev}
STACK_NAME=${2:-NextjsAuthSignal}
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${BLUE}🚀 Starting deployment of Next.js AuthSignal app to AWS ECS${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Stack Name: ${STACK_NAME}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! which cdk > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CDK is not installed. Please install it with 'npm install -g aws-cdk'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"
echo ""

# Load environment variables if .env file exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}📄 Loading environment variables from .env file...${NC}"
    set -a
    source .env
    set +a
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found. Using default values.${NC}"
    echo -e "${YELLOW}💡 Create a .env file based on .env.example for production deployment.${NC}"
fi
echo ""

# Validate required environment variables
MISSING_VARS=""

if [ -z "$JWT_SECRET" ]; then
    MISSING_VARS="$MISSING_VARS JWT_SECRET"
fi

if [ -z "$ENCRYPTION_SECRET" ]; then
    MISSING_VARS="$MISSING_VARS ENCRYPTION_SECRET"
fi

if [ "$ENVIRONMENT" = "prod" ] && [ -z "$AUTH_SIGNAL_API_KEY" ]; then
    MISSING_VARS="$MISSING_VARS AUTH_SIGNAL_API_KEY"
fi

if [ ! -z "$MISSING_VARS" ]; then
    echo -e "${RED}❌ Missing required environment variables:${MISSING_VARS}${NC}"
    echo -e "${YELLOW}💡 Please set these variables in your .env file or export them.${NC}"
    exit 1
fi

# Test Docker build
echo -e "${YELLOW}🐳 Testing Docker build...${NC}"
if docker build -t nextjs-authsignal-test . > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker build successful${NC}"
    docker rmi nextjs-authsignal-test > /dev/null 2>&1
else
    echo -e "${RED}❌ Docker build failed. Please check your Dockerfile and try again.${NC}"
    exit 1
fi
echo ""

# Bootstrap CDK if not already done
echo -e "${YELLOW}🔄 Bootstrapping CDK (if needed)...${NC}"
cd infrastructure
if ! cdk bootstrap --context environment=$ENVIRONMENT --context stackName=$STACK_NAME > /dev/null 2>&1; then
    echo -e "${RED}❌ CDK bootstrap failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ CDK bootstrap complete${NC}"
echo ""

# Install CDK dependencies
echo -e "${YELLOW}📦 Installing CDK dependencies...${NC}"
if npm install > /dev/null 2>&1; then
    echo -e "${GREEN}✅ CDK dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install CDK dependencies${NC}"
    exit 1
fi
echo ""

# Deploy the stack
echo -e "${YELLOW}🚀 Deploying CDK stack...${NC}"
echo -e "${BLUE}This may take 10-15 minutes for the first deployment...${NC}"

cdk deploy \
    --context environment=$ENVIRONMENT \
    --context stackName=$STACK_NAME \
    --require-approval never \
    --progress events

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    
    # Get the load balancer URL
    STACK_FULL_NAME="${STACK_NAME}-${ENVIRONMENT}"
    LB_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_FULL_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`'$STACK_FULL_NAME'-url`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ ! -z "$LB_URL" ]; then
        echo -e "${GREEN}🌐 Your application is available at: ${LB_URL}${NC}"
        echo -e "${YELLOW}⏳ It may take a few minutes for the load balancer to become healthy.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📊 To view logs: aws logs tail /ecs/${STACK_FULL_NAME} --follow${NC}"
    echo -e "${BLUE}🗂️  To view in console: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${STACK_FULL_NAME}-cluster${NC}"
    echo ""
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi 