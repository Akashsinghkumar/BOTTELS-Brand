# BOTTELS App - Render Deployment Guide

## Prerequisites
- GitHub account with your repository pushed
- MongoDB Atlas account (for free tier database)
- Google Sheets integration credentials (if using)
- Render account

## Step-by-Step Deployment

### 1. Prepare MongoDB
- Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/bottels?retryWrites=true&w=majority`

### 2. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 3. Create Render Service
1. Go to [render.com](https://render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `bottels-app` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Pro for production)

### 4. Set Environment Variables on Render
In the Render dashboard, add these environment variables:

```
PORT=10000
NODE_ENV=production
MONGO_URI=<your_mongodb_connection_string>
GOOGLE_SHEETS_ID=<your_sheets_id>
GOOGLE_SERVICE_ACCOUNT_JSON=<your_service_account_json>
```

### 5. Deploy
- Click "Deploy" and wait for the deployment to complete
- Your app will be available at: `https://bottels-app.onrender.com`

## Troubleshooting

### Build Fails
- Check that `client/package.json` exists with proper dependencies
- Ensure `npm run build` works locally: `cd client && npm run build`

### Database Connection Issues
- Verify MongoDB connection string is correct
- Add Render's IP to MongoDB Atlas IP whitelist (or allow all IPs for development)

### Static Files Not Loading
- Verify `public/dashboard/index.html` exists after build
- Check that vite.config.js has correct output directory

### Port Issues
- Render assigns dynamic ports; use `process.env.PORT`
- Your server already does this correctly

## Monitoring

View logs on Render:
- Go to your service dashboard
- Click "Logs" tab to see real-time logs

## Database Management

To view/manage MongoDB data:
1. Go to MongoDB Atlas
2. Use MongoDB Compass or the web interface
3. Or use `mongosh` CLI for remote connections

## Future Deployments

Every push to your main branch will automatically redeploy (if auto-deploy is enabled).

To manually redeploy:
- Click "Manual Deploy" on Render dashboard
- Or push a commit to trigger auto-deployment
