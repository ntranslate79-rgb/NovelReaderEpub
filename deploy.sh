#!/bin/bash

# Novel Reader EPUB - Quick Deployment Script
# Choose your deployment method and follow the prompts

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Novel Reader EPUB - Deployment Configuration          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Ask user which deployment method
echo "Select deployment method:"
echo "1) Vercel (Recommended - Easiest)"
echo "2) Docker (Self-hosted)"
echo "3) AWS (Enterprise)"
echo "4) Manual"
echo ""
read -p "Enter choice (1-4): " deployment_choice

case $deployment_choice in
  1)
    echo "🚀 Setting up Vercel deployment..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
      echo "Installing Vercel CLI..."
      npm install -g vercel
    fi
    
    # Login to Vercel
    echo "Logging in to Vercel..."
    vercel login
    
    # Set environment variables
    echo "Setting environment variables..."
    vercel env add DATABASE_URL "postgresql://user:password@host:5432/novelreader"
    vercel env add NEXTAUTH_SECRET "$(openssl rand -base64 32)"
    vercel env add NEXTAUTH_URL "https://your-domain.com"
    vercel env add GITHUB_ID ""
    vercel env add GITHUB_SECRET ""
    vercel env add GOOGLE_ID ""
    vercel env add GOOGLE_SECRET ""
    
    # Deploy
    echo "Deploying to Vercel..."
    vercel --prod
    
    echo "✅ Deployment complete!"
    echo "Visit your Vercel dashboard to configure your domain"
    ;;
    
  2)
    echo "🐳 Setting up Docker deployment..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
      echo "❌ Docker not installed. Please install Docker first."
      exit 1
    fi
    
    # Copy and edit environment file
    if [ ! -f .env.production.local ]; then
      echo "Creating .env.production.local..."
      cp .env.docker .env.production.local
      echo "📝 Edit .env.production.local with your configuration"
      read -p "Press Enter when ready..."
    fi
    
    # Build and run Docker
    echo "Building Docker image..."
    docker-compose build
    
    echo "Starting containers..."
    docker-compose up -d
    
    echo "✅ Deployment complete!"
    echo "Your app is running at http://localhost:3000"
    echo ""
    echo "View logs with: docker-compose logs -f"
    echo "Stop with: docker-compose down"
    ;;
    
  3)
    echo "☁️  Setting up AWS deployment..."
    echo ""
    echo "AWS deployment requires more setup. Please follow the manual steps:"
    echo ""
    echo "1. Create RDS PostgreSQL instance"
    echo "2. Create ECS cluster"
    echo "3. Create ALB and target groups"
    echo "4. Configure CloudFront CDN"
    echo "5. Set up Route 53 DNS"
    echo ""
    echo "For detailed instructions, see: DEPLOYMENT.md"
    ;;
    
  4)
    echo "📖 Manual Deployment Steps:"
    echo ""
    echo "1. Review PRODUCTION_CHECKLIST.md"
    echo "2. Choose deployment option:"
    echo "   - Vercel: See DEPLOYMENT.md (Part 2A)"
    echo "   - Docker: See DEPLOYMENT.md (Part 2B)"
    echo "   - AWS: See DEPLOYMENT.md (Part 2C)"
    echo "3. Configure environment variables"
    echo "4. Run pre-launch tests"
    echo "5. Deploy!"
    echo ""
    echo "Documentation:"
    echo "  - DEPLOYMENT.md - Complete deployment guide"
    echo "  - FEATURE_IMPLEMENTATION.md - Feature guides"
    echo "  - PRODUCTION_CHECKLIST.md - Pre-launch checklist"
    ;;
    
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "📚 Documentation:"
echo "  - PHASE5_COMPLETE.md - Phase 5 summary"
echo "  - DEPLOYMENT.md - Detailed deployment guide"
echo "  - PRODUCTION_CHECKLIST.md - Launch checklist"
echo "  - FEATURE_IMPLEMENTATION.md - Feature guides"
echo ""
echo "Happy deploying! 🚀"
