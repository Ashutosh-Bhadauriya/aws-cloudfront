import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { ApplicationProtocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

export interface NextjsEcsStackProps extends cdk.StackProps {
  /**
   * The environment variables to pass to the container
   */
  environmentVariables?: { [key: string]: string };
  
  /**
   * The number of desired tasks to run
   */
  desiredCount?: number;
  
  /**
   * CPU units for the task (256, 512, 1024, 2048, 4096)
   */
  cpu?: number;
  
  /**
   * Memory in MiB for the task (512, 1024, 2048, 3072, 4096, 5120, 6144, 7168, 8192)
   */
  memoryLimitMiB?: number;
  
  /**
   * Whether to enable container logging
   */
  enableLogging?: boolean;
}

export class InfrastructureStack extends cdk.Stack {
  public readonly service: ApplicationLoadBalancedFargateService;
  public readonly loadBalancerUrl: string;

  constructor(scope: Construct, id: string, props?: NextjsEcsStackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets across 2 AZs
    const vpc = new ec2.Vpc(this, `${id}-vpc`, {
      vpcName: `${id}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1, // One NAT gateway for cost optimization
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, `${id}-cluster`, {
      clusterName: `${id}-cluster`,
      vpc,
      containerInsights: true, // Enable CloudWatch Container Insights
    });

    // Create log group for container logs
    const logGroup = new logs.LogGroup(this, `${id}-log-group`, {
      logGroupName: `/ecs/${id}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Environment variables for the container
    const environment = {
      NODE_ENV: 'production',
      PORT: '3000',
      JWT_SECRET: props?.environmentVariables?.JWT_SECRET || 'your-jwt-secret-here',
      ...props?.environmentVariables,
    };

    // Create Fargate service with Application Load Balancer
    this.service = new ApplicationLoadBalancedFargateService(this, `${id}-fargate`, {
      serviceName: `${id}-service`,
      cluster,
      cpu: props?.cpu || 512,
      memoryLimitMiB: props?.memoryLimitMiB || 1024,
      desiredCount: props?.desiredCount || 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('..', {
          file: 'Dockerfile',
          platform: Platform.LINUX_AMD64,
        }),
        containerName: `${id}-container`,
        containerPort: 3000,
        environment,
        logDriver: props?.enableLogging !== false ? ecs.LogDrivers.awsLogs({
          streamPrefix: 'nextjs',
          logGroup,
        }) : undefined,
      },
      protocol: ApplicationProtocol.HTTP, 
      publicLoadBalancer: true,
      // Use private subnets for tasks (more secure)
      taskSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      // ALB will be in public subnets
      platformVersion: ecs.FargatePlatformVersion.LATEST,
    });

    // Configure health check
    this.service.targetGroup.configureHealthCheck({
      path: '/',
      healthyHttpCodes: '200,302', // Accept both 200 and redirect responses
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(10),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 5,
    });

    // Configure auto scaling
    const scaling = this.service.service.autoScaleTaskCount({
      minCapacity: props?.desiredCount || 2,
      maxCapacity: 10,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    scaling.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
    });

    // Store the load balancer URL
    this.loadBalancerUrl = `http://${this.service.loadBalancer.loadBalancerDnsName}`;

    // Output the load balancer URL
    new cdk.CfnOutput(this, `${id}-url`, {
      value: this.loadBalancerUrl,
      description: 'Load Balancer URL',
      exportName: `${id}-LoadBalancerUrl`,
    });

    // Output the service ARN
    new cdk.CfnOutput(this, `${id}-service-arn`, {
      value: this.service.service.serviceArn,
      description: 'ECS Service ARN',
      exportName: `${id}-ServiceArn`,
    });

    // Output the cluster name
    new cdk.CfnOutput(this, `${id}-cluster-name`, {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `${id}-ClusterName`,
    });
  }
}
