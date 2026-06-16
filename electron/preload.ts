// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

// 定义 API 类型
interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 更新事件监听
  onUpdateStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('update-status', (_, status) => callback(status))
  },
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
  },
  onUpdateProgress: (callback: (progress: DownloadProgress) => void) => {
    ipcRenderer.on('update-progress', (_, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error))
  },
  
  // 操作方法
  startDownload: () => ipcRenderer.invoke('start-download'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
})

console.log('Preload script loaded successfully')