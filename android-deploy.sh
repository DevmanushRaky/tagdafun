#!/bin/bash

# Tagda Fun - Simple Android Deploy Script
# Run this script to create Android bundle for Google Play Store

echo "🎲 Tagda Fun - Android Deploy"
echo "============================="
echo

# Check if eas is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
    if ! command -v eas &> /dev/null; then
        echo "❌ Failed to install EAS CLI"
        exit 1
    fi
fi

# Check if we're in the right directory
if [ ! -f "app.json" ]; then
    echo "❌ app.json not found. Run this script from project root."
    exit 1
fi

# Create eas.json if it doesn't exist
if [ ! -f "eas.json" ]; then
    echo "📝 Creating EAS configuration..."
    eas build:configure
fi

echo "🚀 Building Android bundle for Google Play Store..."
echo "This will take 5-10 minutes..."
echo

# Build the Android bundle
eas build --platform android --profile production

if [ $? -eq 0 ]; then
    echo
    echo "🎉 Build completed successfully!"
    echo
    echo "📱 Next steps:"
    echo "1. Download the .aab file from the URL above"
    echo "2. Go to Google Play Console"
    echo "3. Upload the .aab file to Production track"
    echo "4. Submit for review"
    echo
    echo "📋 App Details:"
    echo "Package: com.tagdafun.app"
    echo "Version: 1.0.0"
else
    echo
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi

echo "✨ Done!" 