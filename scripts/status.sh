#!/bin/bash

# Check Status of Next.js ECS Deployment
# Usage: ./scripts/status.sh [environment] [stack-name]

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
STACK_FULL_NAME="${STACK_NAME}-${ENVIRONMENT}"
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${BLUE}📊 Checking status of Next.js AuthSignal ECS deployment${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Stack Name: ${STACK_FULL_NAME}${NC}"
echo -e "${BLUE}Region: ${AWS_REGION}${NC}"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name $STACK_FULL_NAME > /dev/null 2>&1; then
    echo -e "${RED}❌ Stack '${STACK_FULL_NAME}' does not exist.${NC}"
    echo -e "${YELLOW}💡 Run './scripts/deploy.sh ${ENVIRONMENT}' to deploy the stack.${NC}"
    exit 1
fi

# Get stack status
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_FULL_NAME \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null)

echo -e "${YELLOW}🏗️  Stack Status: ${STACK_STATUS}${NC}"

# Get outputs
echo -e "${BLUE}📤 Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name $STACK_FULL_NAME \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue,Description]' \
    --output table 2>/dev/null

echo ""

# Get load balancer URL
LB_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_FULL_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`'$STACK_FULL_NAME'-url`].OutputValue' \
    --output text 2>/dev/null)

if [ ! -z "$LB_URL" ]; then
    echo -e "${GREEN}🌐 Application URL: ${LB_URL}${NC}"
    
    # Test if the application is responding
    echo -e "${YELLOW}🔍 Testing application health...${NC}"
    if curl -s --max-time 10 "$LB_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Application is responding${NC}"
    else
        echo -e "${RED}❌ Application is not responding (may still be starting up)${NC}"
    fi
fi

echo ""

# Get ECS service status
CLUSTER_NAME="${STACK_FULL_NAME}-cluster"
SERVICE_NAME="${STACK_FULL_NAME}-service"

if aws ecs describe-clusters --clusters $CLUSTER_NAME > /dev/null 2>&1; then
    echo -e "${BLUE}🏃 ECS Service Status:${NC}"
    
    # Get service details
    SERVICE_INFO=$(aws ecs describe-services \
        --cluster $CLUSTER_NAME \
        --services $SERVICE_NAME \
        --query 'services[0].[serviceName,status,runningCount,pendingCount,desiredCount]' \
        --output text 2>/dev/null)
    
    if [ ! -z "$SERVICE_INFO" ]; then
        echo "Service Name: $(echo $SERVICE_INFO | cut -d' ' -f1)"
        echo "Status: $(echo $SERVICE_INFO | cut -d' ' -f2)"
        echo "Running Tasks: $(echo $SERVICE_INFO | cut -d' ' -f3)"
        echo "Pending Tasks: $(echo $SERVICE_INFO | cut -d' ' -f4)"
        echo "Desired Tasks: $(echo $SERVICE_INFO | cut -d' ' -f5)"
        
        # Get task details
        echo ""
        echo -e "${BLUE}📋 Recent Tasks:${NC}"
        aws ecs list-tasks \
            --cluster $CLUSTER_NAME \
            --service-name $SERVICE_NAME \
            --query 'taskArns[0:3]' \
            --output table 2>/dev/null
    fi
fi

echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo -e "${BLUE}📊 CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#logsV2:log-groups/log-group/\$252Fecs\$252F${STACK_FULL_NAME}${NC}"
echo -e "${BLUE}🗂️  ECS Console: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/${CLUSTER_NAME}${NC}"
echo -e "${BLUE}⚡ CloudFormation: https://console.aws.amazon.com/cloudformation/home?region=${AWS_REGION}#/stacks/stackinfo?stackId=${STACK_FULL_NAME}${NC}"
echo ""

echo -e "${YELLOW}💡 To view logs in real-time: aws logs tail /ecs/${STACK_FULL_NAME} --follow${NC}" 