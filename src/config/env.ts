interface EnvironmentConfig {
  apiUrl: string;
  environment: string;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  // Check if we're in development mode by checking the MODE environment variable
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (isDevelopment) {
    return {
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      environment: 'development'
    };
  } else {
    return {
      apiUrl: import.meta.env.VITE_API_URL || 'https://your-production-api.com',
      environment: 'production'
    };
  }
};

export const config = getEnvironmentConfig();
export default config; 