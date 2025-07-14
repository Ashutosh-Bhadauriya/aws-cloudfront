#!/bin/bash

# Destroy Next.js ECS Infrastructure
# Usage: ./scripts/destroy.sh [environment] [stack-name]

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

echo -e "${RED}🗑️  Destroying Next.js AuthSignal ECS infrastructure${NC}"
echo -e "${RED}Environment: ${ENVIRONMENT}${NC}"
echo -e "${RED}Stack Name: ${STACK_FULL_NAME}${NC}"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will permanently delete all resources for this stack.${NC}"
echo -e "${YELLOW}This action cannot be undone!${NC}"
echo ""
read -p "Are you sure you want to continue? Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}🚫 Destruction cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}🔄 Starting destruction process...${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run 'aws configure' first.${NC}"
    exit 1
fi

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name $STACK_FULL_NAME > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Stack '${STACK_FULL_NAME}' does not exist or has already been deleted.${NC}"
    exit 0
fi

# Change to infrastructure directory
cd infrastructure

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing CDK dependencies...${NC}"
    npm install
fi

# Destroy the stack
echo -e "${YELLOW}🗑️  Destroying CDK stack...${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cdk destroy \
    --context environment=$ENVIRONMENT \
    --context stackName=$STACK_NAME \
    --force

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Stack destroyed successfully!${NC}"
    echo -e "${BLUE}All AWS resources have been cleaned up.${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Destruction failed${NC}"
    echo -e "${YELLOW}You may need to manually clean up some resources in the AWS console.${NC}"
    exit 1
fi 