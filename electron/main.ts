// electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 添加日志（方便调试）
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // 判断是否开发环境
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

  // 生产环境配置自动更新
  if (!isDev) {
    setupAutoUpdater()
  }
}

// 配置自动更新
function setupAutoUpdater() {
  // 设置更新服务器地址（使用GitHub）
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'wch919',
    repo: 'electron-',
    private: false
  })
  
  // 启动后3秒检查更新
  setTimeout(() => {
    log('检查更新...')
    autoUpdater.checkForUpdates()
  }, 3000)
  
  // 每小时检查一次
  setInterval(() => {
    log('定时检查更新...')
    autoUpdater.checkForUpdates()
  }, 60 * 60 * 1000)
  
  // 更新事件监听
  autoUpdater.on('checking-for-update', () => {
    log('正在检查更新...')
    mainWindow?.webContents.send('update-status', '正在检查更新...')
  })
  
  autoUpdater.on('update-available', (info) => {
    log('发现新版本:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })
  
  autoUpdater.on('update-not-available', () => {
    log('当前已是最新版本')
    mainWindow?.webContents.send('update-status', '当前已是最新版本')
  })
  
  autoUpdater.on('error', (err) => {
    log('更新错误:', err.message)
    mainWindow?.webContents.send('update-error', err.message)
  })
  
  autoUpdater.on('download-progress', (progress) => {
    log(`下载进度: ${progress.percent.toFixed(2)}%`)
    mainWindow?.webContents.send('update-progress', progress)
  })
  
  autoUpdater.on('update-downloaded', (info) => {
    log('更新下载完成:', info.version)
    mainWindow?.webContents.send('update-downloaded', info)
  })
}

// IPC通信
ipcMain.handle('start-download', () => {
  log('开始下载更新')
  autoUpdater.downloadUpdate()
})

ipcMain.handle('quit-and-install', () => {
  log('退出并安装更新')
  autoUpdater.quitAndInstall()
})

ipcMain.handle('check-for-updates', () => {
  log('手动检查更新')
  autoUpdater.checkForUpdates()
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})