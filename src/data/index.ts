import { config } from '../config/env';

// Use the environment configuration for API URLs
export const VITE_BASE_URL = `${config.apiUrl}/api`;
export const VITE_BASE_URL_VERCEL = 'https://pharmacy-chain-2-8lqo.vercel.app/api';
export const VITE_IS_VERCEL = false;