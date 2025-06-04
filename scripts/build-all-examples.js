#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of all example configurations to build
const examples = [
    { name: 'asana', packageJson: 'asana.package.json', configFile: 'asana.env' },
    { name: 'chatgpt', packageJson: 'chatgpt.package.json', configFile: 'chatgpt.env' },
    { name: 'discord', packageJson: 'discord.package.json', configFile: 'discord.env' },
    { name: 'notion', packageJson: 'notion.package.json', configFile: 'notion.env' },
    { name: 'whatsappweb', packageJson: 'whatsappweb.package.json', configFile: 'whatsappweb.env' }
];

// Get platform from command line arguments
const platform = process.argv[2] || 'win'; // Default to Windows
const validPlatforms = ['win', 'mac', 'linux'];

if (!validPlatforms.includes(platform)) {
    console.error(`❌ Invalid platform: ${platform}`);
    console.log(`Valid platforms: ${validPlatforms.join(', ')}`);
    process.exit(1);
}

console.log(`🚀 Building all PWA examples for ${platform.toUpperCase()}...`);
console.log(`📦 Found ${examples.length} example configurations\n`);

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
        // For most apps, the executable name matches the app name with proper capitalization
        const executableNames = {
            'asana': 'Asana.exe',
            'chatgpt': 'ChatGPT.exe',
            'discord': 'Discord.exe',
            'notion': 'Notion.exe',
            'whatsappweb': 'WhatsApp.exe'  // Special case for WhatsApp
        };
        
        const executableName = executableNames[appName] || `${appName.charAt(0).toUpperCase() + appName.slice(1)}.exe`;
        return `dist/${appName}/win-unpacked/${executableName}`;
    }
    // Add other platforms as needed
    return null;
}

// Main async function
(async function main() {
    try {
        // Backup current package.json and .env if they exist
        const packageJsonPath = 'package.json';
        const tempPackageJsonPath = 'temp.package.json';
        const envPath = '.env';
        const tempEnvPath = 'temp.env';
        let hasOriginalPackageJson = false;
        let hasOriginalEnv = false;

        if (fs.existsSync(packageJsonPath)) {
            console.log('💾 Backing up current package.json to temp.package.json...');
            fs.copyFileSync(packageJsonPath, tempPackageJsonPath);
            hasOriginalPackageJson = true;
        }

        if (fs.existsSync(envPath)) {
            console.log('💾 Backing up current .env to temp.env...');
            fs.copyFileSync(envPath, tempEnvPath);
            hasOriginalEnv = true;
        }

        let successCount = 0;
        let failureCount = 0;
        const buildResults = [];

        // Function to build a single app with its package.json and .env configuration
        async function buildSingleApp(appName, packageJsonFile, configFile) {
            const startTime = Date.now();
            
            try {
                console.log(`📋 Using package.json configuration: ${packageJsonFile}`);
                console.log(`🔧 Using runtime configuration: ${configFile}`);
                
                // Copy the app-specific package.json to main package.json
                const sourcePackageJsonPath = path.join('configs', packageJsonFile);
                if (!fs.existsSync(sourcePackageJsonPath)) {
                    throw new Error(`Package.json file not found: ${sourcePackageJsonPath}`);
                }
                
                fs.copyFileSync(sourcePackageJsonPath, packageJsonPath);
                console.log(`📄 Copied ${packageJsonFile} to package.json`);
                  // Copy the app-specific config to .env (only the app config, not merged)
                const configPath = path.join('configs', configFile);
                if (!fs.existsSync(configPath)) {
                    throw new Error(`Config file not found: ${configPath}`);
                }
                
                // Read ONLY the app-specific config (don't merge with developer profile)
                const appConfig = fs.readFileSync(configPath, 'utf8');
                
                // Write only the app config to .env (clean, no merging)
                fs.writeFileSync(envPath, appConfig);
                console.log(`🔧 Created .env with clean app config (no merging)`);
                
                // Run the build using the build script
                console.log(`🔨 Building ${appName} for ${platform}...`);
                execSync(`node scripts/build.js ${platform}`, {
                    stdio: 'inherit',
                    cwd: process.cwd()
                });                // Fix Windows executable metadata (only for Windows builds)
                if (platform === 'win') {
                    try {
                        console.log(`🔧 Fixing Windows executable metadata for ${appName}...`);
                        
                        // Parse the app-specific .env config directly (not the merged one)
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
                            
                            // Retry logic for metadata fixing with progressive delays
                            let retries = 3;
                            let success = false;
                              while (retries > 0 && !success) {
                                try {
                                    // Progressive delay to ensure file handles are released
                                    const delay = (4 - retries) * 2000; // 2s, 4s, 6s
                                    if (delay > 0) {
                                        console.log(`⏳ Waiting ${delay/1000}s before retry...`);
                                        await new Promise(resolve => setTimeout(resolve, delay));
                                    }
                                    
                                    // Check if file is accessible before attempting to modify it
                                    try {
                                        const fd = fs.openSync(exePath, 'r+');
                                        fs.closeSync(fd);
                                        console.log(`📁 File access confirmed`);
                                    } catch (accessError) {
                                        throw new Error(`File is locked or inaccessible: ${accessError.message}`);
                                    }
                                    
                                    await fixExecutableMetadata(
                                        exePath,
                                        appName_display,
                                        appDescription,
                                        'PWA Desktop',
                                        iconPath
                                    );
                                    console.log(`✅ Metadata fixed for ${appName_display}`);
                                    success = true;
                                    
                                } catch (metadataError) {
                                    retries--;
                                    if (retries > 0) {
                                        console.log(`⚠️ Metadata fix failed, retrying... (${retries} attempts left)`);
                                        console.log(`   Error: ${metadataError.message}`);
                                    } else {
                                        console.warn(`❌ Failed to fix metadata for ${appName} after 3 attempts:`);
                                        console.warn(`   ${metadataError.message}`);
                                        console.warn(`   Build completed successfully, but Windows metadata not updated.`);
                                    }
                                }
                            }
                        } else {
                            console.log(`⚠️ Skipping metadata fix - executable not found: ${exePath}`);
                        }
                    } catch (metadataError) {
                        console.warn(`⚠️ Failed to fix metadata for ${appName}:`, metadataError.message);
                        // Don't fail the entire build for metadata issues
                    }
                }
                
                const duration = Math.round((Date.now() - startTime) / 1000);
                console.log(`✅ ${appName.toUpperCase()} built successfully in ${duration}s`);
                
                successCount++;
                buildResults.push({
                    name: appName,
                    status: 'SUCCESS',
                    duration: `${duration}s`,
                    platform: platform
                });
                
            } catch (error) {
                const duration = Math.round((Date.now() - startTime) / 1000);
                console.error(`❌ ${appName.toUpperCase()} build failed after ${duration}s:`, error.message);
                
                failureCount++;
                buildResults.push({
                    name: appName,
                    status: 'FAILED',
                    duration: `${duration}s`,
                    platform: platform,
                    error: error.message
                });
            }
        }

        // Build each example
        for (let i = 0; i < examples.length; i++) {
            const example = examples[i];
            const { name, packageJson, configFile } = example;
            
            console.log(`\n📱 [${i + 1}/${examples.length}] Building ${name.toUpperCase()}...`);
            await buildSingleApp(name, packageJson, configFile);
        }

        // Restore original files if they existed
        if (hasOriginalPackageJson) {
            console.log('\n🔄 Restoring original package.json...');
            fs.copyFileSync(tempPackageJsonPath, packageJsonPath);
            fs.unlinkSync(tempPackageJsonPath);
            console.log('✅ Original package.json restored');
        } else {
            // Remove the package.json if there wasn't one originally
            if (fs.existsSync(packageJsonPath)) {
                fs.unlinkSync(packageJsonPath);
                console.log('🗑️ Removed temporary package.json');
            }
        }

        if (hasOriginalEnv) {
            console.log('🔄 Restoring original .env...');
            fs.copyFileSync(tempEnvPath, envPath);
            fs.unlinkSync(tempEnvPath);
            console.log('✅ Original .env restored');
        } else {
            // Remove the .env if there wasn't one originally
            if (fs.existsSync(envPath)) {
                fs.unlinkSync(envPath);
                console.log('🗑️ Removed temporary .env');
            }
        }

        // Print build summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 BUILD SUMMARY');
        console.log('='.repeat(60));

        console.log(`✅ Successful builds: ${successCount}`);
        console.log(`❌ Failed builds: ${failureCount}`);
        console.log(`🏁 Total: ${examples.length}\n`);

        // Print detailed results
        buildResults.forEach(result => {
            const statusIcon = result.status === 'SUCCESS' ? '✅' : '❌';
            const appName = result.name.padEnd(15);
            const duration = result.duration.padEnd(8);
            console.log(`${statusIcon} ${appName} ${duration} (${result.platform})`);
            if (result.error) {
                console.log(`   └─ Error: ${result.error}`);
            }
        });

        // Show output directory structure
        if (successCount > 0) {
            console.log('\n📁 Build outputs:');
            const distPath = 'dist';
            if (fs.existsSync(distPath)) {
                const distContents = fs.readdirSync(distPath);
                distContents.forEach(item => {
                    const itemPath = path.join(distPath, item);
                    if (fs.statSync(itemPath).isDirectory()) {
                        console.log(`   📂 dist/${item}/`);
                        try {
                            const subContents = fs.readdirSync(itemPath);
                            subContents.slice(0, 3).forEach(subItem => {
                                console.log(`      └─ ${subItem}`);
                            });
                            if (subContents.length > 3) {
                                console.log(`      └─ ... and ${subContents.length - 3} more files`);
                            }
                        } catch (e) {
                            console.log(`      └─ (could not read directory contents)`);
                        }
                    }
                });
            }
        }

        console.log('\n🎉 Build process completed!');
        console.log('\n💡 Note: Each app is built with its own package.json configuration.');
        console.log('📋 App metadata is read dynamically from each app\'s .env configuration.');
        console.log('🔧 Windows executable metadata is automatically fixed after each build.');

        // Exit with appropriate code based on build results
        process.exit(failureCount > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Build process failed:', error.message);
        process.exit(1);
    }
})();
