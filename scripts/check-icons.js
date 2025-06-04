#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔍 Icon Configuration Check\n');

console.log('📁 Current Environment Variables:');
console.log(`   WIN_ICON: ${process.env.WIN_ICON}`);
console.log(`   MAC_ICON: ${process.env.MAC_ICON}`);

console.log('\n📂 Icon File Status:');

// Check if the icon files exist
const iconFiles = [
  process.env.WIN_ICON,
  process.env.MAC_ICON,
  'assets/icon.ico',
  'assets/icon.png'
];

iconFiles.forEach(iconFile => {
  if (iconFile) {
    const fullPath = path.join(__dirname, '..', iconFile);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`   ✅ ${iconFile} - Found (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.log(`   ❌ ${iconFile} - Not found`);
    }
  }
});

console.log('\n🎨 Available App Icons:');
const appIconsDir = path.join(__dirname, '..', 'assets', 'Appicons');
if (fs.existsSync(appIconsDir)) {
  const icons = fs.readdirSync(appIconsDir);
  icons.forEach(icon => {
    const iconPath = path.join(appIconsDir, icon);
    const stats = fs.statSync(iconPath);
    console.log(`   📱 ${icon} (${Math.round(stats.size / 1024)}KB)`);
  });
}

console.log('\n💡 Current configuration is using:');
console.log(`   Windows: ${process.env.WIN_ICON || 'default (assets/icon.ico)'}`);
console.log(`   macOS: ${process.env.MAC_ICON || 'default (assets/icon.png)'}`);
