const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the renderer process here
  platform: process.platform,
  
  // Example: Add notification support
  showNotification: (title, body) => {
    new Notification(title, { body });
  },
  
  // Connection error page APIs
  getAppUrl: () => ipcRenderer.invoke('get-app-url'),
  retryConnection: () => ipcRenderer.invoke('retry-connection'),
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
  
  // Session Management APIs
  sessionManagement: {
    isEnabled: () => ipcRenderer.invoke('session-is-enabled'),
    getCurrentSession: () => ipcRenderer.invoke('session-get-current'),
    getAllSessions: () => ipcRenderer.invoke('session-get-all'),
    createSession: (name) => ipcRenderer.invoke('session-create', name),
    renameSession: (sessionId, name) => ipcRenderer.invoke('session-rename', sessionId, name),
    deleteSession: (sessionId) => ipcRenderer.invoke('session-delete', sessionId),
    switchToSession: (sessionId) => ipcRenderer.invoke('session-switch', sessionId),
    setAsDefault: (sessionId) => ipcRenderer.invoke('session-set-default', sessionId),
    toggleMenu: () => ipcRenderer.invoke('session-toggle-menu')
  }
});

// Enhance Web experience
window.addEventListener('DOMContentLoaded', () => {
  // Add custom CSS for better desktop experience
  const style = document.createElement('style');
  style.textContent = `
    /* Hide mobile-specific elements */
    ._2dYSO,
    ._1AWE9 {
      display: none !important;
    }
    
    /* Improve scrollbar appearance */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `;
  document.head.appendChild(style);
});

// Handle notifications
window.addEventListener('DOMContentLoaded', () => {
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

// Session Management - Keyboard Shortcuts Only
window.addEventListener('DOMContentLoaded', () => {
  // Only add keyboard shortcuts if session management is enabled
  if (window.electronAPI && window.electronAPI.sessionManagement) {
    window.electronAPI.sessionManagement.isEnabled().then(enabled => {
      if (enabled) {
        setupKeyboardShortcuts();
      }
    });
  }
});

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // F1 to toggle session menu
    if (event.key === 'F1') {
      event.preventDefault();
      window.electronAPI.sessionManagement.toggleMenu();
    }
    
    // Ctrl+Shift+N for new session (optional)
    if (event.ctrlKey && event.shiftKey && event.key === 'N') {
      event.preventDefault();
      const name = prompt('Enter new session name:');
      if (name && name.trim()) {
        window.electronAPI.sessionManagement.createSession(name.trim());
      }
    }
  });
}
