# Pharmacy Chain Server

## MongoDB Connection Timeout Fix

The server has been updated with production-ready MongoDB connection handling to resolve the "buffering timed out" error.

### Key Changes Made:

1. **Enhanced MongoDB Connection Options:**

   - `serverSelectionTimeoutMS: 30000` - 30 second server selection timeout
   - `socketTimeoutMS: 45000` - 45 second socket timeout
   - `connectTimeoutMS: 30000` - 30 second connection timeout
   - `bufferCommands: false` - Disabled mongoose buffering (prevents timeout errors)
   - `bufferMaxEntries: 0` - Disabled mongoose buffering

2. **Connection Event Listeners:**

   - Proper error handling and logging
   - Graceful shutdown handling

3. **Global Error Handler:**

   - Catches and handles database connection errors
   - Returns appropriate HTTP status codes

4. **Health Check Endpoint:**
   - `/api/health` - Monitor database connection status

### Environment Variables Required:

Create a `.env` file in the server directory with:

```bash
# MongoDB Connection String
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
```

### For Production Deployment:

1. **MongoDB Atlas (Recommended):**

   - Use MongoDB Atlas connection string
   - Ensure IP whitelist includes your deployment server
   - Use strong authentication

2. **Connection String Format:**

   ```
   mongodb+srv://username:password@cluster.mongodb.net/pharmacy-chain?retryWrites=true&w=majority
   ```

3. **Vercel Deployment:**
   - Set environment variables in Vercel dashboard
   - Ensure `MONGO_URI` is properly configured
   - The `vercel.json` is already configured

### Testing Connection:

1. **Health Check:**

   ```
   GET /api/health
   ```

2. **Expected Response:**
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "database": {
       "status": "connected",
       "readyState": 1
     },
     "uptime": 123.456
   }
   ```

### Common Issues and Solutions:

1. **"buffering timed out" Error:**

   - Check MongoDB connection string
   - Verify network connectivity
   - Check IP whitelist (MongoDB Atlas)

2. **Connection Refused:**

   - Verify MongoDB service is running
   - Check firewall settings
   - Verify connection string format

3. **Authentication Failed:**
   - Check username/password
   - Verify database user permissions
   - Check authentication database

### Monitoring:

- Check server logs for connection events
- Use health check endpoint for status monitoring
- Monitor MongoDB Atlas metrics (if using Atlas)
