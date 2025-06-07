const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

class SessionManager {
  constructor() {
    this.sessionsData = {};
    this.currentSessionId = 'session-1';
    this.defaultSessionId = 'session-1';
    this.sessionsDir = path.join(app.getPath('userData'), 'sessions');
    this.sessionsConfigFile = path.join(this.sessionsDir, 'sessions.json');
    this.isEnabled = process.env.ENABLE_MULTIPLE_SESSION_IDS === 'true';
    
    if (this.isEnabled) {
      this.initializeSessions();
    }
  }

  isSessionManagementEnabled() {
    return this.isEnabled;
  }

  initializeSessions() {
    // Create sessions directory if it doesn't exist
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }

    // Load existing sessions or create default
    this.loadSessions();
    
    // Ensure default session exists
    if (!this.sessionsData['session-1']) {
      this.createSession('session-1', 'Default Session');
      this.setAsDefault('session-1');
    }
  }
  loadSessions() {
    try {
      if (fs.existsSync(this.sessionsConfigFile)) {
        const data = fs.readFileSync(this.sessionsConfigFile, 'utf8');
        const parsed = JSON.parse(data);
        this.sessionsData = parsed.sessions || {};
        this.defaultSessionId = parsed.defaultSession || 'session-1';
        this.currentSessionId = parsed.currentSession || this.defaultSessionId;
      } else {
        this.sessionsData = {};
        this.defaultSessionId = 'session-1';
        this.currentSessionId = 'session-1';
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.sessionsData = {};
      this.defaultSessionId = 'session-1';
      this.currentSessionId = 'session-1';
    }
  }
  saveSessions() {
    try {
      const data = {
        sessions: this.sessionsData,
        defaultSession: this.defaultSessionId,
        currentSession: this.currentSessionId,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.sessionsConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }

  createSession(sessionId = null, name = null) {
    if (!this.isEnabled) return null;

    // Generate new session ID if not provided
    if (!sessionId) {
      let counter = Object.keys(this.sessionsData).length + 1;
      do {
        sessionId = `session-${counter}`;
        counter++;
      } while (this.sessionsData[sessionId]);
    }

    // Create session directory
    const sessionDir = path.join(this.sessionsDir, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Create session data
    this.sessionsData[sessionId] = {
      id: sessionId,
      name: name || `Session ${sessionId.split('-')[1]}`,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      dataPath: sessionDir
    };

    this.saveSessions();
    return sessionId;
  }

  renameSession(sessionId, newName) {
    if (!this.isEnabled || !this.sessionsData[sessionId]) return false;

    this.sessionsData[sessionId].name = newName;
    this.sessionsData[sessionId].lastUsed = new Date().toISOString();
    this.saveSessions();
    return true;
  }

  deleteSession(sessionId) {
    if (!this.isEnabled || sessionId === 'session-1' || !this.sessionsData[sessionId]) {
      return false; // Cannot delete default session
    }

    try {
      // Remove session directory
      const sessionDir = this.sessionsData[sessionId].dataPath;
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      // Remove from sessions data
      delete this.sessionsData[sessionId];

      // If this was the default, reset to session-1
      if (this.defaultSessionId === sessionId) {
        this.defaultSessionId = 'session-1';
      }

      // If this was current, switch to default
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = this.defaultSessionId;
      }

      this.saveSessions();
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  deleteAllSessions() {
    if (!this.isEnabled) return false;

    try {
      // Keep only session-1
      const defaultSession = this.sessionsData['session-1'];
      
      // Delete all other session directories
      Object.keys(this.sessionsData).forEach(sessionId => {
        if (sessionId !== 'session-1') {
          const sessionDir = this.sessionsData[sessionId].dataPath;
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        }
      });

      // Reset sessions data
      this.sessionsData = { 'session-1': defaultSession };
      this.defaultSessionId = 'session-1';
      this.currentSessionId = 'session-1';

      this.saveSessions();
      return true;
    } catch (error) {
      console.error('Error deleting all sessions:', error);
      return false;
    }
  }

  setAsDefault(sessionId) {
    if (!this.isEnabled || !this.sessionsData[sessionId]) return false;

    this.defaultSessionId = sessionId;
    this.saveSessions();
    return true;
  }

  switchToSession(sessionId) {
    if (!this.isEnabled || !this.sessionsData[sessionId]) return false;

    this.currentSessionId = sessionId;
    this.sessionsData[sessionId].lastUsed = new Date().toISOString();
    this.saveSessions();
    return true;
  }

  getCurrentSession() {
    return this.currentSessionId;
  }

  getDefaultSession() {
    return this.defaultSessionId;
  }

  getAllSessions() {
    return this.sessionsData;
  }

  getSessionDataPath(sessionId = null) {
    if (!this.isEnabled) return null;
    
    const id = sessionId || this.currentSessionId;
    return this.sessionsData[id] ? this.sessionsData[id].dataPath : null;
  }

  getSessionName(sessionId = null) {
    if (!this.isEnabled) return null;
    
    const id = sessionId || this.currentSessionId;
    return this.sessionsData[id] ? this.sessionsData[id].name : null;
  }

  // Dialog helpers
  async showRenameDialog(mainWindow, sessionId = null) {
    const id = sessionId || this.currentSessionId;
    const currentName = this.getSessionName(id);
    
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Rename Session',
      message: `Enter new name for "${currentName}":`,
      buttons: ['Cancel', 'Rename'],
      defaultId: 1,
      cancelId: 0,
      detail: 'Session name can be up to 50 characters long.'
    });

    if (result.response === 1) {
      // Show input dialog (we'll implement this in the renderer process)
      return true;
    }
    return false;
  }

  async showDeleteConfirmation(mainWindow, sessionId = null, deleteAll = false) {
    const id = sessionId || this.currentSessionId;
    const sessionName = this.getSessionName(id);
    
    let message, detail;
    if (deleteAll) {
      message = 'Delete all sessions except the default?';
      detail = 'This action cannot be undone. All session data will be permanently deleted.';
    } else {
      message = `Delete session "${sessionName}"?`;
      detail = 'This action cannot be undone. All data for this session will be permanently deleted.';
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Confirm Deletion',
      message: message,
      detail: detail,
      buttons: ['Cancel', 'Delete'],
      defaultId: 0,
      cancelId: 0
    });

    return result.response === 1;
  }
}

module.exports = SessionManager;