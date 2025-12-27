#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  const env = { ...process.env };

  if (!env.DATABASE_URL) {
    console.log('DATABASE_URL not set — using fallback sqlite URL for prisma generate.');
    env.DATABASE_URL = 'file:./dev.db';
  }

  console.log('Running `npx prisma generate`...');
  execSync('npx prisma generate', { stdio: 'inherit', env });
  console.log('Prisma generate completed.');
} catch (err) {
  console.error('Prisma generate failed:', err);
  process.exit(1);
}
