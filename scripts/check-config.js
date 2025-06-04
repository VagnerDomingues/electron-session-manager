#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log(`🔍 ${process.env.APP_NAME || 'Electron PWA Boilerplate'} - Environment Configuration Check\n`);

// Application Configuration
console.log('📱 Application Configuration:');
console.log(`   App Name: ${process.env.APP_NAME}`);
console.log(`   Version: ${process.env.APP_VERSION}`);
console.log(`   App ID: ${process.env.APP_ID}`);
console.log(`   Author: ${process.env.APP_AUTHOR}\n`);

// Build Configuration
console.log('🔧 Build Configuration:');
console.log(`   Output Directory: ${process.env.BUILD_OUTPUT_DIR}`);
console.log(`   Force Code Signing: ${process.env.FORCE_CODE_SIGNING}`);
console.log(`   Skip Code Signing: ${process.env.SKIP_CODE_SIGNING}\n`);

// Windows Configuration
console.log('🪟 Windows Configuration:');
console.log(`   Icon: ${process.env.WIN_ICON}`);
console.log(`   Target: ${process.env.WIN_TARGET}`);
console.log(`   Certificate File: ${process.env.WIN_CERTIFICATE_FILE || 'Not set'}`);
console.log(`   Certificate Password: ${process.env.WIN_CERTIFICATE_PASSWORD ? '***' : 'Not set'}\n`);

// macOS Configuration
console.log('🍎 macOS Configuration:');
console.log(`   Icon: ${process.env.MAC_ICON}`);
console.log(`   Target: ${process.env.MAC_TARGET}`);
console.log(`   Certificate Name: ${process.env.MAC_CERTIFICATE_NAME || 'Not set'}`);
console.log(`   Notarize: ${process.env.MAC_NOTARIZE}`);
console.log(`   Apple ID: ${process.env.MAC_NOTARIZE_APPLE_ID || 'Not set'}\n`);

// Web Application Configuration
console.log('🌐 Web Application Configuration:');
console.log(`   URL: ${process.env.APP_URL}`);
console.log(`   User Agent: ${process.env.USER_AGENT.substring(0, 50)}...\n`);

// Window Configuration
console.log('🖼️ Window Configuration:');
console.log(`   Size: ${process.env.WINDOW_WIDTH}x${process.env.WINDOW_HEIGHT}`);
console.log(`   Min Size: ${process.env.WINDOW_MIN_WIDTH}x${process.env.WINDOW_MIN_HEIGHT}\n`);

// File Checks
console.log('📁 File Checks:');
const iconFiles = [
  process.env.WIN_ICON,
  process.env.MAC_ICON
];

iconFiles.forEach(iconPath => {
  if (iconPath && fs.existsSync(iconPath)) {
    console.log(`   ✅ ${iconPath} - Found`);
  } else if (iconPath) {
    console.log(`   ❌ ${iconPath} - Missing`);
  }
});

// Certificate Checks
console.log('\n🔐 Certificate Status:');
if (process.env.SKIP_CODE_SIGNING === 'true') {
  console.log('   ⚠️  Code signing is disabled');
} else {
  if (process.env.WIN_CERTIFICATE_FILE) {
    const winCertExists = fs.existsSync(process.env.WIN_CERTIFICATE_FILE);
    console.log(`   ${winCertExists ? '✅' : '❌'} Windows Certificate: ${process.env.WIN_CERTIFICATE_FILE}`);
  } else {
    console.log('   ⚠️  Windows certificate not configured');
  }
  
  if (process.env.MAC_CERTIFICATE_NAME) {
    console.log(`   ⚠️  macOS Certificate: ${process.env.MAC_CERTIFICATE_NAME} (requires macOS to verify)`);
  } else {
    console.log('   ⚠️  macOS certificate not configured');
  }
}

console.log('\n✅ Configuration check complete!');
console.log('\n💡 Tips:');
console.log('   - To build: npm run build:win or npm run build:mac');
console.log('   - To test: npm start');
console.log('   - To customize: edit .env file');
console.log('   - For code signing: add certificate paths and passwords to .env');
