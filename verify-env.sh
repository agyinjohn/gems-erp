#!/bin/bash

echo "🔍 GEMS Frontend - Environment Check"
echo "====================================="
echo ""

# Check if .env.production exists
if [ -f ".env.production" ]; then
  echo "✅ .env.production exists"
  echo "   Content:"
  cat .env.production | grep NEXT_PUBLIC_API_URL
else
  echo "❌ .env.production NOT FOUND"
  echo "   Creating it now..."
  echo "NEXT_PUBLIC_API_URL=https://gems-backend-2tsz.onrender.com/api" > .env.production
  echo "NEXT_PUBLIC_APP_NAME=GEMS - GTHINK Enterprise Management System" >> .env.production
  echo "✅ Created .env.production"
fi

echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
  echo "✅ .env.local exists (for local dev)"
  echo "   Content:"
  cat .env.local | grep NEXT_PUBLIC_API_URL
else
  echo "⚠️  .env.local not found (optional for local dev)"
fi

echo ""

# Check .gitignore
if grep -q "!.env.production" .gitignore; then
  echo "✅ .gitignore allows .env.production"
else
  echo "⚠️  .gitignore might block .env.production"
fi

echo ""

# Test build
echo "🔨 Testing production build..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed - check for errors"
  exit 1
fi

echo ""
echo "✅ All checks passed!"
echo ""
echo "📝 Next steps:"
echo "   1. git add .env.production"
echo "   2. git commit -m 'Add production config'"
echo "   3. git push"
echo "   4. Deploy to your platform"
echo ""
