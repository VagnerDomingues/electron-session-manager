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

async function buildSingleApp(appName, packageJsonFile, configFile) {
    const packageJsonPath = 'package.json';
    const envPath = '.env';
    const platform = 'win';
    
    try {
        console.log(`🚀 Building ${appName.toUpperCase()}...`);
        console.log(`📋 Using package.json: ${packageJsonFile}`);
        console.log(`🔧 Using config: ${configFile}`);
        
        // Backup current files
        if (fs.existsSync(packageJsonPath)) {
            fs.copyFileSync(packageJsonPath, 'temp.package.json.backup');
        }
        if (fs.existsSync(envPath)) {
            fs.copyFileSync(envPath, 'temp.env.backup');
        }
        
        // Copy the app-specific package.json
        const sourcePackageJsonPath = path.join('configs', packageJsonFile);
        fs.copyFileSync(sourcePackageJsonPath, packageJsonPath);
        console.log(`📄 Copied ${packageJsonFile} to package.json`);
        
        // Copy ONLY the app-specific config (no merging)
        const configPath = path.join('configs', configFile);
        const appConfig = fs.readFileSync(configPath, 'utf8');
        fs.writeFileSync(envPath, appConfig);
        console.log(`🔧 Created clean .env with only app config`);
        
        // Verify the configuration
        console.log(`\n📋 Current configuration:`);
        const envConfig = parseEnvConfig(envPath);
        console.log(`   APP_NAME: ${envConfig.APP_NAME}`);
        console.log(`   APP_DESCRIPTION: ${envConfig.APP_DESCRIPTION}`);
        console.log(`   APP_URL: ${envConfig.APP_URL}`);
        console.log(`   WIN_ICON: ${envConfig.WIN_ICON}\n`);
        
        // Build the app
        console.log(`🔨 Building ${appName} for ${platform}...`);
        execSync(`node scripts/build.js ${platform}`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        // Fix metadata immediately after build
        console.log(`🔧 Fixing Windows executable metadata...`);
        const exePath = getExecutablePath(appName, platform);
        
        if (exePath && fs.existsSync(exePath)) {
            const { fixExecutableMetadata } = require('./fix-metadata.js');
            
            const appName_display = envConfig.APP_NAME || appName.charAt(0).toUpperCase() + appName.slice(1);
            const appDescription = envConfig.APP_DESCRIPTION || `${appName_display} Application`;
            const iconPath = envConfig.WIN_ICON || `assets/Appicons/${appName_display}.ico`;
            
            console.log(`📋 Applying metadata:`);
            console.log(`   Product Name: ${appName_display}`);
            console.log(`   Description: ${appDescription}`);
            console.log(`   Icon: ${iconPath}`);
            console.log(`   Executable: ${exePath}`);
            
            // Wait a bit for file handles to be released
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await fixExecutableMetadata(
                exePath,
                appName_display,
                appDescription,
                'PWA Desktop',
                iconPath
            );
            console.log(`✅ Metadata fixed successfully!`);
        } else {
            console.log(`⚠️ Executable not found: ${exePath}`);
        }
        
        console.log(`✅ ${appName.toUpperCase()} built successfully!`);
        
    } catch (error) {
        console.error(`❌ Error building ${appName}:`, error.message);
    } finally {
        // Restore original files
        if (fs.existsSync('temp.package.json.backup')) {
            fs.copyFileSync('temp.package.json.backup', packageJsonPath);
            fs.unlinkSync('temp.package.json.backup');
        }
        if (fs.existsSync('temp.env.backup')) {
            fs.copyFileSync('temp.env.backup', envPath);
            fs.unlinkSync('temp.env.backup');
        }
    }
}

// Build Discord as a test
buildSingleApp('discord', 'discord.package.json', 'discord.env');
