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
import type { UpdateInfo, DownloadProgress, UpdateStatus } from '../../types/electron'

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