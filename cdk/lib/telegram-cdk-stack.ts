import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegration from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import { Construct } from 'constructs';
import * as path from 'path';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

   // DynamoDB Table
   const table = new dynamodb.Table(this, 'WasteCollectionBotTable', {
    partitionKey: { name: 'chatId', type: dynamodb.AttributeType.NUMBER },
    billingMode: dynamodb.BillingMode.PROVISIONED,
    readCapacity: 1,
    writeCapacity: 1,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });

  // Lambda Function
  const botFunction = new lambda.Function(this, 'WasteCollectionBotFunction', {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'lambda.handler',
    code: lambda.Code.fromAsset(path.join(__dirname, '../../dist/lambdas')),
    environment: {
      TABLE_NAME: table.tableName,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
      SECRET_TOKEN: process.env.SECRET_TOKEN || '',
    },
  });

  // Grant DynamoDB permissions to Lambda
  table.grantReadWriteData(botFunction);

  // API Gateway
  const api = new apigateway.HttpApi(this, 'WasteCollectionBotApi');

  const lambdaIntegration = new apigatewayIntegration.HttpLambdaIntegration('WasteCollectionBotIntegration', botFunction);

  api.addRoutes({
    path: '/bot',
    methods: [apigateway.HttpMethod.POST],
    integration: lambdaIntegration,
  });

  // AWS Scheduler
  const schedulerRole = new iam.Role(this, 'WasteCollectionBotSchedulerRole', {
    assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
  });

  botFunction.grantInvoke(schedulerRole);

  const schedule = new scheduler.CfnSchedule(this, 'WasteCollectionBotSchedule', {
    flexibleTimeWindow: {
      mode: 'FLEXIBLE',
      maximumWindowInMinutes: 15,
    },
    scheduleExpression: 'cron(0 19 * * ? *)',
    scheduleExpressionTimezone: 'Europe/Berlin',
    target: {
      arn: botFunction.functionArn,
      roleArn: schedulerRole.roleArn,
      input: JSON.stringify({ isCron: true }),
      retryPolicy: {
        maximumEventAgeInSeconds: 3600, // 1 hour
        maximumRetryAttempts: 1,
      },
    },
  });

  // Output the API URL
  new cdk.CfnOutput(this, 'WasteCollectionBotApiUrl', {
    value: api.url!,
    description: 'API Gateway URL',
  });
  }
}
