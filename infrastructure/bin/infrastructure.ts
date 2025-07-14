#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

// Get environment variables
const stackName = app.node.tryGetContext('stackName') || 'NextjsAuthSignal';
const environment = app.node.tryGetContext('environment') || 'dev';

// Create the stack with environment-specific configuration
new InfrastructureStack(app, `${stackName}-${environment}`, {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },

  // Environment variables for the container
  environmentVariables: {
    JWT_SECRET: process.env.JWT_SECRET || 'your-secure-jwt-secret-change-in-production',
    ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || 'your-secure-encryption-secret-change-in-production',
    AUTH_SIGNAL_API_KEY: process.env.AUTH_SIGNAL_API_KEY || '',
    NODE_ENV: 'production',
  },
  
  // Configuration based on environment
  desiredCount: environment === 'prod' ? 3 : 2,
  cpu: environment === 'prod' ? 1024 : 512,
  memoryLimitMiB: environment === 'prod' ? 2048 : 1024,
  enableLogging: true,
  
  tags: {
    Environment: environment,
    Project: 'NextjsAuthSignal',
    ManagedBy: 'CDK',
  },
});