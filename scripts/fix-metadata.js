#!/usr/bin/env node

const rcedit = require('rcedit');
const path = require('path');
const fs = require('fs');

// Function to fix Windows executable metadata
async function fixExecutableMetadata(exePath, appName, appDescription, companyName = 'PWA Desktop', iconPath = null) {
    try {
        console.log(`🔧 Fixing metadata for: ${exePath}`);
        
        // Check if executable exists
        if (!fs.existsSync(exePath)) {
            throw new Error(`Executable not found: ${exePath}`);
        }
        
        console.log(`📁 Executable found: ${fs.statSync(exePath).size} bytes`);
          const options = {
            'version-string': {
                'ProductName': appName,
                'FileDescription': appDescription,
                'CompanyName': companyName,
                'LegalCopyright': `Copyright 2025 ${companyName}`,
                'OriginalFilename': path.basename(exePath),
                'InternalName': appName
            }
        };
        
        // Add icon if provided
        if (iconPath && fs.existsSync(iconPath)) {
            options.icon = iconPath;
            console.log(`🎨 Setting icon: ${iconPath}`);
        }
        
        console.log(`🔄 Applying changes...`);
        await rcedit(exePath, options);
        console.log(`✅ Successfully updated metadata for ${appName}`);
        
    } catch (error) {
        console.error(`❌ Error fixing metadata for ${exePath}:`, error.message);
        console.error(`Stack trace:`, error.stack);
        throw error;
    }
}

// Function to fix metadata for all built apps
async function fixAllAppsMetadata() {
    const apps = [
        {
            name: 'Asana',
            description: 'Asana - Team Collaboration Tool',
            exePath: 'dist/asana/win-unpacked/Asana.exe',
            iconPath: 'assets/Appicons/Asana.ico'
        },
        {
            name: 'ChatGPT',
            description: 'ChatGPT - AI Assistant',
            exePath: 'dist/chatgpt/win-unpacked/ChatGPT.exe',
            iconPath: 'assets/Appicons/ChatGPT.ico'
        },
        {
            name: 'Discord',
            description: 'Discord - Chat Platform',
            exePath: 'dist/discord/win-unpacked/Discord.exe',
            iconPath: 'assets/Appicons/Discord.ico'
        },
        {
            name: 'Notion',
            description: 'Notion - All-in-one Workspace',
            exePath: 'dist/notion/win-unpacked/Notion.exe',
            iconPath: 'assets/Appicons/Notion.ico'
        },
        {
            name: 'WhatsApp',
            description: 'WhatsApp - Messaging Platform',
            exePath: 'dist/whatsappweb/win-unpacked/WhatsApp.exe',
            iconPath: 'assets/Appicons/Whatsapp.ico'
        }
    ];
    
    console.log('🚀 Starting metadata fix for all apps...\n');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const app of apps) {
        try {
            await fixExecutableMetadata(
                app.exePath,
                app.name,
                app.description,
                'PWA Desktop',
                app.iconPath
            );
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to fix ${app.name}:`, error.message);
            failureCount++;
        }
        console.log(''); // Empty line for readability
    }
    
    console.log('============================================================');
    console.log('📊 METADATA FIX SUMMARY');
    console.log('============================================================');
    console.log(`✅ Successfully fixed: ${successCount} apps`);
    console.log(`❌ Failed to fix: ${failureCount} apps`);
    console.log(`🏁 Total: ${successCount + failureCount} apps`);
    
    if (failureCount === 0) {
        console.log('\n🎉 All app metadata has been successfully fixed!');
        console.log('💡 The executables now show correct product names in Windows Explorer.');
    }
}

// Export functions for use in other scripts
module.exports = {
    fixExecutableMetadata,
    fixAllAppsMetadata
};

// If script is run directly, fix all apps
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Fix all apps
        fixAllAppsMetadata().catch(error => {
            console.error('❌ Script failed:', error.message);
            process.exit(1);
        });
    } else if (args.length >= 3) {
        // Fix specific app: node fix-metadata.js <exePath> <appName> <description> [iconPath]
        const [exePath, appName, description, iconPath] = args;
        fixExecutableMetadata(exePath, appName, description, 'PWA Desktop', iconPath)
            .catch(error => {
                console.error('❌ Script failed:', error.message);
                process.exit(1);
            });
    } else {
        console.log('Usage:');
        console.log('  node fix-metadata.js                                    # Fix all apps');
        console.log('  node fix-metadata.js <exe> <name> <desc> [icon]        # Fix specific app');
        process.exit(1);
    }
}
