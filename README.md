# Sportify Backend Lambda

AWS Lambda backend for the Sportify application, built with Express.js and serverless architecture.

## Features

- **Serverless**: Runs on AWS Lambda for automatic scaling and cost efficiency
- **Express.js**: RESTful API with familiar Express.js framework
- **MongoDB**: Database integration with Mongoose ODM
- **CORS**: Configured for frontend domains
- **Auto-deployment**: GitHub Actions CI/CD pipeline

## API Endpoints

- `GET /api/players` - Get all players
- `POST /api/players` - Create a new player
- `PATCH /api/players/:id` - Update a player
- `DELETE /api/players/:id` - Delete a player

## Automatic Deployment

This project uses GitHub Actions for automatic deployment to AWS Lambda. Every push to the `master` branch triggers:

1. **Build Process**: Installs dependencies and creates deployment package
2. **Lambda Deployment**: Updates the Lambda function code
3. **API Gateway**: Creates/updates API Gateway configuration
4. **Environment Variables**: Updates Lambda environment configuration

## Required GitHub Secrets

Before the first deployment, set up these secrets in your GitHub repository:

### AWS Configuration
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCOUNT_ID` - Your 12-digit AWS account ID
- `AWS_LAMBDA_ROLE_ARN` - IAM role ARN for Lambda execution

### Application Configuration
- `MONGO_URI` - MongoDB connection string

## AWS Setup

### 1. Create IAM Role for Lambda

```bash
# Create trust policy file
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name sportify-lambda-role \
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name sportify-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 2. Create IAM User for GitHub Actions

```bash
# Create policy for GitHub Actions
cat > github-actions-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:*",
        "apigateway:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name SportifyGitHubActionsPolicy \
  --policy-document file://github-actions-policy.json

# Create user and attach policy
aws iam create-user --user-name sportify-github-actions
aws iam attach-user-policy \
  --user-name sportify-github-actions \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/SportifyGitHubActionsPolicy

# Create access keys
aws iam create-access-key --user-name sportify-github-actions
```

## Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm start

# Run database seeder
npm run seed
```

## Environment Variables

Create a `.env` file for local development:

```env
MONGO_URI=mongodb://localhost:27017/sportify
PORT=5000
```

## Project Structure

```
├── lambda.js              # Lambda handler
├── server.js              # Express app configuration
├── package.json           # Dependencies and scripts
├── models/
│   └── Player.js          # Mongoose player model
├── routes/
│   └── playerRoutes.js    # API routes
└── .github/
    └── workflows/
        └── deploy-lambda.yml  # GitHub Actions workflow
```

## Deployment Status

Check the "Actions" tab in your GitHub repository to monitor deployment status. The workflow will:

- ✅ Install dependencies
- ✅ Create deployment package
- ✅ Deploy to AWS Lambda
- ✅ Configure API Gateway
- ✅ Output API endpoint URL

## API Usage

After deployment, your API will be available at:
```
https://API_ID.execute-api.REGION.amazonaws.com/prod/api/players
```

Example requests:
```bash
# Get all players
curl https://API_ID.execute-api.REGION.amazonaws.com/prod/api/players

# Create a player
curl -X POST https://API_ID.execute-api.REGION.amazonaws.com/prod/api/players \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","nationality":"Sweden"}'
```