// Temporary script to run prisma migration with environment variables loaded.
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');

try {
  // Load environment variables from .env.local
  dotenv.config({ path: path.resolve(__dirname, '.env.local') });
  
  console.log('Successfully loaded .env.local. Running Prisma migration...');
  
  // Execute the prisma migrate dev command
  const result = execSync('npx prisma migrate dev --name enhanced_analysis', { stdio: 'inherit' });
  
  console.log('Prisma migration completed successfully.');
} catch (error) {
  console.error('An error occurred during migration:', error);
  process.exit(1);
}
