const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read the base package.json
const packagePath = path.join(__dirname, 'package.json');
const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update package.json with environment variables
package.name = process.env.APP_NAME?.toLowerCase().replace(/\s+/g, '-') || package.name;
package.version = process.env.APP_VERSION || package.version;
package.description = process.env.APP_DESCRIPTION || package.description;
package.author = process.env.APP_AUTHOR || package.author;
package.license = process.env.APP_LICENSE || package.license;

// Update build configuration
if (package.build) {
  package.build.appId = process.env.APP_ID || package.build.appId;
  package.build.productName = process.env.APP_NAME || package.build.productName;
  package.build.directories.output = process.env.BUILD_OUTPUT_DIR || package.build.directories.output;
  package.build.forceCodeSigning = process.env.FORCE_CODE_SIGNING === 'true';

  // Windows configuration
  if (package.build.win) {
    package.build.win.icon = process.env.WIN_ICON || package.build.win.icon;
    package.build.win.target = process.env.WIN_TARGET || package.build.win.target;
    package.build.win.verifyUpdateCodeSignature = process.env.WIN_VERIFY_UPDATE_CODE_SIGNATURE === 'true';
    package.build.win.requestedExecutionLevel = process.env.WIN_REQUESTED_EXECUTION_LEVEL || package.build.win.requestedExecutionLevel;
    package.build.win.signAndEditExecutable = process.env.WIN_SIGN_AND_EDIT_EXECUTABLE === 'true';
    package.build.win.signDlls = process.env.WIN_SIGN_DLLS === 'true';
    
    if (process.env.WIN_CERTIFICATE_FILE) {
      package.build.win.certificateFile = process.env.WIN_CERTIFICATE_FILE;
    }
    if (process.env.WIN_CERTIFICATE_PASSWORD) {
      package.build.win.certificatePassword = process.env.WIN_CERTIFICATE_PASSWORD;
    }
    if (process.env.WIN_CERTIFICATE_SUBJECT_NAME) {
      package.build.win.certificateSubjectName = process.env.WIN_CERTIFICATE_SUBJECT_NAME;
    }
  }

  // macOS configuration
  if (package.build.mac) {
    package.build.mac.icon = process.env.MAC_ICON || package.build.mac.icon;
    package.build.mac.target = process.env.MAC_TARGET || package.build.mac.target;
    package.build.mac.category = process.env.MAC_CATEGORY || package.build.mac.category;
    
    if (process.env.MAC_CERTIFICATE_NAME) {
      package.build.mac.identity = process.env.MAC_CERTIFICATE_NAME;
    } else {
      package.build.mac.identity = null;
    }
    
    if (process.env.MAC_NOTARIZE === 'true') {
      package.build.afterSign = './scripts/notarize.js';
    }
  }

  // NSIS configuration
  if (package.build.nsis) {
    package.build.nsis.oneClick = process.env.WIN_NSIS_ONE_CLICK === 'true';
    package.build.nsis.allowToChangeInstallationDirectory = process.env.WIN_NSIS_ALLOW_TO_CHANGE_INSTALLATION_DIRECTORY !== 'false';
    package.build.nsis.createDesktopShortcut = process.env.WIN_NSIS_CREATE_DESKTOP_SHORTCUT !== 'false';
    package.build.nsis.createStartMenuShortcut = process.env.WIN_NSIS_CREATE_START_MENU_SHORTCUT !== 'false';
  }
}

module.exports = package;
