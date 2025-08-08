#!/bin/bash

# Hostinger Deployment Script for Maggie Bible Q&A App
# Run this script to prepare your app for Hostinger deployment

echo "🚀 Preparing Maggie Bible Q&A App for Hostinger deployment..."

# Check if required files exist
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create deployment directory
echo "📁 Creating deployment directory..."
mkdir -p hostinger-deploy
mkdir -p hostinger-deploy/public_html

# Copy built files
echo "📋 Copying built files..."
cp -r dist/public/* hostinger-deploy/public_html/ 2>/dev/null || true
cp -r dist/index.js hostinger-deploy/public_html/
cp package.json hostinger-deploy/public_html/
cp -r shared hostinger-deploy/public_html/ 2>/dev/null || true

# Copy environment template
if [ ! -f ".env" ]; then
    echo "📝 Creating environment template..."
    cp .env.example hostinger-deploy/public_html/.env
    echo "⚠️  Please edit hostinger-deploy/public_html/.env with your API keys"
else
    cp .env hostinger-deploy/public_html/
    echo "✅ Environment file copied"
fi

# Create package.json for production
echo "📦 Creating production package.json..."
cat > hostinger-deploy/public_html/package-production.json << 'EOF'
{
  "name": "maggie-bible-qa-hostinger",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@google-cloud/text-to-speech": "^6.2.0",
    "@neondatabase/serverless": "^0.10.4",
    "connect-pg-simple": "^10.0.0",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "elevenlabs": "^1.59.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "memorystore": "^1.6.7",
    "microsoft-cognitiveservices-speech-sdk": "^1.45.0",
    "openai": "^5.9.0",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  }
}
EOF

# Create deployment instructions
echo "📋 Creating deployment instructions..."
cat > hostinger-deploy/DEPLOYMENT-INSTRUCTIONS.txt << 'EOF'
HOSTINGER DEPLOYMENT INSTRUCTIONS
=================================

1. Upload Contents:
   - Upload everything in the 'public_html' folder to your Hostinger public_html directory

2. Install Dependencies:
   - SSH into your Hostinger server
   - Navigate to public_html directory
   - Run: npm install --production

3. Environment Setup:
   - Edit .env file with your API keys:
     * OPENAI_API_KEY (required)
     * AZURE_SPEECH_KEY (optional)

4. Hostinger Configuration:
   - Enable Node.js in control panel
   - Set startup file to: index.js
   - Set Node.js version to 18+
   - Add environment variables in control panel

5. Start Application:
   - Click "Start Application" in Hostinger Node.js section
   - Or run: npm start via SSH

6. Test:
   - Visit your domain
   - Test biblical Q&A functionality
   - Test voice features

For detailed instructions, see hostinger-setup.md
EOF

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📁 Files ready in: hostinger-deploy/public_html/"
echo "📋 Instructions: hostinger-deploy/DEPLOYMENT-INSTRUCTIONS.txt"
echo ""
echo "Next steps:"
echo "1. Edit hostinger-deploy/public_html/.env with your API keys"
echo "2. Upload hostinger-deploy/public_html/* to your Hostinger account"
echo "3. Follow the deployment instructions"
echo ""
echo "🎉 Your Maggie Bible Q&A app is ready for Hostinger!"