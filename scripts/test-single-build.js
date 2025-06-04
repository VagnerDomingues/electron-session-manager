#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to parse .env file and extract variables
function parseEnvConfig(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const config = {};
    
    content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            config[key.trim()] = valueParts.join('=').trim();
        }
    });
    
    return config;
}

// Helper function to dynamically get executable path
function getExecutablePath(appName, platform) {
    if (platform === 'win') {
        const executableNames = {
            'asana': 'Asana.exe',
            'chatgpt': 'ChatGPT.exe',
            'discord': 'Discord.exe',
            'notion': 'Notion.exe',
            'whatsappweb': 'WhatsApp.exe'
        };
        
        const executableName = executableNames[appName] || `${appName.charAt(0).toUpperCase() + appName.slice(1)}.exe`;
        return `dist/${appName}/win-unpacked/${executableName}`;
    }
    return null;
}

async function buildSingleAppTest() {
    const appName = 'discord';
    const packageJsonFile = 'discord.package.json';
    const configFile = 'discord.env';
    const platform = 'win';
    
    const packageJsonPath = 'package.json';
    const envPath = '.env';
    
    try {
        console.log(`🚀 Building ${appName.toUpperCase()} for testing...`);
        
        // Copy the app-specific package.json to main package.json
        const sourcePackageJsonPath = path.join('configs', packageJsonFile);
        fs.copyFileSync(sourcePackageJsonPath, packageJsonPath);
        console.log(`📄 Copied ${packageJsonFile} to package.json`);
        
        // Copy the app-specific config to .env
        const configPath = path.join('configs', configFile);
        const appConfig = fs.readFileSync(configPath, 'utf8');
        fs.writeFileSync(envPath, appConfig);
        console.log(`🔧 Created .env with app config`);
        
        // Run the build
        console.log(`🔨 Building ${appName} for ${platform}...`);
        execSync(`node scripts/build.js ${platform}`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        // Fix Windows executable metadata
        console.log(`🔧 Fixing Windows executable metadata for ${appName}...`);
        
        // Parse the app-specific .env config
        const envConfig = parseEnvConfig(configPath);
        
        // Get executable path dynamically
        const exePath = getExecutablePath(appName, platform);
        
        if (exePath && fs.existsSync(exePath)) {
            const { fixExecutableMetadata } = require('./fix-metadata.js');
            
            // Use values from .env configuration
            const appName_display = envConfig.APP_NAME || appName.charAt(0).toUpperCase() + appName.slice(1);
            const appDescription = envConfig.APP_DESCRIPTION || `${appName_display} Application`;
            const iconPath = envConfig.WIN_ICON || `assets/Appicons/${appName_display}.ico`;
            
            console.log(`📋 App Name: ${appName_display}`);
            console.log(`📋 Description: ${appDescription}`);
            console.log(`📋 Icon: ${iconPath}`);
            console.log(`📋 Executable: ${exePath}`);
            
            // Wait for file handles to be released
            console.log(`⏳ Waiting 3 seconds for file handles to be released...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await fixExecutableMetadata(
                exePath,
                appName_display,
                appDescription,
                'PWA Desktop',
                iconPath
            );
            console.log(`✅ Metadata fixed for ${appName_display}`);
        } else {
            console.log(`⚠️ Executable not found: ${exePath}`);
        }
        
        console.log(`✅ ${appName.toUpperCase()} built and metadata fixed successfully!`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

buildSingleAppTest();
