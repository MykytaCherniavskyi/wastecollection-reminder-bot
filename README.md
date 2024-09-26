
# WasteCollection Bot Reminder

This project implements a **WasteCollection bot reminder** using serverless architecture on AWS. It allows users to get reminders via a Telegram bot, with the infrastructure managed using AWS services such as Lambda, API Gateway, DynamoDB, and EventBridge Scheduler. The project infrastructure is written using **TypeScript AWS CDK**.

![Project Architecture](https://github.com/user-attachments/assets/7a994f37-80de-4482-bca3-4ec3197fd922)


## Project Overview

The above diagram showcases the flow of the WasteCollection bot:
1. The **User** interacts with the bot via **Telegram**.
2. **Telegram Bot API** sends the user's request to an **HTTP API Gateway**.
3. The **API Gateway** triggers an AWS **Lambda function**, which processes the logic.
4. **DynamoDB** stores user data such as reminder schedules.
5. **EventBridge Scheduler** triggers the reminders based on the stored schedules, invoking the Lambda function to notify users via Telegram.

## Prerequisites

- Ensure that you have the **AWS CLI** installed and configured to access your AWS account.
- Install **Node.js** and **npm** if they aren't already installed.
- Install **AWS CDK** globally via npm if you haven't already:
  ```bash
  npm install -g aws-cdk
  ```

## Deployment Steps

Follow these steps to successfully deploy the WasteCollection Bot Reminder:

1. Install all required packages:
   ```bash
   npm install
   ```

2. Build the production-ready code:
   ```bash
   npm run build-prod
   ```

3. Navigate to the `cdk` folder inside the project to proceed with AWS CDK-related steps.

4. (Optional) If this is your first time deploying AWS CloudFormation resources in your AWS account, you will need to bootstrap the environment:
   ```bash
   cdk bootstrap
   ```

5. Run the `configuration.sh` bash script to configure necessary settings:
   ```bash
   bash configuration.sh
   ```

6. Build the CDK project:
   ```bash
   npm run build
   ```

7. Deploy the infrastructure using AWS CDK:
   ```bash
   cdk deploy
   ```

8. Set up the Telegram webhook by running the `set-webhook.sh` script:
   ```bash
   bash set-webhook.sh
   ```

Once deployed, the bot will be able to send waste collection reminders to users at scheduled times based on the data stored in DynamoDB and the EventBridge Scheduler triggers.

## Notes

- Ensure your AWS CLI has the necessary permissions to deploy the resources.
- After deploying, make sure to test the bot interaction through Telegram to verify the reminders are working correctly.
