const { contextBridge, ipcRenderer } = require('electron')

// Expose secure APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Notifications
  showNotification: (title, body, type = 'info') => {
    ipcRenderer.send('show-notification', { title, body, type })
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Deployment updates (send from renderer to main)
  sendDeployments: (deployments) => {
    ipcRenderer.send('deployment-update', deployments)
  },

  // Deployment updates (receive from main to overlay)
  onDeploymentUpdate: (callback) => {
    ipcRenderer.on('deployment-update', (event, deployments) => callback(deployments))
  },

  // Notes widget APIs
  onConfig: (callback) => {
    ipcRenderer.on('widget-config', (event, config) => callback(config))
  },
  onRefresh: (callback) => {
    ipcRenderer.on('widget-refresh', () => callback())
  },
  openCRM: () => ipcRenderer.send('widget-open-crm'),
  openNote: (noteId) => ipcRenderer.send('widget-open-note', noteId),
  closeWidget: () => ipcRenderer.send('widget-close'),
  openSettings: () => ipcRenderer.send('widget-open-settings'),

  // App info
  isElectron: true,
  platform: process.platform,
})
