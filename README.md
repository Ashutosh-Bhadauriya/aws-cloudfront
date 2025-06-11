# Next.js App with AuthSignal and AWS CloudFront

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

This project demonstrates how to integrate AuthSignal for multi-factor authentication with a Next.js application using AWS CloudFront and Lambda@Edge.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The login credentials are:
- **Email**: `test@example.com`
- **Password**: `password`

## Deployment

This project is designed to be deployed to AWS. The following sections outline the steps to deploy the Next.js application, the Lambda@Edge functions, and configure CloudFront.

### 1. Deploying the Next.js App

You can deploy the Next.js application to any hosting provider that supports Node.js, such as Vercel, AWS Amplify, or a custom server. After deploying, you will get a URL for your application origin (e.g., `https://<your-app-origin>.com`).

### 2. Building the Lambda Functions

Navigate to the `lambda` directory and install the dependencies:

```bash
cd lambda
pnpm install
```

Then, build the TypeScript files:

```bash
pnpm run build
```

This will compile the TypeScript files into the `dist` directory. You will need to create a zip archive for each of the three JavaScript files (`viewer-request.js`, `origin-response.js`, `origin-request.js`) in the `dist` directory. For example, `viewer-request.js` should be zipped into `viewer-request.zip`.

### 3. Deploying the Lambda Functions

For each of the three functions, create a new AWS Lambda function with the following settings:
- **Runtime**: Node.js 20.x or later
- **Architecture**: x86_64

The handler for each function will be:
- `viewer-request.handler`
- `origin-response.handler`
- `origin-request.handler`

Upload the corresponding zip file for each function.

After creating the functions, you need to deploy them to Lambda@Edge. Open each function, go to the **Actions** menu, and select **Deploy to Lambda@Edge**.

### 4. Configuring CloudFront

Create a new CloudFront distribution with the following settings:
- **Origin Domain**: The URL of your deployed Next.js application.
- **Viewer Protocol Policy**: Redirect HTTP to HTTPS.

Configure the cache behaviors to trigger the Lambda@Edge functions:

- **Viewer Request**:
  - **Path Pattern**: `/api/login`
  - **Function ARN**: The ARN of your `viewer-request` Lambda function.
  - **Event Type**: Viewer Request

- **Origin Response**:
  - **Path Pattern**: `/api/login`
  - **Function ARN**: The ARN of your `origin-response` Lambda function.
  - **Event Type**: Origin Response

- **Origin Request (for MFA callback)**:
  - **Path Pattern**: `/api/mfa-callback`
  - **Function ARN**: The ARN of your `origin-request` Lambda function.
  - **Event Type**: Origin Request

### 5. Environment Variables

You will need to set the following environment variables in your Lambda functions:

- `ENCRYPTION_SECRET`: A long, random string used to encrypt cookies.
- `AUTH_SIGNAL_API_KEY`: Your AuthSignal API key.

For the Next.js application, you will also need to set:
- `JWT_SECRET`: A secret key for signing JWTs.

### 6. Final Steps

After configuring CloudFront, it will provide you with a new domain name (e.g., `d123.cloudfront.net`). Use this domain to access your application.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
