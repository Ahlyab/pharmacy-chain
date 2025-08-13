# Environment Configuration Setup

This project now supports different API URLs for development and production environments.

## Setup

1. **Create environment files** (copy from `env.example`):

   - `.env.development` - for development environment
   - `.env.production` - for production environment

2. **Update the API URLs** in each file:
   - Development: `VITE_API_URL=http://localhost:5000`
   - Production: `VITE_API_URL=https://your-actual-production-api.com`

## Usage

### Development Mode

```bash
npm run dev
# or
yarn dev
```

This will use the development environment configuration.

### Production Mode

```bash
npm run prod
# or
yarn prod
```

This will use the production environment configuration.

### Building

```bash
# Build for production
npm run build

# Build for development
npm run build:dev
```

## How It Works

- The `src/config/env.ts` file automatically detects the current environment
- API calls in `AuthContext` and other components use `config.apiUrl`
- Environment variables are loaded by Vite based on the mode
- No more hardcoded URLs in your code!

## Important Notes

- **Never commit** `.env.development` or `.env.production` files to version control
- Update the production API URL in `.env.production` before deploying
- The `env.example` file serves as a template for your environment files
