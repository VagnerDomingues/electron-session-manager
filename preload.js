const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the renderer process here
  platform: process.platform,
  
  // Example: Add notification support
  showNotification: (title, body) => {
    new Notification(title, { body });
  }
});

// Enhance WhatsApp Web experience
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
