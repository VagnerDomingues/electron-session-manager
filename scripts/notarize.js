const { notarize } = require('electron-notarize');
require('dotenv').config();

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin' || process.env.MAC_NOTARIZE !== 'true') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log(`Notarizing ${appName}...`);

  try {
    await notarize({
      appBundleId: process.env.APP_ID,
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.MAC_NOTARIZE_APPLE_ID,
      appleIdPassword: process.env.MAC_NOTARIZE_APPLE_ID_PASSWORD,
      teamId: process.env.MAC_NOTARIZE_TEAM_ID,
    });
    console.log('✅ Notarization completed successfully!');
  } catch (error) {
    console.error('❌ Notarization failed:', error);
    throw error;
  }
};
