// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null

// 配置自动更新
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// 获取 preload 脚本的正确路径
function getPreloadPath(): string {
  const isDev = !app.isPackaged
  
  if (isDev) {
    const devPath = path.join(__dirname, 'preload.ts')
    if (fs.existsSync(devPath)) {
      console.log('Using dev preload:', devPath)
      return devPath
    }
  }
  
  const possiblePaths = [
    path.join(__dirname, 'preload.js'),
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'preload.js'),
    path.join(__dirname, '../dist-electron/preload.js')
  ]
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('Using preload:', p)
      return p
    }
  }
  
  console.error('Preload script not found')
  return ''
}

function createWindow(): void {
  const preloadPath = getPreloadPath()
  
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    icon: path.join(__dirname, '../public/icon.ico'),
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  const isDev = !app.isPackaged
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (!isDev) {
    setupAutoUpdater()
  }
}

// 配置自动更新
function setupAutoUpdater() {
  // 配置 GitHub 更新源
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'wch919',
    repo: 'electron-',
    private: false
  })
  
  // 启动后5秒检查更新
  setTimeout(() => {
    console.log('Checking for updates...')
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Update check failed:', err)
    })
  }, 5000)
  
  // 每小时检查一次
  setInterval(() => {
    console.log('Scheduled update check...')
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Scheduled update check failed:', err)
    })
  }, 60 * 60 * 1000)
  
  // 更新事件监听
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
    mainWindow?.webContents.send('update-status', '正在检查更新...')
  })
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })
  
  autoUpdater.on('update-not-available', () => {
    console.log('Update not available')
    mainWindow?.webContents.send('update-status', '当前已是最新版本')
  })
  
  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
    mainWindow?.webContents.send('update-error', err.message)
  })
  
  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(2)}%`)
    mainWindow?.webContents.send('update-progress', progress)
  })
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    mainWindow?.webContents.send('update-downloaded', info)
  })
}

// IPC 通信
ipcMain.handle('start-download', () => {
  console.log('Starting download...')
  autoUpdater.downloadUpdate()
})

ipcMain.handle('quit-and-install', () => {
  console.log('Quitting and installing...')
  autoUpdater.quitAndInstall()
})

ipcMain.handle('check-for-updates', () => {
  console.log('Manual check for updates...')
  autoUpdater.checkForUpdates()
})

ipcMain.handle('get-app-version', () => {
  const version = app.getVersion()
  console.log('Current version:', version)
  return version
})

app.whenReady().then(() => {
  console.log('App ready, creating window...')
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})