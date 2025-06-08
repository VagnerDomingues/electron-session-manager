#!/usr/bin/env node

// Function to reload environment variables from .env file
function reloadEnv() {
  // Clear existing dotenv cache
  const dotenvPath = require.resolve('dotenv');
  delete require.cache[dotenvPath];
  
  // Clear any cached .env file
  const envPath = require('path').resolve('.env');
  if (require.cache[envPath]) {
    delete require.cache[envPath];
  }
  
  // Reload dotenv with override to replace existing env vars
  require('dotenv').config({ override: true });
  
  console.log(`🔄 Environment reloaded`);
}

// Initial load of environment variables
reloadEnv();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Set environment variables for electron-builder
process.env.CSC_IDENTITY_AUTO_DISCOVERY = process.env.SKIP_CODE_SIGNING === 'true' ? 'false' : 'true';

if (process.env.WIN_CERTIFICATE_FILE) {
  process.env.WIN_CSC_LINK = process.env.WIN_CERTIFICATE_FILE;
}
if (process.env.WIN_CERTIFICATE_PASSWORD) {
  process.env.WIN_CSC_KEY_PASSWORD = process.env.WIN_CERTIFICATE_PASSWORD;
}

if (process.env.MAC_CERTIFICATE_FILE) {
  process.env.CSC_LINK = process.env.MAC_CERTIFICATE_FILE;
}
if (process.env.MAC_CERTIFICATE_PASSWORD) {
  process.env.CSC_KEY_PASSWORD = process.env.MAC_CERTIFICATE_PASSWORD;
}

// Apple notarization
if (process.env.MAC_NOTARIZE_APPLE_ID) {
  process.env.APPLE_ID = process.env.MAC_NOTARIZE_APPLE_ID;
}
if (process.env.MAC_NOTARIZE_APPLE_ID_PASSWORD) {
  process.env.APPLE_ID_PASSWORD = process.env.MAC_NOTARIZE_APPLE_ID_PASSWORD;
}
if (process.env.MAC_NOTARIZE_TEAM_ID) {
  process.env.APPLE_TEAM_ID = process.env.MAC_NOTARIZE_TEAM_ID;
}

// Parse command line arguments
const args = process.argv.slice(2);
const platform = args[0] || 'win';
const arch = args[1] || 'x64';
let target = args[2] || process.env[`${platform.toUpperCase()}_TARGET`];

console.log(`Building for ${platform}-${arch}...`);

// Read the package.json (which should already be configured for the specific app)
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Make sure you are running this from the build-all-examples script.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log(`📦 Building ${packageJson.build.productName || packageJson.name}...`);
console.log(`📁 Output directory: ${packageJson.build.directories?.output || 'dist'}`);

// Backup and modify package.json temporarily without permanently changing it
let originalPackageJsonContent = null;

if (!target) {
  console.log(`🎯 Configuring build targets for ${arch} architecture only...`);
  
  // Backup the original package.json content
  originalPackageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
  
  // Create a deep copy and modify the architecture settings
  const modifiedPackageJson = JSON.parse(JSON.stringify(packageJson));
  
  // Update macOS targets
  if (modifiedPackageJson.build.mac && modifiedPackageJson.build.mac.target) {
    modifiedPackageJson.build.mac.target.forEach(targetConfig => {
      if (targetConfig.arch) {
        targetConfig.arch = [arch];
      }
    });
  }
  
  // Update Windows targets  
  if (modifiedPackageJson.build.win && modifiedPackageJson.build.win.target) {
    modifiedPackageJson.build.win.target.forEach(targetConfig => {
      if (targetConfig.arch) {
        targetConfig.arch = [arch];
      }
    });
  }
  
  // Update Linux targets
  if (modifiedPackageJson.build.linux && modifiedPackageJson.build.linux.target) {
    modifiedPackageJson.build.linux.target.forEach(targetConfig => {
      if (targetConfig.arch) {
        targetConfig.arch = [arch];
      }
    });
  }
  
  // Temporarily write the modified package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(modifiedPackageJson, null, 2));
  console.log(`📝 Temporarily modified package.json for ${arch} architecture only`);
}

try {
  // Build command - use standard package.json (which is temporarily modified)
  let buildCmd = `npx electron-builder --${platform} --${arch}`;
  
  // Only add target config if explicitly specified
  if (target) {
    buildCmd += ` --config.target=${target}`;
    console.log(`🎯 Using explicit target: ${target}`);
  } else {
    console.log(`🎯 Using temporarily modified package.json for ${arch} architecture only`);
  }
  
  execSync(buildCmd, {
    stdio: 'inherit',
    env: process.env
  });
  console.log(`✅ Build completed successfully for ${platform}-${arch}!`);
} catch (error) {
  console.error(`❌ Build failed for ${platform}-${arch}:`, error.message);
  process.exit(1);
} finally {
  // Restore the original package.json content
  if (originalPackageJsonContent) {
    fs.writeFileSync(packageJsonPath, originalPackageJsonContent);
    console.log(`🔄 Restored original package.json`);
  }
}
