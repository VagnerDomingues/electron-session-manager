const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: parseInt(process.env.WINDOW_WIDTH) || 1200,
    height: parseInt(process.env.WINDOW_HEIGHT) || 800,
    minWidth: parseInt(process.env.WINDOW_MIN_WIDTH) || 800,
    minHeight: parseInt(process.env.WINDOW_MIN_HEIGHT) || 600,
    title: process.env.APP_NAME || 'Electron PWA App',
    resizable: process.env.WINDOW_RESIZABLE !== 'false',
    maximizable: process.env.WINDOW_MAXIMIZABLE !== 'false',
    minimizable: process.env.WINDOW_MINIMIZABLE !== 'false',
    icon: path.join(__dirname, process.env.WIN_ICON || process.env.MAC_ICON || 'assets/icon.png'),
    webPreferences: {
      nodeIntegration: process.env.NODE_INTEGRATION === 'true',
      contextIsolation: process.env.CONTEXT_ISOLATION !== 'false',
      enableRemoteModule: process.env.ENABLE_REMOTE_MODULE === 'true',
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: process.env.WEB_SECURITY !== 'false'
    },
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });  // Set Chrome user agent to bypass website restrictions
  const userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  mainWindow.webContents.setUserAgent(userAgent);

  // Load the web application
  const appUrl = process.env.APP_URL || 'https://web.whatsapp.com';
  mainWindow.loadURL(appUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  // Prevent navigation away from the main app domain (optional security feature)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const currentUrl = new URL(appUrl);
    const parsedUrl = new URL(navigationUrl);
    
    // Allow navigation within the same origin, otherwise open externally
    if (parsedUrl.origin !== currentUrl.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Handle app close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // macOS specific behavior
  if (process.platform === 'darwin') {
    mainWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });
  }
}

// Create menu
function createMenu() {
  // Remove the application menu entirely
  Menu.setApplicationMenu(null);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
