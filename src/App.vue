<template>
  <div id="app">
    <div class="header">
      <h1>Electron + Vue3 + 桌面应用</h1>
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
    <AutoUpdate />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AutoUpdate from './components/AutoUpdate.vue'

const version = ref('1.1.0')
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
  background: rgba(170, 241, 176, 0.95);
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