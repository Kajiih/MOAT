import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Manually load .env.local for integration tests if not already loaded by the environment.
 * Next.js usually does this, but for standalone vitest runs it might be needed.
 */
export function loadIntegrationEnv() {
  const envPath = join(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^#\s][^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    if (process.env.HARDCOVER_TOKEN) {
      console.log('HARDCOVER_TOKEN loaded successfully');
    } else {
      console.warn('HARDCOVER_TOKEN not found after loading .env.local');
    }
  }
}
