#!/bin/bash

# Function to validate input
validate_input() {
    if [ -z "$1" ]; then
        echo "Error: Input cannot be empty."
        exit 1
    fi
}

# Ask for CDK_DEFAULT_ACCOUNT
read -p "Enter your AWS account number: " cdk_account
validate_input "$cdk_account"

# Store CDK_DEFAULT_ACCOUNT in .env file
echo "CDK_DEFAULT_ACCOUNT=$cdk_account" > .env

# Ask for CDK_DEFAULT_REGION
read -p "Enter your AWS region: " cdk_region
validate_input "$cdk_region"

# Store CDK_DEFAULT_REGION in .env file
echo "CDK_DEFAULT_REGION=$cdk_region" >> .env

# Ask for Telegram Bot Token
read -p "Enter your Telegram Bot Token: " bot_token
validate_input "$bot_token"

# Store Bot Token in .env file
echo "TELEGRAM_BOT_TOKEN=$bot_token" >> .env

# Ask if user wants to create a hash for secret_token
read -p "Do you want to create a hash for secret_token? (y/n): " create_hash

if [[ $create_hash == "y" || $create_hash == "Y" ]]; then
    # Generate a random hash
    secret_token=$(openssl rand -hex 32)
    echo "SECRET_TOKEN=$secret_token" >> .env
    echo "secret_token has been generated and stored in .env file."
else
    echo "No new secret_token generated."
fi

echo "Configuration complete. Values stored in .env file."