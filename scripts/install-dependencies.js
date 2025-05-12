#!/usr/bin/env node

/**
 * Migration Dependencies Installer
 * 
 * This script installs the dependencies needed for data migration.
 * 
 * Usage:
 * node scripts/install-dependencies.js
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('Installing Node.js dependencies...');
    execSync('npm install dotenv @supabase/supabase-js --save-dev', { stdio: 'inherit' });
    
    console.log('\nChecking Python installation...');
    try {
      const pythonVersion = execSync('python --version', { encoding: 'utf-8' });
      console.log(`Python detected: ${pythonVersion.trim()}`);
    } catch (error) {
      console.error('Python not found. Please install Python before continuing.');
      return;
    }
    
    const installPythonDeps = await askQuestion('\nInstall Python dependencies (requires pip)? (y/n): ');
    if (installPythonDeps.toLowerCase() === 'y') {
      try {
        console.log('Installing Python dependencies...');
        execSync('pip install python-dotenv supabase', { stdio: 'inherit' });
        console.log('Python dependencies installed successfully.');
      } catch (error) {
        console.error('Failed to install Python dependencies:', error.message);
      }
    }
    
    console.log('\nAll required dependencies have been installed.');
    console.log('You can now run the migration script with:');
    console.log('  node scripts/migrate-data.js');
    
  } catch (error) {
    console.error('Installation failed:', error.message);
  } finally {
    rl.close();
  }
}

main(); 