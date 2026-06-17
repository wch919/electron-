# electron-vue-app 项目创建流程

## 1.项目创建(初始化)

```
npm create vue@latest electron-vue-app
cd electron-vue-app
npm install electron electron-builder electron-updater --save-dev
npm install vite-plugin-electron --save-dev
```

## 2.文件配置

### vite.config

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            external: ['electron', 'electron-updater'],
            input: {
              main: 'electron/main.ts',
              preload: 'electron/preload.ts'  // 明确指定 preload 入口
            }
          }
        }
      }
    })
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})
```

### tsconfig.app.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["node", "vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue", "electron/**/*.ts"],
  "exclude": ["node_modules", "release", "dist"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tsconfig.node.json

```jsonc
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "target": "ES2020",
    "lib": ["ES2020"],
    "types": ["node"]
  },
  "include": ["vite.config.ts", "electron/**/*.ts"]
}
```

### scripts/release.js（发布脚本）

```javascript
// scripts/release.js
const { execSync } = require('child_process')
const readline = require('readline')
const fs = require('fs')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// 读取当前版本
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
const currentVersion = packageJson.version

console.log(`当前版本: v${currentVersion}`)

// 询问新版本号
rl.question('请输入新版本号 (例如: 1.0.1): ', (newVersion) => {
  if (!newVersion) {
    console.log('版本号不能为空')
    rl.close()
    return
  }

  // 更新 package.json
  packageJson.version = newVersion
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))
  console.log(`✅ 版本已更新到 v${newVersion}`)

  // 提交更改
  try {
    execSync('git add package.json', { stdio: 'inherit' })
    execSync(`git commit -m "chore: bump version to v${newVersion}"`, { stdio: 'inherit' })
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' })
    execSync('git push origin main --tags', { stdio: 'inherit' })
    console.log(`✅ 已推送 v${newVersion} 到 GitHub`)
    console.log(`🎉 GitHub Actions 将自动构建并发布`)
  } catch (error) {
    console.error('❌ 发布失败:', error)
  }

  rl.close()
})
```

## 3. Electron主进程 TypeScript

### types/electron.d.ts

```typescript
// src/types/electron.d.ts
export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  files?: Array<{
    url: string;
    size: number;
    sha512: string;
  }>;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export interface ElectronAPI {
  onUpdateStatus: (callback: (status: string) => void) => void;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateProgress: (callback: (progress: DownloadProgress) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  startDownload: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
```

### electron/main.ts

```typescript
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
```

### electron/preload.js

```typescript
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
```

###

## 4.自动更新页面

### components/AutoUpdate.vue

```vue
<template>
  <div class="auto-update">
    <transition name="slide">
      <div v-if="updateStatus" class="update-status" :class="statusClass">
        <div class="status-icon">
          <span v-if="updateStatus.type === 'checking'">🔍</span>
          <span v-else-if="updateStatus.type === 'available'">📦</span>
          <span v-else-if="updateStatus.type === 'downloading'">⬇️</span>
          <span v-else-if="updateStatus.type === 'downloaded'">✅</span>
          <span v-else-if="updateStatus.type === 'error'">❌</span>
        </div>
        <div class="status-content">
          <div class="status-message">{{ updateStatus.message }}</div>
          <div v-if="updateStatus.type === 'downloading' && downloadProgress" class="progress-bar">
            <div class="progress-fill" :style="{ width: downloadProgress.percent + '%' }"></div>
            <span class="progress-text">{{ downloadProgress.percent.toFixed(1) }}%</span>
          </div>
          <div v-if="updateStatus.type === 'available'" class="update-actions">
            <button @click="startDownload" class="btn-update">立即更新</button>
            <button @click="remindLater" class="btn-later">稍后提醒</button>
          </div>
          <div v-if="updateStatus.type === 'downloaded'" class="update-actions">
            <button @click="quitAndInstall" class="btn-install">立即重启安装</button>
            <button @click="installLater" class="btn-later">稍后安装</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { UpdateInfo, DownloadProgress, UpdateStatus } from '@/types/electron'

const updateStatus = ref<UpdateStatus | null>(null)
const downloadProgress = ref<DownloadProgress | null>(null)

const statusClass = computed(() => {
  if (!updateStatus.value) return ''
  return `status-${updateStatus.value.type}`
})

// 监听更新事件
const setupUpdateListeners = (): void => {
  if (!window.electronAPI) {
    console.warn('Electron API not available')
    return
  }

  window.electronAPI.onUpdateStatus((status: string) => {
    updateStatus.value = {
      type: 'checking',
      message: status
    }
  })

  window.electronAPI.onUpdateAvailable((info: UpdateInfo) => {
    updateStatus.value = {
      type: 'available',
      message: `发现新版本 ${info.version}，是否立即更新？`,
      version: info.version
    }
  })

  window.electronAPI.onUpdateProgress((progress: DownloadProgress) => {
    downloadProgress.value = progress
    updateStatus.value = {
      type: 'downloading',
      message: `正在下载更新... ${progress.percent.toFixed(1)}%`,
      progress
    }
  })

  window.electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
    updateStatus.value = {
      type: 'downloaded',
      message: `新版本 ${info.version} 下载完成，重启应用即可安装`,
      version: info.version
    }
  })

  window.electronAPI.onUpdateError((error: string) => {
    updateStatus.value = {
      type: 'error',
      message: `更新失败: ${error}`
    }
    setTimeout(() => {
      if (updateStatus.value?.type === 'error') {
        updateStatus.value = null
      }
    }, 5000)
  })
}

const startDownload = async (): Promise<void> => {
  if (window.electronAPI) {
    await window.electronAPI.startDownload()
  }
}

const quitAndInstall = async (): Promise<void> => {
  if (window.electronAPI) {
    await window.electronAPI.quitAndInstall()
  }
}

const remindLater = (): void => {
  updateStatus.value = null
}

const installLater = (): void => {
  updateStatus.value = null
}

const checkForUpdates = async (): Promise<void> => {
  if (window.electronAPI) {
    await window.electronAPI.checkForUpdates()
  }
}

// 定期检查更新
let checkInterval: number | null = null

onMounted(() => {
  setupUpdateListeners()
  checkForUpdates()
  
  // 每小时检查一次
  checkInterval = window.setInterval(checkForUpdates, 60 * 60 * 1000)
})

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})
</script>

<style scoped>
.auto-update {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}

.update-status {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 16px;
  min-width: 320px;
  max-width: 400px;
  display: flex;
  gap: 12px;
  border-left: 4px solid;
}

.status-checking {
  border-left-color: #409eff;
}

.status-available {
  border-left-color: #e6a23c;
}

.status-downloading {
  border-left-color: #409eff;
}

.status-downloaded {
  border-left-color: #67c23a;
}

.status-error {
  border-left-color: #f56c6c;
}

.status-not-available {
  border-left-color: #909399;
}

.status-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.status-content {
  flex: 1;
}

.status-message {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
}

.progress-bar {
  position: relative;
  background: #f0f0f0;
  border-radius: 4px;
  height: 28px;
  overflow: hidden;
  margin-top: 8px;
}

.progress-fill {
  background: linear-gradient(90deg, #409eff, #66b1ff);
  height: 100%;
  transition: width 0.3s ease;
  position: relative;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: white;
  z-index: 1;
  font-weight: 500;
}

.update-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.btn-update,
.btn-install {
  background: #409eff;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.btn-update:hover,
.btn-install:hover {
  background: #66b1ff;
}

.btn-later {
  background: transparent;
  color: #909399;
  border: 1px solid #dcdfe6;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-later:hover {
  color: #409eff;
  border-color: #409eff;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
```

### App.vue

```vue
<template>
  <div id="app">
    <div class="header">
      <h1>Electron + Vue3</h1>
      <div class="version-info">
        <span>当前版本: v{{ version }}</span>
        <button @click="handleCheckUpdate" class="check-update-btn" :disabled="isChecking">
          {{ isChecking ? '检查中...' : '检查更新' }}
        </button>
      </div>
    </div>
    <div class="content">
      <div class="features">
        <h2>✨ 特性</h2>
        <ul>
          <li>✅ Vue 3 + TypeScript</li>
          <li>✅ Electron 跨平台桌面应用</li>
          <li>✅ 自动更新功能</li>
          <li>✅ 完整的类型安全</li>
          <li>✅ 开发热重载</li>
        </ul>
      </div>
    </div>
    <router-view />
    <AutoUpdate />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AutoUpdate from './components/AutoUpdate.vue'
// import { app } from 'electron'

// console.log(app.getVersion())
const version = ref('1.0.0')
const isChecking = ref(false)

const getAppVersion = async (): Promise<void> => {
  console.log(window.electronAPI.getAppVersion(), window.electronAPI)
  if (window.electronAPI) {
    try {
      const ver = await window.electronAPI.getAppVersion()
      version.value = ver
    } catch (error) {
      console.error('Failed to get app version:', error)
    }
  }
}

const handleCheckUpdate = async (): Promise<void> => {
  if (!window.electronAPI) return
  
  isChecking.value = true
  try {
    await window.electronAPI.checkForUpdates()
    // 3秒后重置按钮状态
    setTimeout(() => {
      isChecking.value = false
    }, 3000)
  } catch (error) {
    console.error('Check update failed:', error)
    isChecking.value = false
  }
}

onMounted(() => {
  getAppVersion()
})
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  background: rgba(252, 252, 252, 0.95);
  padding: 20px 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
}

.header h1 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.check-update-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.check-update-btn:hover:not(:disabled) {
  background: #66b1ff;
  transform: translateY(-1px);
}

.check-update-btn:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}

.content {
  padding: 50px;
  color: white;
  text-align: center;
}

.features {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  margin: 0 auto;
  backdrop-filter: blur(10px);
}

.features h2 {
  margin-bottom: 20px;
  font-size: 28px;
}

.features ul {
  text-align: left;
  list-style: none;
  padding: 0;
}

.features li {
  padding: 10px 0;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.features li:last-child {
  border-bottom: none;
}
</style>
```

<br />

## 5.环境声明文件

### src/env.d.ts

```typescript
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明 Electron API 类型
interface ElectronAPI {
  onUpdateStatus: (callback: (status: string) => void) => void;
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateProgress: (callback: (progress: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
  onUpdateError: (callback: (error: string) => void) => void;
  startDownload: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

## 6.package.json

```json
{
  "name": "electron-vue-app",
  "version": "1.0.0",
  "description": "Electron + Vue3 + TypeScript",
  "main": "dist-electron/main.js",
  "author": "Wan",
  "repository": {
    "type": "git",
    "url": "https://github.com/wch919/electron-.git"
  },
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "electron:dev": "vite",
    "electron:build": "vue-tsc && vite build && electron-builder",
    "electron:build:win": "vue-tsc && vite build && electron-builder --win",
    "electron:build:mac": "vue-tsc && vite build && electron-builder --mac",
    "electron:build:linux": "vue-tsc && vite build && electron-builder --linux",
    "type-check": "vue-tsc --noEmit",
    "release": "node scripts/release.js"
  },
  "build": {
    "appId": "com.yourcompany.electronvueapp",
    "productName": "Electron.Vue.App",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico",
      "artifactName": "Electron.Vue.App.Setup.${version}.${ext}"
    },
    "mac": {
      "target": [
        "dmg",
        "zip"
      ],
      "icon": "public/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": [
        "AppImage",
        "deb"
      ],
      "icon": "public/icon.png",
      "category": "Utility"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "publish": [
      {
        "provider": "github",
        "owner": "wch919",
        "repo": "electron-",
        "private": false
      }
    ]
  },
  "dependencies": {
    "electron-updater": "^6.1.1",
    "pinia": "^3.0.4",
    "vue": "^3.3.4",
    "vue-router": "^4.6.4"
  },
  "devDependencies": {
    "@types/node": "^20.4.2",
    "@vitejs/plugin-vue": "^5.2.4",
    "@vue/tsconfig": "^0.4.0",
    "electron": "^25.3.2",
    "electron-builder": "^24.4.0",
    "electron-log": "^5.4.4",
    "typescript": "^5.0.2",
    "vite": "^5.0.0",
    "vite-plugin-electron": "^0.28.0",
    "vue-tsc": "^2.0.0"
  }
}

```

## 7. 使用GitHub Actions自动构建

### .github/workflows/build.yml

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmmirror.com'  # 设置 npm 镜像
          
      - name: Install dependencies
        run: npm ci
        env:
          npm_config_registry: https://registry.npmmirror.com
          
      - name: Type check
        run: npm run type-check
        
      - name: Build Electron app
        run: npm run electron:build:win
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          # 设置 Electron 镜像环境变量
          ELECTRON_MIRROR: https://npmmirror.com/mirrors/electron/
          ELECTRON_BUILDER_BINARIES_MIRROR: https://npmmirror.com/mirrors/electron-builder-binaries/
          NODE_MIRROR: https://npmmirror.com/mirrors/node/
          
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/*.exe
            release/*.exe.blockmap
            release/*.yml
          draft: false
          prerelease: false
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
```

## 8. 开发和使用命令

# 安装依赖

npm install

# 开发模式运行

npm run dev

# 类型检查

npm run type-check

# 构建生产版本

npm run electron:build

# 构建特定平台

npm run electron:build:win

&#x20;\# Windows

npm run electron:build:mac

&#x20;\# macOS\
npm run electron:build:linux&#x20;

\# Linux

# 9.指令构建自动升级exe指令(github)

git add.

git commit -m '版本更新提示'

git push origin main 

git tag v1.0.0 （指令github自动打包）

git tag origin v1.0.0 （自动构建后续打包程序）

<br />

// 后续本地打包低于github提交版本程序(package.json中version)打开程序后 自动弹窗更新 点击立即更新后即可更新最新版本
