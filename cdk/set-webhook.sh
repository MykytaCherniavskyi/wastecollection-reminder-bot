#!/bin/bash

# Load environment variables
source .env

# Check if required variables are set
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$SECRET_TOKEN" ]; then
    echo "Error: TELEGRAM_BOT_TOKEN or SECRET_TOKEN is not set. Please run configure.sh first."
    exit 1
fi

# Ask for API Gateway URL
# Get the API Gateway URL from CDK output
read -p "Enter your API Gateway URL (check your console after 'cdk deploy'): " api_url

if [ -z "$api_url" ]; then
    echo "Error: Failed to retrieve API Gateway URL. Make sure you have deployed the CDK stack."
    exit 1
fi

# Set the webhook
webhook_url="${api_url}bot"
response=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$webhook_url\", \"drop_pending_updates\": true, \"secret_token\": \"$SECRET_TOKEN\"}")

# Check the response
if [[ $response == *"\"ok\":true"* ]]; then
    echo "Webhook set successfully!"
else
    echo "Failed to set webhook. Response:"
    echo "$response"
fi