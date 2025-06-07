const { app, BrowserWindow, Menu, shell, dialog, ipcMain, nativeTheme } = require('electron');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Keep references to all windows and sessions
let windows = new Map(); // sessionId -> BrowserWindow
let sessionManager;
let mainWindow; // Keep reference to main window for dialogs

function createWindow(targetSessionId = null) {
  console.log(`Creating window${targetSessionId ? ` for session: ${targetSessionId}` : ''}...`);
  
  // Determine which session to use for this window
  let sessionToUse = targetSessionId;
  
  // Initialize session manager if not already done
  try {
    const SessionManager = require('./sessionManager');
    
    // Create session manager if it doesn't exist
    if (!sessionManager) {
      sessionManager = new SessionManager();
      console.log('Session manager created');
    }
    
    if (!sessionToUse && sessionManager.isSessionManagementEnabled()) {
      // If no target session specified, use the default session
      sessionToUse = sessionManager.getDefaultSession();
      console.log(`No target session specified, using default: ${sessionToUse}`);
    }
    
    // Don't change the global current session - just use the session for this window
    console.log(`Creating window for session: ${sessionToUse}`);
    
    console.log('Session manager enabled:', sessionManager.isSessionManagementEnabled());
    console.log('Target session for this window:', sessionToUse);
  } catch (error) {
    console.error('Error initializing session manager:', error);
    sessionManager = null;
  }

  // Build webPreferences with session isolation
  const webPreferences = {
    nodeIntegration: process.env.NODE_INTEGRATION === 'true',
    contextIsolation: process.env.CONTEXT_ISOLATION !== 'false',
    enableRemoteModule: process.env.ENABLE_REMOTE_MODULE === 'true',
    preload: path.join(__dirname, 'preload.js'),
    webSecurity: process.env.WEB_SECURITY !== 'false'
  };  // Add session partition for complete isolation if enabled
  let currentSessionId = sessionToUse || 'session-1'; // Use the determined session
  
  if (sessionManager && sessionManager.isSessionManagementEnabled()) {
    const sessionDataPath = sessionManager.getSessionDataPath(currentSessionId);
    
    // Use a unique partition for each session to ensure complete isolation
    webPreferences.partition = `persist:session-${currentSessionId}`;
    console.log('🔒 Using isolated partition:', webPreferences.partition);
    console.log('📋 Session ID:', currentSessionId);
    console.log('📁 Session data path:', sessionDataPath);
    console.log('🔄 This session will have its own cookies, storage, and login state');
  } else {
    console.log('⚠️ No session management - using default partition');
  }  // Get the appropriate icon path based on platform
  const getIconPath = () => {
    if (process.platform === 'win32') {
      return process.env.WIN_ICON ? path.join(__dirname, process.env.WIN_ICON) : path.join(__dirname, 'assets/icon.ico');
    } else if (process.platform === 'darwin') {
      return process.env.MAC_ICON ? path.join(__dirname, process.env.MAC_ICON) : path.join(__dirname, 'assets/icon.png');
    } else {
      // Linux and other platforms typically use PNG
      return process.env.MAC_ICON ? path.join(__dirname, process.env.MAC_ICON) : path.join(__dirname, 'assets/icon.png');
    }
  };

  // Create the browser window
  const newWindow = new BrowserWindow({
    width: parseInt(process.env.WINDOW_WIDTH) || 1200,
    height: parseInt(process.env.WINDOW_HEIGHT) || 800,
    minWidth: parseInt(process.env.WINDOW_MIN_WIDTH) || 800,
    minHeight: parseInt(process.env.WINDOW_MIN_HEIGHT) || 600,
    title: getWindowTitle(currentSessionId),
    icon: getIconPath(), // Add the icon here
    resizable: process.env.WINDOW_RESIZABLE !== 'false',
    maximizable: process.env.WINDOW_MAXIMIZABLE !== 'false',
    minimizable: process.env.WINDOW_MINIMIZABLE !== 'false',
    webPreferences: webPreferences,
    show: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    // Enable system theme detection
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    // Windows-specific theme support
    ...(process.platform === 'win32' && {
      titleBarOverlay: {
        color: nativeTheme.shouldUseDarkColors ? '#2d2d2d' : '#ffffff',
        symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000'
      }
    })
  });

  // Store window reference by session ID
  windows.set(currentSessionId, newWindow);
  
  // If this is the first window, make it the main window
  if (!windows.has('session-1') || currentSessionId === 'session-1') {
    mainWindow = newWindow;
  }
  console.log(`BrowserWindow created for session: ${currentSessionId}`);

  // Set Chrome user agent to bypass website restrictions
  const userAgent = process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  newWindow.webContents.setUserAgent(userAgent);  // Load the web application with error handling
  const appUrl = process.env.APP_URL || 'about:blank';
  if (appUrl === 'about:blank') {
    console.warn('⚠️ APP_URL not configured, using about:blank');
  }
  
  console.log(`🌐 Loading ${appUrl} for session: ${currentSessionId}`);
  
  // Function to load error page
  function loadErrorPage() {
    const errorPagePath = path.join(__dirname, 'assets', 'connection-error.html');
    console.log(`📄 Loading connection error page: ${errorPagePath}`);
    newWindow.loadFile(errorPagePath).catch(err => {
      console.error('Failed to load error page:', err);
      // Fallback: load a simple HTML string
      newWindow.loadURL(`data:text/html,<h1>Connection Error</h1><p>Could not connect to: ${appUrl}</p><button onclick="location.reload()">Retry</button>`);
    });
  }

  // Try to load the main URL with timeout and error handling
  const loadPromise = newWindow.loadURL(appUrl);
  
  // Set up error handling
  newWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log(`❌ Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    
    // Only show error page for network-related errors, not for internal navigation
    if (errorCode <= -100 && errorCode >= -199) { // Network errors
      loadErrorPage();
    }
  });

  // Also handle promise rejection for immediate connection issues
  loadPromise.catch(error => {
    console.log(`❌ Load URL promise rejected:`, error);
    loadErrorPage();
  });    // Inject theme CSS when page loads to force system theme
  newWindow.webContents.on('dom-ready', () => {
    // Check if this is the error page - if so, skip theme injection
    const currentURL = newWindow.webContents.getURL();
    if (currentURL.includes('connection-error.html') || (currentURL.startsWith('file://') && currentURL.includes('assets'))) {
      console.log('📄 Error page DOM ready - skipping theme injection');
      return;
    }    
    const isDarkMode = nativeTheme.shouldUseDarkColors;    
  });

  // Comprehensive window title protection
  let targetTitle = getWindowTitle(currentSessionId);
  
  // Store the target title on the window object so we can update it
  newWindow.targetTitle = targetTitle;
  
  // Prevent web page from changing the window title
  newWindow.webContents.on('page-title-updated', (event) => {
    // Prevent the default behavior of updating window title from web content
    event.preventDefault();
    // Immediately restore our title (use the current target title)
    newWindow.setTitle(newWindow.targetTitle);
  });

  // Monitor title changes and restore immediately
  let titleProtectionInterval;
  
  const protectTitle = () => {
    if (!newWindow.isDestroyed()) {
      const currentTitle = newWindow.getTitle();
      if (currentTitle !== newWindow.targetTitle) {
        console.log(`🔧 Title changed from "${newWindow.targetTitle}" to "${currentTitle}" - restoring...`);
        newWindow.setTitle(newWindow.targetTitle);
      }
    }
  };
  // Start ULTRA aggressive title protection - check every 50ms
  titleProtectionInterval = setInterval(protectTitle, 50);  // Also listen for various page events
  newWindow.webContents.on('dom-ready', () => {
    // Check if this is the error page - if so, skip title protection
    const currentURL = newWindow.webContents.getURL();
    if (currentURL.includes('connection-error.html') || (currentURL.startsWith('file://') && currentURL.includes('assets'))) {
      console.log('📄 Error page DOM ready - skipping title protection');
      return;
    }
    
    console.log('📄 DOM ready - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
    
    // Inject title protection JavaScript
    newWindow.webContents.executeJavaScript(`
      // Override document.title setter
      Object.defineProperty(document, 'title', {
        get: function() { return this._title || ''; },
        set: function(value) { 
          console.log('🚫 Blocked title change attempt:', value);
          // Don't actually change the title
          this._title = value;
        }
      });
      
      // Override any title elements
      const titleElements = document.querySelectorAll('title');
      titleElements.forEach(el => {
        el.textContent = '';
        Object.defineProperty(el, 'textContent', {
          set: function(value) { 
            console.log('🚫 Blocked title element change:', value);
          },
          get: function() { return ''; }
        });
      });
      
      console.log('🛡️ Title protection JavaScript activated on DOM ready');
    `).catch(err => {
      console.log('Could not inject title protection JS on DOM ready:', err.message);
    });
  });

  newWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page load complete - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
  });

  newWindow.webContents.on('did-frame-finish-load', () => {
    // This fires for all frames, including iframes
    newWindow.setTitle(newWindow.targetTitle);
  });
  newWindow.webContents.on('did-stop-loading', () => {
    console.log('🛑 Loading stopped - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
  });

  // Additional event handlers for maximum title protection
  newWindow.webContents.on('did-navigate', () => {
    console.log('🧭 Navigation occurred - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
  });

  newWindow.webContents.on('did-navigate-in-page', () => {
    console.log('📍 In-page navigation - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
  });

  newWindow.webContents.on('did-start-loading', () => {
    console.log('⏳ Loading started - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
  });

  newWindow.webContents.on('page-favicon-updated', () => {
    console.log('🎭 Favicon updated - enforcing title protection');
    newWindow.setTitle(newWindow.targetTitle);
  });
  // Override any attempts to change title through DOM manipulation
  // Note: This is handled by the dom-ready event handler above, which includes error page detection
  // newWindow.webContents.executeJavaScript(`
  //   // Override document.title setter
  //   Object.defineProperty(document, 'title', {
  //     get: function() { return this._title || ''; },
  //     set: function(value) { 
  //       console.log('🚫 Blocked title change attempt:', value);
  //       // Don't actually change the title
  //       this._title = value;
  //     }
  //   });
  //   
  //   // Also try to prevent title changes via querySelector
  //   const originalSetAttribute = Element.prototype.setAttribute;
  //   Element.prototype.setAttribute = function(name, value) {
  //     if (this.tagName === 'TITLE' && name === 'textContent') {
  //       console.log('🚫 Blocked title element change:', value);
  //       return;
  //     }
  //     return originalSetAttribute.call(this, name, value);
  //   };
  //   
  //   console.log('🛡️ Title protection JavaScript injected');
  // `).catch(err => {
  //   console.log('Note: Could not inject title protection JS (page may not be ready yet)');
  // });

  // Clean up interval when window is closed
  newWindow.on('closed', () => {
    if (titleProtectionInterval) {
      clearInterval(titleProtectionInterval);
    }
  });
  // Setup session management after window is created
  if (sessionManager && sessionManager.isSessionManagementEnabled()) {
    console.log('✅ Session management is ENABLED');
    console.log(`📋 Window session: ${currentSessionId}`);
    console.log(`📝 Session name: ${sessionManager.getSessionName(currentSessionId)}`);
    console.log('📁 All sessions:', Object.keys(sessionManager.getAllSessions()));
    
    setupSessionManagement();
    
    // Always create session menu since we're no longer toggling it
    console.log('🎛️ Creating session menu');
    createMenu();
  } else {
    console.log('❌ Session management is DISABLED or not available');
    // Still create basic menu even without sessions
    createMenu();  }
  
  // Setup global keyboard shortcuts for this window
  setupGlobalShortcuts(newWindow);
  // Handle external links
  newWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from the main app domain
  newWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const currentUrl = new URL(appUrl);
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== currentUrl.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
  // Handle window close
  newWindow.on('closed', () => {
    // Remove from windows map when closed
    windows.delete(currentSessionId);
    console.log(`Window for session ${currentSessionId} closed`);
    
    // Refresh session menu to remove "(Open)" indicator
    refreshSessionMenuIfVisible();
    
    // If there are no more windows, quit the app
    if (windows.size === 0) {
      app.quit();
    }
  });

  // macOS specific behavior
  if (process.platform === 'darwin') {
    newWindow.on('close', (event) => {
      if (!app.isQuiting) {
        event.preventDefault();
        newWindow.hide();
      }
    });
  }

  return newWindow;
}

function getWindowTitle(sessionId = null) {
  const baseTitle = process.env.APP_NAME || 'AppName';
  if (sessionManager && sessionManager.isSessionManagementEnabled()) {
    const sessionName = sessionId ? sessionManager.getSessionName(sessionId) : sessionManager.getSessionName();
    return sessionName ? `${baseTitle} - ${sessionName}` : baseTitle;
  }
  return baseTitle;
}

function updateWindowTitle(sessionId = null) {
  if (sessionId) {
    // Update specific window title
    const window = windows.get(sessionId);
    if (window && !window.isDestroyed()) {
      const newTitle = getWindowTitle(sessionId);
      console.log(`🔄 Updating window title for session ${sessionId}: "${newTitle}"`);
      
      // Update the target title for title protection
      window.targetTitle = newTitle;
      
      // Set the actual window title
      window.setTitle(newTitle);
    }
  } else {
    // Update all window titles
    windows.forEach((window, sid) => {
      if (window && !window.isDestroyed()) {
        const newTitle = getWindowTitle(sid);
        console.log(`🔄 Updating window title for session ${sid}: "${newTitle}"`);
        
        // Update the target title for title protection
        window.targetTitle = newTitle;
        
        // Set the actual window title
        window.setTitle(newTitle);
      }
    });
  }
}

// Create menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) focusedWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },    {
      label: 'View',
      submenu: [
        {
          label: 'Show Hotkeys',
          accelerator: 'F1',
          click: showHotkeyWindow
        }
      ]
    }
  ];
  // Add sessions menu if session management is enabled
  if (sessionManager && sessionManager.isSessionManagementEnabled()) {
    template.splice(1, 0, createSessionMenu());
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Setup session management
function setupSessionManagement() {
  if (!sessionManager || !sessionManager.isSessionManagementEnabled()) return;
  
  // Setup IPC handlers for session management
  setupSessionIPC();
}

// Track menu bar visibility state
let menuBarVisible = true;


// Toggle entire menu bar visibility
function toggleMenuBar() {
  menuBarVisible = !menuBarVisible;
  console.log(`Menu bar ${menuBarVisible ? 'shown' : 'hidden'}`);
  
  // Apply to all windows
  windows.forEach(window => {
    if (window && !window.isDestroyed()) {
      window.setMenuBarVisibility(menuBarVisible);
      // On Windows/Linux, also set auto hide behavior
      if (process.platform !== 'darwin') {
        window.setAutoHideMenuBar(!menuBarVisible);
      }
    }
  });
}

// Setup global keyboard shortcuts for a specific window
function setupGlobalShortcuts(window) {
  if (!window || window.isDestroyed()) return;
  
  // Register global keyboard shortcuts
  window.webContents.on('before-input-event', (event, input) => {
    // F12 for developer tools (like Chrome)
    if (input.key === 'F12' && input.type === 'keyDown') {
      window.webContents.toggleDevTools();
    }
    
    // F1 for hotkey window
    if (input.key === 'F1' && input.type === 'keyDown') {
      showHotkeyWindow();
    }
    
    // F10 for menu bar toggle
    if (input.key === 'F10' && input.type === 'keyDown') {
      toggleMenuBar();
    }
    
    // F11 for fullscreen toggle
    if (input.key === 'F11' && input.type === 'keyDown') {
      window.setFullScreen(!window.isFullScreen());
    }
    
    // Ctrl/Cmd + N for rename session
    if (input.key === 'n' && (input.control || input.meta) && !input.shift && input.type === 'keyDown') {
      if (sessionManager && sessionManager.isSessionManagementEnabled()) {
        event.preventDefault();
        renameCurrentSession();
      }
    }
    
    // Ctrl/Cmd + Delete for delete current session
    if (input.key === 'Delete' && (input.control || input.meta) && input.type === 'keyDown') {
      if (sessionManager && sessionManager.isSessionManagementEnabled()) {
        event.preventDefault();
        deleteCurrentSession();
      }
    }
    
    // Ctrl/Cmd + Alt + Shift + R for refresh cache and clear storage
    if (input.key === 'r' && (input.control || input.meta) && input.alt && input.shift && input.type === 'keyDown') {
      event.preventDefault();
      window.webContents.session.clearCache();
      window.webContents.session.clearStorageData();
      window.webContents.reloadIgnoringCache();
    }
  });
}

// Helper function to refresh session menu
function refreshSessionMenuIfVisible() {
  if (sessionManager && sessionManager.isSessionManagementEnabled()) {
    createMenu();
  }
}

// Create session management menu
function createSessionMenu() {
  if (!sessionManager || !sessionManager.isSessionManagementEnabled()) {
    return { label: 'Sessions', submenu: [] };
  }

  const sessions = sessionManager.getAllSessions();
  const currentSessionId = sessionManager.getCurrentSession();
    const sessionSubmenu = [
    {
      label: 'New Session...',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: createNewSession
    },
    {
      label: 'Rename Current Session...',
      accelerator: 'CmdOrCtrl+N',
      click: renameCurrentSession
    },
    {
      label: 'Set Current as Default',
      click: setCurrentAsDefault
    },
    { type: 'separator' },
    {
      label: 'Delete Current Session',
      accelerator: 'CmdOrCtrl+Delete',
      click: deleteCurrentSession
    },
    {
      label: 'Delete All Sessions',
      click: deleteAllSessions
    },
    { type: 'separator' }
  ];
  // Add individual sessions
  Object.values(sessions).forEach(session => {
    const isOpen = windows.has(session.id) && !windows.get(session.id).isDestroyed();
    let label = session.name;
    
    if (isOpen) {
      label += ' (Open)';
    }
    if (session.id === sessionManager.getDefaultSession()) {
      label += ' (Default)';
    }
    
    sessionSubmenu.push({
      label: label,
      click: () => switchToSession(session.id)
    });
  });

  return {
    label: 'Sessions',
    submenu: sessionSubmenu
  };
}

// Session Management Functions
async function renameCurrentSession() {
  if (!sessionManager || !mainWindow) return;
  
  // Get the session ID from the focused window
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  // Find the session ID for the focused window
  let focusedSessionId = null;
  for (const [sessionId, window] of windows.entries()) {
    if (window === focusedWindow) {
      focusedSessionId = sessionId;
      break;
    }
  }
  
  if (!focusedSessionId) return;
  
  const currentName = sessionManager.getSessionName(focusedSessionId);
  
  const result = await showInputDialog({
    title: 'Rename Session',
    label: 'Session Name:',
    defaultValue: currentName,
    placeholder: 'Enter session name...'
  });
  if (result) {
    sessionManager.renameSession(focusedSessionId, result);
    updateWindowTitle(focusedSessionId); // Update the specific session's window
    refreshSessionMenuIfVisible();
  }
}

async function setCurrentAsDefault() {
  if (!sessionManager) return;
  
  // Get the session ID from the focused window
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  // Find the session ID for the focused window
  let focusedSessionId = null;
  for (const [sessionId, window] of windows.entries()) {
    if (window === focusedWindow) {
      focusedSessionId = sessionId;
      break;
    }
  }
  
  if (!focusedSessionId) return;
  
  sessionManager.setAsDefault(focusedSessionId);
  refreshSessionMenuIfVisible();
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Default Session Set',
    message: `"${sessionManager.getSessionName(focusedSessionId)}" is now the default session.`,
    buttons: ['OK']
  });
}

async function createNewSession() {
  if (!sessionManager) return;

  const result = await showInputDialog({
    title: 'Create New Session',
    label: 'Session Name:',
    placeholder: 'Enter session name...'
  });

  if (result) {
    const newSessionId = sessionManager.createSession(null, result);
    if (newSessionId) {
      refreshSessionMenuIfVisible();
      // Open the new session in a new window
      await switchToSession(newSessionId);
    }
  }
}

async function switchToSession(sessionId) {
  try {
    console.log(`🔄 Opening session in new window: ${sessionId}`);
    
    // Check if a window for this session already exists
    if (windows.has(sessionId)) {
      const existingWindow = windows.get(sessionId);
      if (!existingWindow.isDestroyed()) {
        console.log(`Window for session ${sessionId} already exists, bringing to focus`);
        existingWindow.show();
        existingWindow.focus();
        return true;
      } else {
        // Remove destroyed window from map
        windows.delete(sessionId);
      }
    }
    
    // Create new window for this session
    const newWindow = createWindow(sessionId);
    
    console.log(`✅ Successfully opened session: ${sessionId} in new window`);
    return true;
  } catch (error) {
    console.error('Error opening session:', error);
    return false;
  }
}

async function deleteCurrentSession() {
  if (!sessionManager || !mainWindow) return;
  
  // Get the session ID from the focused window
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  // Find the session ID for the focused window
  let focusedSessionId = null;
  for (const [sessionId, window] of windows.entries()) {
    if (window === focusedWindow) {
      focusedSessionId = sessionId;
      break;
    }
  }
  
  if (!focusedSessionId) return;
  
  if (focusedSessionId === 'session-1') {
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Cannot Delete Default Session',
      message: 'The default session cannot be deleted.',
      buttons: ['OK']
    });
    return;
  }

  const sessionName = sessionManager.getSessionName(focusedSessionId);
  const confirmed = await sessionManager.showDeleteConfirmation(mainWindow, focusedSessionId, false);
  
  if (confirmed) {
    sessionManager.deleteSession(focusedSessionId);
    refreshSessionMenuIfVisible();
    
    // Close the window for this session if it exists
    const sessionWindow = windows.get(focusedSessionId);
    if (sessionWindow && !sessionWindow.isDestroyed()) {
      sessionWindow.close();
    }
  }
}

async function deleteAllSessions() {
  if (!sessionManager || !mainWindow) return;
  
  const confirmed = await sessionManager.showDeleteConfirmation(mainWindow, null, true);
  
  if (confirmed) {
    // Get all sessions except default before deletion
    const allSessions = sessionManager.getAllSessions();
    const sessionsToClose = Object.keys(allSessions).filter(sid => sid !== 'session-1');
    
    sessionManager.deleteAllSessions();
    refreshSessionMenuIfVisible();
    
    // Close windows for deleted sessions
    sessionsToClose.forEach(sessionId => {
      const sessionWindow = windows.get(sessionId);
      if (sessionWindow && !sessionWindow.isDestroyed()) {
        sessionWindow.close();
      }
    });
  }
}

// Custom input dialog helper with native system theme support
async function showInputDialog(options) {
  const { title, label, defaultValue = '', placeholder = '' } = options;
  const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  
  // Get icon path from .env
  const iconPath = process.platform === 'win32' 
    ? (process.env.WIN_ICON || 'assets/icon.ico')
    : (process.env.MAC_ICON || 'assets/icon.png');
  
  return new Promise((resolve) => {
    let result = null;
    
    // Create native-themed HTML content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          :root {
            color-scheme: light dark;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Variable', system-ui, sans-serif;
            margin: 0;
            padding: 24px;
            background: Canvas;
            color: CanvasText;
            font-size: 13px;
            line-height: 1.4;
            overflow: hidden;
          }
            .container {
            max-width: 380px;
            margin: 0 auto;
          }
          
          .form-group {
            margin-bottom: 20px;
          }
          
          .label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: CanvasText;
            margin-bottom: 6px;
          }
          
          .input-field {
            width: 100%;
            padding: 8px 12px;
            font-size: 13px;
            font-family: inherit;
            background: Field;
            color: FieldText;
            border: 1px solid;
            border-color: color-mix(in srgb, CanvasText 25%, transparent);
            border-radius: 4px;
            outline: none;
            transition: border-color 0.15s ease;
          }
          
          .input-field:focus {
            border-color: AccentColor;
            box-shadow: 0 0 0 1px color-mix(in srgb, AccentColor 25%, transparent);
          }
          
          .input-field::placeholder {
            color: color-mix(in srgb, FieldText 60%, transparent);
          }
          
          .buttons {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid;
            border-color: color-mix(in srgb, CanvasText 10%, transparent);
          }
          
          .button {
            padding: 6px 16px;
            font-size: 12px;
            font-family: inherit;
            font-weight: 500;
            border: 1px solid;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease;
            min-width: 70px;
          }
          
          .button-cancel {
            background: Canvas;
            color: CanvasText;
            border-color: color-mix(in srgb, CanvasText 25%, transparent);
          }
          
          .button-cancel:hover {
            background: color-mix(in srgb, CanvasText 8%, Canvas);
          }
          
          .button-submit {
            background: AccentColor;
            color: color-mix(in srgb, AccentColor 10%, white);
            border-color: AccentColor;
          }
          
          .button-submit:hover {
            background: color-mix(in srgb, AccentColor 85%, black);
          }
          
          .button-submit:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          
          /* Dark mode specific adjustments */
          @media (prefers-color-scheme: dark) {
            .button-submit {
              color: color-mix(in srgb, AccentColor 15%, black);
            }
          }
          
          /* High contrast mode support */
          @media (prefers-contrast: high) {
            .input-field {
              border: 2px solid CanvasText;
            }
            
            .button {
              border: 2px solid;
            }
          }
          
          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            .input-field,
            .button {
              transition: none;
            }
          }
        </style>
      </head>      <body>
        <div class="container">
          <div class="form-group">
            <label class="label" for="inputField">${label}</label>
            <input 
              type="text" 
              id="inputField" 
              class="input-field"
              value="${defaultValue}" 
              placeholder="${placeholder}" 
              autofocus
              autocomplete="off"
              spellcheck="false"
            >
          </div>
          
          <div class="buttons">
            <button type="button" class="button button-cancel" onclick="cancel()">Cancel</button>
            <button type="submit" class="button button-submit" onclick="submit()" id="submitBtn">OK</button>
          </div>
        </div>
        
        <script>
          const { ipcRenderer } = require('electron');
          
          const inputField = document.getElementById('inputField');
          const submitBtn = document.getElementById('submitBtn');
          
          // Update submit button state based on input
          function updateSubmitButton() {
            const hasValue = inputField.value.trim().length > 0;
            submitBtn.disabled = !hasValue;
          }
          
          // Initial check
          updateSubmitButton();
          
          // Listen for input changes
          inputField.addEventListener('input', updateSubmitButton);
          
          function submit() {
            const value = inputField.value.trim();
            if (value) {
              ipcRenderer.send('input-dialog-result', value);
              window.close();
            }
          }
          
          function cancel() {
            ipcRenderer.send('input-dialog-result', null);
            window.close();
          }
          
          // Keyboard handling
          inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          });
          
          // Focus the input field
          inputField.focus();
          inputField.select();
        </script>
      </body>
      </html>
    `;
    
    // Create native window with system theme support
    const inputWindow = new BrowserWindow({
      width: 420,
      height: 200,
      resizable: false,
      modal: true,
      parent: focusedWindow,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false
      },
      title: title,
      icon: path.join(__dirname, iconPath),
      show: false,
      // Enable native theme detection
      titleBarStyle: process.platform === 'win32' ? 'default' : 'hiddenInset',
      backgroundColor: process.platform === 'win32' ? '#00000000' : undefined, // Transparent for system theme
      vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
      backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined
    });
    
    // Handle the result from the input dialog
    let resolved = false;
    const handleResult = (event, value) => {
      if (!resolved) {
        resolved = true;
        result = value;
        ipcMain.removeListener('input-dialog-result', handleResult);
        inputWindow.close();
      }
    };
    
    ipcMain.on('input-dialog-result', handleResult);
    
    inputWindow.loadURL('data:text/html,' + encodeURIComponent(html));
    inputWindow.setMenu(null);
    
    // Show window when ready
    inputWindow.once('ready-to-show', () => {
      inputWindow.show();
      inputWindow.focus();
    });
    
    inputWindow.on('closed', () => {
      if (!resolved) {
        resolved = true;
        ipcMain.removeListener('input-dialog-result', handleResult);
      }
      resolve(result);
    });
  });
}

// IPC Handlers for Session Management
let ipcHandlersSetup = false;

function setupSessionIPC() {
  if (!sessionManager || ipcHandlersSetup) return;
  
  ipcHandlersSetup = true;
  
  ipcMain.handle('session-is-enabled', () => {
    return sessionManager.isSessionManagementEnabled();
  });
  
  ipcMain.handle('session-get-current', () => {
    return sessionManager.getCurrentSession();
  });
  
  ipcMain.handle('session-get-all', () => {
    return sessionManager.getAllSessions();
  });
    ipcMain.handle('session-create', async (event, name) => {
    const sessionId = sessionManager.createSession(null, name);
    refreshSessionMenuIfVisible();
    // Open the new session in a new window instead of switching
    await switchToSession(sessionId);
    return sessionId;
  });
    ipcMain.handle('session-rename', async (event, sessionId, name) => {
    const result = sessionManager.renameSession(sessionId, name);
    updateWindowTitle(sessionId); // Update only the specific session's window
    refreshSessionMenuIfVisible();
    return result;
  });
  
  ipcMain.handle('session-delete', async (event, sessionId) => {
    return sessionManager.deleteSession(sessionId);
  });
  
  ipcMain.handle('session-switch', async (event, sessionId) => {
    return switchToSession(sessionId);
  });
    ipcMain.handle('session-set-default', async (event, sessionId) => {
    return sessionManager.setAsDefault(sessionId);
  });
  // Connection error page handlers
  ipcMain.handle('get-app-url', () => {
    return process.env.APP_URL || 'about:blank';
  });

  ipcMain.handle('retry-connection', () => {
    // Get the focused window and reload it
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      const appUrl = process.env.APP_URL || 'about:blank';
      console.log(`🔄 Retrying connection to ${appUrl}...`);
      focusedWindow.loadURL(appUrl).catch(error => {
        console.log(`❌ Retry failed:`, error);
        // Error page will be shown again by the did-fail-load handler
      });
    }
  });

  ipcMain.handle('open-dev-tools', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && focusedWindow.webContents) {
      focusedWindow.webContents.openDevTools();
    }
  });
}

// App event handlers
app.whenReady().then(() => {
  // Initialize session manager first to determine default session
  try {
    const SessionManager = require('./sessionManager');
    if (!sessionManager) {
      sessionManager = new SessionManager();
    }
    
    // Get the default session ID
    const defaultSessionId = sessionManager.isSessionManagementEnabled() 
      ? sessionManager.getDefaultSession() 
      : null;
    
    console.log(`🚀 App starting up - Default session: ${defaultSessionId}`);
    
    // Create window with default session
    createWindow(defaultSessionId);
  } catch (error) {
    console.error('Error during startup:', error);
    // Fallback to basic window creation
    createWindow();
  }
    createMenu();
  setupSessionIPC();
  
  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (process.platform === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
      // If no windows exist, open the default session
      try {
        const defaultSessionId = sessionManager && sessionManager.isSessionManagementEnabled() 
          ? sessionManager.getDefaultSession() 
          : null;
        createWindow(defaultSessionId);
      } catch (error) {
        createWindow();
      }
    } else if (mainWindow && !mainWindow.isDestroyed()) {
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

// Show hotkey window with native system theme support
function showHotkeyWindow() {
  const focusedWindow = BrowserWindow.getFocusedWindow() || mainWindow;
  
  // Get icon path from .env
  const iconPath = process.platform === 'win32' 
    ? (process.env.WIN_ICON || 'assets/icon.ico')
    : (process.env.MAC_ICON || 'assets/icon.png');
  
  // Create native window with system theme support
  const hotkeyWindow = new BrowserWindow({
    width: 520,
    height: 580,
    resizable: false,
    modal: false,
    parent: focusedWindow,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    title: 'Keyboard Shortcuts',
    icon: path.join(__dirname, iconPath),
    show: false,
    // Enable native theme detection
    titleBarStyle: process.platform === 'win32' ? 'default' : 'hiddenInset',
    backgroundColor: process.platform === 'win32' ? '#00000000' : undefined, // Transparent for system theme
    vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
    backgroundMaterial: process.platform === 'win32' ? 'acrylic' : undefined
  });
  
  // Build hotkey data
  const hotkeyData = [
    { category: 'General Navigation', shortcuts: [
      { key: 'F1', description: 'Show this hotkey reference' },
      { key: 'F10', description: 'Toggle menu bar visibility' },
      { key: 'F11', description: 'Toggle fullscreen mode' },
      { key: 'F12', description: 'Toggle Developer Tools (like Chrome)' }
    ]},
    { category: 'Session Management', shortcuts: [
      { key: process.platform === 'darwin' ? 'Cmd+Shift+N' : 'Ctrl+Shift+N', description: 'Create new session' },
      { key: process.platform === 'darwin' ? 'Cmd+N' : 'Ctrl+N', description: 'Rename current session' },
      { key: process.platform === 'darwin' ? 'Cmd+Delete' : 'Ctrl+Delete', description: 'Delete current session' }
    ]},
    { category: 'Advanced', shortcuts: [
      { key: process.platform === 'darwin' ? 'Cmd+Alt+Shift+R' : 'Ctrl+Alt+Shift+R', description: 'Clear cache & storage, then reload' }
    ]}
  ];
  
  // Create native HTML with system theme CSS
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Keyboard Shortcuts</title>
      <style>
        :root {
          color-scheme: light dark;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Variable', system-ui, sans-serif;
          margin: 0;
          padding: 20px;
          background: Canvas;
          color: CanvasText;
          font-size: 13px;
          line-height: 1.4;
          overflow-x: hidden;
        }
  
        
        .category {
          margin-bottom: 20px;
        }
        
        .category:last-of-type {
          margin-bottom: 16px;
        }
        
        .category-title {
          font-size: 13px;
          font-weight: 600;
          color: AccentColor;
          margin: 0 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 1px solid;
          border-color: color-mix(in srgb, AccentColor 30%, transparent);
        }
        
        .shortcuts-table {
          width: 100%;
          border-collapse: collapse;
          background: color-mix(in srgb, Canvas 95%, CanvasText 5%);
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid;
          border-color: color-mix(in srgb, CanvasText 15%, transparent);
        }
        
        .shortcut-row {
          border-bottom: 1px solid;
          border-color: color-mix(in srgb, CanvasText 10%, transparent);
        }
        
        .shortcut-row:last-child {
          border-bottom: none;
        }
        
        .shortcut-row:hover {
          background: color-mix(in srgb, AccentColor 8%, Canvas);
        }
        
        .shortcut-key {
          padding: 8px 12px;
          width: 140px;
          vertical-align: middle;
          border-right: 1px solid;
          border-color: color-mix(in srgb, CanvasText 10%, transparent);
        }
        
        .key-combo {
          font-family: 'Segoe UI Mono', 'Cascadia Code', 'Consolas', monospace;
          font-size: 11px;
          font-weight: 600;
          color: AccentColor;
          background: color-mix(in srgb, AccentColor 10%, Canvas);
          padding: 3px 6px;
          border-radius: 4px;
          border: 1px solid;
          border-color: color-mix(in srgb, AccentColor 25%, transparent);
          white-space: nowrap;
        }
        
        .shortcut-description {
          padding: 8px 12px;
          color: CanvasText;
          font-size: 12px;
          vertical-align: middle;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid;
          border-color: color-mix(in srgb, CanvasText 15%, transparent);
          font-size: 11px;
          color: color-mix(in srgb, CanvasText 60%, transparent);
        }
        
        /* Dark mode specific adjustments */
        @media (prefers-color-scheme: dark) {
          .shortcuts-table {
            background: color-mix(in srgb, Canvas 90%, white 10%);
          }
          
          .shortcut-row:hover {
            background: color-mix(in srgb, AccentColor 12%, Canvas);
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .shortcuts-table {
            border: 2px solid CanvasText;
          }
          
          .category-title {
            border-bottom: 2px solid AccentColor;
          }
          
          .key-combo {
            border: 2px solid AccentColor;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .shortcut-row {
            transition: none;
          }
        }
      </style>
    </head>    <body>
      ${hotkeyData.map(category => `
        <div class="category">
          <h2 class="category-title">${category.category}</h2>
          <table class="shortcuts-table">
            ${category.shortcuts.map(shortcut => `
              <tr class="shortcut-row">
                <td class="shortcut-key">
                  <span class="key-combo">${shortcut.key}</span>
                </td>
                <td class="shortcut-description">${shortcut.description}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `).join('')}
      
      <div class="footer">
        Press <span style="font-family: monospace; font-weight: 600;">Esc</span> or <span style="font-family: monospace; font-weight: 600;">F1</span> to close • Auto-closes in 30 seconds
      </div>
    </body>
    </html>
  `;
  
  hotkeyWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  
  // Show window when ready
  hotkeyWindow.once('ready-to-show', () => {
    hotkeyWindow.show();
    hotkeyWindow.focus();
  });
  
  // Handle keyboard shortcuts
  hotkeyWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.key === 'Escape' || input.key === 'F1') && input.type === 'keyDown') {
      if (!hotkeyWindow.isDestroyed()) {
        hotkeyWindow.close();
      }
    }
  });
  
  // Auto-close after 30 seconds
  setTimeout(() => {
    if (!hotkeyWindow.isDestroyed()) {
      hotkeyWindow.close();
    }
  }, 30000);
  
  // Remove menu bar
  hotkeyWindow.setMenu(null);
}
