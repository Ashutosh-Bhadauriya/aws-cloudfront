#!/bin/bash

echo "=== Getting Load Balancer Information ==="
echo ""

echo "1. Checking AWS CLI..."
aws --version
echo ""

echo "2. Checking AWS Identity..."
aws sts get-caller-identity
echo ""

echo "3. Getting Load Balancers..."
aws elbv2 describe-load-balancers
echo ""

echo "4. Getting CloudFormation Stack Outputs..."
aws cloudformation describe-stacks --stack-name NextjsAuthSignal-dev
echo "" 