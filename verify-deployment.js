#!/usr/bin/env node

/**
 * Novel Reader EPUB - Pre-Deployment Verification Script
 * Run this before deploying to ensure everything is ready
 * 
 * Usage: node verify-deployment.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      log(`✅ ${description}`, 'green');
      return true;
    } else {
      log(`❌ ${description} - File not found: ${filePath}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - Error: ${error.message}`, 'red');
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(`⏳ Checking ${description}...`, 'cyan');
    execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
    log(`✅ ${description}`, 'green');
    return true;
  } catch (err) {
    log(`❌ ${description}`, 'red');
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.log(err.stderr);
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║   Novel Reader EPUB - Deployment Verification             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // 1. Check Node.js and npm versions
  log('📦 Environment Checks:', 'blue');
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    log(`✅ Node.js ${nodeVersion}`, 'green');
    log(`✅ npm ${npmVersion}`, 'green');
    passed += 2;
  } catch (error) {
    log('❌ Node.js or npm not installed', 'red');
    failed += 2;
  }

  // 2. Check critical files
  log('\n📁 Critical Files:', 'blue');
  const criticalFiles = [
    { path: 'package.json', desc: 'Package configuration' },
    { path: 'tsconfig.json', desc: 'TypeScript configuration' },
    { path: 'next.config.ts', desc: 'Next.js configuration' },
    { path: 'prisma/schema.prisma', desc: 'Prisma schema' },
    { path: '.env.example', desc: 'Environment template' },
    { path: 'Dockerfile', desc: 'Docker configuration' },
    { path: 'docker-compose.yml', desc: 'Docker Compose configuration' },
  ];

  criticalFiles.forEach(({ path: filePath, desc }) => {
    if (checkFile(filePath, desc)) {
      passed++;
    } else {
      failed++;
    }
  });

  // 3. Check dependencies
  log('\n📚 Dependencies:', 'blue');
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    );
    
    const requiredDeps = {
      'next': 'Next.js',
      'react': 'React',
      'prisma': 'Prisma',
      'next-auth': 'NextAuth',
      'typescript': 'TypeScript',
    };

    Object.entries(requiredDeps).forEach(([pkg, name]) => {
      if (
        packageJson.dependencies?.[pkg] ||
        packageJson.devDependencies?.[pkg]
      ) {
        const version = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg];
        log(`✅ ${name} ${version}`, 'green');
        passed++;
      } else {
        log(`❌ ${name} not found in package.json`, 'red');
        failed++;
      }
    });
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    failed++;
  }

  // 4. Check documentation files
  log('\n📖 Documentation:', 'blue');
  const docFiles = [
    { path: 'DEPLOYMENT.md', desc: 'Deployment guide' },
    { path: 'FEATURE_IMPLEMENTATION.md', desc: 'Feature implementation guide' },
    { path: 'PRODUCTION_CHECKLIST.md', desc: 'Production checklist' },
    { path: 'PHASE5_COMPLETE.md', desc: 'Phase 5 summary' },
    { path: 'QUICK_START_DEPLOYMENT.md', desc: 'Quick start guide' },
  ];

  docFiles.forEach(({ path: filePath, desc }) => {
    if (checkFile(filePath, desc)) {
      passed++;
    } else {
      failed++;
    }
  });

  // 5. Check build
  log('\n🔨 Build Check:', 'blue');
  if (runCommand('npm run build', 'Production build')) {
    passed++;
  } else {
    failed++;
  }

  // 6. Check tests
  log('\n🧪 Test Check:', 'blue');
  if (runCommand('npm test -- --passWithNoTests 2>&1', 'Running tests')) {
    passed++;
  } else {
    log('⚠️  Tests failed or unavailable', 'yellow');
    failed++;
  }

  // 7. Check environment
  log('\n🔐 Environment Check:', 'blue');
  const envFiles = ['.env.local', '.env.production.local', '.env.docker'];
  let hasEnv = false;
  envFiles.forEach(envFile => {
    if (checkFile(envFile, `Environment file: ${envFile}`)) {
      hasEnv = true;
      passed++;
    } else {
      log(`⚠️  Optional: ${envFile} not found (you'll need to create it)`, 'yellow');
    }
  });

  if (!hasEnv) {
    log('⚠️  No environment files found - create .env.production.local before deploying', 'yellow');
  }

  // 8. Check Prisma
  log('\n💾 Database Check:', 'blue');
  if (checkFile('.prisma/client', 'Prisma Client generated')) {
    passed++;
  } else {
    log('⚠️  Prisma Client not generated - run: npx prisma generate', 'yellow');
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                  Verification Summary                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  const total = passed + failed;
  const percentage = Math.round((passed / total) * 100);
  
  log(`\n📊 Overall Score: ${percentage}% (${passed}/${total})`, percentage === 100 ? 'green' : 'yellow');

  if (percentage === 100) {
    log('\n🎉 All checks passed! Ready for deployment!\n', 'green');
    process.exit(0);
  } else if (percentage >= 80) {
    log('\n⚠️  Some checks failed. Review the errors above and retry.\n', 'yellow');
    process.exit(1);
  } else {
    log('\n❌ Critical checks failed. Fix the errors above before deploying.\n', 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ Verification script error: ${error.message}`, 'red');
  process.exit(1);
});
