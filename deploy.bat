@echo off
REM Novel Reader EPUB - Quick Deployment Script (Windows)
REM Choose your deployment method and follow the prompts

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║     Novel Reader EPUB - Deployment Configuration          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo Select deployment method:
echo 1) Vercel (Recommended - Easiest)
echo 2) Docker (Self-hosted)
echo 3) AWS (Enterprise)
echo 4) Manual
echo.
set /p deployment_choice="Enter choice (1-4): "

if "%deployment_choice%"=="1" (
    echo.
    echo 🚀 Setting up Vercel deployment...
    echo.
    
    REM Check if Vercel CLI is installed
    where vercel >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Installing Vercel CLI...
        npm install -g vercel
    )
    
    REM Login to Vercel
    echo Logging in to Vercel...
    call vercel login
    
    REM Set environment variables
    echo.
    echo Setting environment variables...
    call vercel env add DATABASE_URL "postgresql://user:password@host:5432/novelreader"
    call vercel env add NEXTAUTH_SECRET
    call vercel env add NEXTAUTH_URL "https://your-domain.com"
    call vercel env add GITHUB_ID ""
    call vercel env add GITHUB_SECRET ""
    call vercel env add GOOGLE_ID ""
    call vercel env add GOOGLE_SECRET ""
    
    REM Deploy
    echo.
    echo Deploying to Vercel...
    call vercel --prod
    
    echo.
    echo ✅ Deployment complete!
    echo Visit your Vercel dashboard to configure your domain
    
) else if "%deployment_choice%"=="2" (
    echo.
    echo 🐳 Setting up Docker deployment...
    echo.
    
    REM Check if Docker is installed
    where docker >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Docker not installed. Please install Docker Desktop for Windows first.
        exit /b 1
    )
    
    REM Copy and edit environment file
    if not exist .env.production.local (
        echo Creating .env.production.local...
        copy .env.docker .env.production.local
        echo 📝 Edit .env.production.local with your configuration
        pause
    )
    
    REM Build and run Docker
    echo.
    echo Building Docker image...
    docker-compose build
    
    echo.
    echo Starting containers...
    docker-compose up -d
    
    echo.
    echo ✅ Deployment complete!
    echo Your app is running at http://localhost:3000
    echo.
    echo View logs with: docker-compose logs -f
    echo Stop with: docker-compose down
    
) else if "%deployment_choice%"=="3" (
    echo.
    echo ☁️  Setting up AWS deployment...
    echo.
    echo AWS deployment requires more setup. Please follow the manual steps:
    echo.
    echo 1. Create RDS PostgreSQL instance
    echo 2. Create ECS cluster
    echo 3. Create ALB and target groups
    echo 4. Configure CloudFront CDN
    echo 5. Set up Route 53 DNS
    echo.
    echo For detailed instructions, see: DEPLOYMENT.md
    
) else if "%deployment_choice%"=="4" (
    echo.
    echo 📖 Manual Deployment Steps:
    echo.
    echo 1. Review PRODUCTION_CHECKLIST.md
    echo 2. Choose deployment option:
    echo    - Vercel: See DEPLOYMENT.md (Part 2A)
    echo    - Docker: See DEPLOYMENT.md (Part 2B)
    echo    - AWS: See DEPLOYMENT.md (Part 2C)
    echo 3. Configure environment variables
    echo 4. Run pre-launch tests
    echo 5. Deploy!
    echo.
    echo Documentation:
    echo   - DEPLOYMENT.md - Complete deployment guide
    echo   - FEATURE_IMPLEMENTATION.md - Feature guides
    echo   - PRODUCTION_CHECKLIST.md - Pre-launch checklist
    
) else (
    echo.
    echo ❌ Invalid choice
    exit /b 1
)

echo.
echo 📚 Documentation:
echo   - PHASE5_COMPLETE.md - Phase 5 summary
echo   - DEPLOYMENT.md - Detailed deployment guide
echo   - PRODUCTION_CHECKLIST.md - Launch checklist
echo   - FEATURE_IMPLEMENTATION.md - Feature guides
echo.
echo Happy deploying! 🚀
echo.
pause
