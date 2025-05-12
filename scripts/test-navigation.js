#!/usr/bin/env node

/**
 * Navigation Testing Script
 * 
 * This script tests the navigation paths in the application to verify
 * that they are accessible and don't throw authentication errors.
 */

const { execSync } = require('child_process');
const http = require('http');
const url = require('url');

// Public routes that should work without auth
const publicRoutes = [
  '/env-check',
  '/minimal-test',
  '/manual-test',
  '/setup',
  '/login'
];

// Routes that require authentication
const authRoutes = [
  '/dashboard'
];

// Main test function
async function runTests() {
  console.log('🧪 Starting Navigation Tests');
  console.log('===========================');

  // Step 1: Get the current server port
  const port = getServerPort();
  if (!port) {
    console.error('❌ No server running! Please start the application with "npm run dev" first');
    process.exit(1);
  }
  console.log(`✅ Server detected on port ${port}`);

  // Step 2: Test public routes
  console.log('\n🔍 Testing Public Routes (should not require auth):');
  for (const route of publicRoutes) {
    await testRoute(port, route, false);
  }

  // Step 3: Test auth routes (these will redirect, but shouldn't crash)
  console.log('\n🔒 Testing Auth Routes (should handle auth gracefully):');
  for (const route of authRoutes) {
    await testRoute(port, route, true);
  }

  console.log('\n✨ All tests completed!');
}

// Get the development server port from running processes
function getServerPort() {
  try {
    // This command will find the port the Next.js dev server is running on
    const output = execSync('lsof -i -P | grep node | grep LISTEN').toString();
    const matches = output.match(/:(\d+) \(LISTEN\)/);
    return matches && matches[1] ? matches[1] : null;
  } catch (err) {
    return null;
  }
}

// Test a specific route
async function testRoute(port, route, requiresAuth) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: route,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      const { statusCode } = res;
      
      if (requiresAuth && [301, 302, 303, 307, 308].includes(statusCode)) {
        console.log(`✅ ${route} - Redirects as expected for auth route (${statusCode})`);
        resolve(true);
        return;
      }
      
      if (statusCode === 200) {
        console.log(`✅ ${route} - Loads successfully`);
        resolve(true);
      } else {
        console.log(`❌ ${route} - Failed with status ${statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error(`❌ ${route} - ${error.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.error(`❌ ${route} - Request timed out`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Run the tests
runTests(); 