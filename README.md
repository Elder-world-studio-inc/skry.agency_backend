# Skry Ad Cam - SAAS Backend

This is the high-performance Express/TypeScript backend for the Skry.agency Ad Cam module.

## Features
- **AI Ad Analysis**: Integrated with OpenAI GPT-4o for creative insights.
- **Secure Auth**: JWT-based authentication with bcrypt password hashing.
- **Object Storage**: S3-compatible storage integration (Hostinger/AWS).
- **PostgreSQL**: Dedicated schema-based database architecture.

## Deployment
This backend can be deployed via standard Node.js hosting or Docker.

### Option 1: Docker (Recommended for VPS)
This repository includes a `Dockerfile` and `docker-compose.yml` for easy deployment on Hostinger's Docker Manager or any VPS.

1. **Upload files**: Push this repository to GitHub.
2. **Hostinger Docker Manager**:
   - Choose "Create Container".
   - Link this GitHub repository.
   - Set the environment variables in the Hostinger panel.
   - The container will automatically build and start on port 4000.

### Option 2: Standard Node.js Hosting
1. **GitHub Integration**: Connect your Hostinger Node.js app to this repository.
2. **Build Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
3. **Environment Variables**:
   Set the following in the Hostinger panel:
   - `SKRY_DATABASE_URL`: Your PostgreSQL connection string.
   - `SKRY_JWT_SECRET`: A secure random string for JWT tokens.
   - `OPENAI_API_KEY`: Your OpenAI API key.
   - `HOSTINGER_STORAGE_ENDPOINT`: S3 endpoint.
   - `HOSTINGER_STORAGE_BUCKET`: S3 bucket name.
   - `HOSTINGER_STORAGE_ACCESS_KEY`: S3 access key.
   - `HOSTINGER_STORAGE_SECRET_KEY`: S3 secret key.
   - `NODE_ENV`: `production`

## Tech Stack
- Node.js & TypeScript
- Express.js
- PostgreSQL (pg)
- OpenAI API
- JWT & Bcrypt
- Swagger (API Documentation)
