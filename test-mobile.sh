#!/bin/bash

# Get local IP address for mobile testing
echo "🌐 GEMS ERP - Mobile Testing Setup"
echo "=================================="
echo ""

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

if [ -z "$LOCAL_IP" ]; then
  echo "❌ Could not find local IP address"
  echo "Make sure you're connected to WiFi"
  exit 1
fi

echo "✅ Local IP: $LOCAL_IP"
echo ""
echo "📱 Test on mobile devices:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "🔗 Test URLs:"
echo "   Landing:    http://$LOCAL_IP:3000"
echo "   Login:      http://$LOCAL_IP:3000/login"
echo "   Dashboard:  http://$LOCAL_IP:3000/dashboard"
echo "   Storefront: http://$LOCAL_IP:3000/store/gems-store"
echo ""
echo "⚠️  Make sure:"
echo "   1. Your phone is on the same WiFi network"
echo "   2. Dev server is running (npm run dev)"
echo "   3. Firewall allows port 3000"
echo ""
