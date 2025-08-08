# Hostinger Deployment Guide for Maggie Bible Q&A App

## Prerequisites

1. **Hostinger Account** with Node.js hosting support
2. **OpenAI API Key** (required for biblical responses)
3. **Optional**: ElevenLabs API Key for premium Faith voice
4. **Optional**: Azure Speech Service for child voice fallback

## Step 1: Prepare Your Environment

### 1.1 Create Environment File
Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual API keys:
```
OPENAI_API_KEY=sk-your-openai-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here
AZURE_SPEECH_KEY=your-azure-key-here
AZURE_SPEECH_REGION=eastus
NODE_ENV=production
PORT=3000
```

### 1.2 Build the Application
```bash
npm install
npm run build:hostinger
```

## Step 2: Upload to Hostinger

### 2.1 File Structure for Upload
Upload these files/folders to your Hostinger account:

```
public_html/
├── index.html (from dist/public/)
├── assets/ (from dist/public/assets/)
├── dist/
│   └── index.js (server bundle)
├── node_modules/ (upload after npm install on server)
├── package.json
├── .env (with your API keys)
└── shared/ (schema files)
```

### 2.2 Upload Methods

**Option A: File Manager**
1. Log into Hostinger control panel
2. Open File Manager
3. Navigate to `public_html`
4. Upload the built files

**Option B: FTP/SFTP**
1. Use FileZilla or similar FTP client
2. Connect to your Hostinger FTP
3. Upload files to `public_html` directory

**Option C: Git (if supported)**
1. Push code to GitHub repository
2. Clone on Hostinger server
3. Run build commands on server

## Step 3: Server Configuration

### 3.1 Node.js Setup on Hostinger

1. **Enable Node.js** in Hostinger control panel
2. **Set Node.js version** to 18+ (recommended)
3. **Set startup file** to `dist/index.js`
4. **Set environment** to `production`

### 3.2 Install Dependencies on Server

SSH into your Hostinger server and run:
```bash
cd public_html
npm install --production
```

### 3.3 Environment Variables in Hostinger

In Hostinger control panel:
1. Go to **Node.js** section
2. Add environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ELEVENLABS_API_KEY`: Your ElevenLabs key (optional)
   - `AZURE_SPEECH_KEY`: Your Azure key (optional)
   - `NODE_ENV`: production
   - `PORT`: 3000 (or as assigned by Hostinger)

## Step 4: Database Setup (Optional)

### 4.1 If Using External Database
Add to environment variables:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### 4.2 If Using In-Memory Storage
The app will automatically use in-memory storage if no database URL is provided.

## Step 5: Start the Application

### 5.1 Through Hostinger Control Panel
1. Go to **Node.js** section
2. Click **Start Application**
3. Monitor logs for any errors

### 5.2 Through SSH (if available)
```bash
cd public_html
npm start
```

## Step 6: Domain Configuration

### 6.1 Custom Domain
1. Point your domain to Hostinger servers
2. Update DNS records as needed
3. Enable SSL certificate in Hostinger panel

### 6.2 Subdomain Setup
1. Create subdomain in Hostinger panel
2. Point to your Node.js application
3. Test the application URL

## Step 7: Testing

### 7.1 Basic Functionality Test
1. Visit your domain/subdomain
2. Ask a biblical question
3. Verify AI response works
4. Test voice features (if API keys provided)

### 7.2 Voice Features Test
1. Test microphone input
2. Test Azure Sara voice output
3. Test ElevenLabs Faith voice (if configured)

## Troubleshooting

### Common Issues

**1. "Cannot find module" errors**
- Run `npm install` on the server
- Check that all dependencies are installed

**2. API key errors**
- Verify environment variables are set correctly
- Check API key validity and quotas

**3. Voice features not working**
- Ensure HTTPS is enabled (required for microphone)
- Check browser compatibility
- Verify API keys for voice services

**4. Port conflicts**
- Check Hostinger's assigned port
- Update PORT environment variable accordingly

**5. File permission errors**
- Set proper file permissions (755 for directories, 644 for files)
- Ensure Node.js has read/write access

### Performance Optimization

1. **Enable gzip compression** in Hostinger panel
2. **Use CDN** for static assets if available
3. **Monitor resource usage** in Hostinger dashboard
4. **Optimize API calls** by caching responses when possible

### Security Considerations

1. **Never commit `.env` file** to version control
2. **Use HTTPS** for all API communications
3. **Regularly rotate API keys**
4. **Monitor API usage** to prevent quota abuse
5. **Set up proper CORS** if needed

## Support

- **Hostinger Support**: For hosting-related issues
- **OpenAI Documentation**: For API-related questions
- **Application Logs**: Check Hostinger Node.js logs for errors

## Backup Strategy

1. **Regular backups** of your application files
2. **Database backups** if using external database
3. **Environment variable backup** (securely stored)
4. **API key documentation** for recovery

---

Your Maggie Bible Q&A app should now be successfully deployed on Hostinger! 🎉