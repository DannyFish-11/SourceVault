#!/usr/bin/env node
import { initializeDatabase } from './index.js';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Create .sourcevault directory if it doesn't exist
const vaultDir = join(process.cwd(), '.sourcevault');
try {
  mkdirSync(vaultDir, { recursive: true });
  console.log('Created .sourcevault directory');
} catch (error) {
  console.log('.sourcevault directory already exists');
}

// Initialize database
initializeDatabase();
