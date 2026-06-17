"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 更新事件监听
  onUpdateStatus: (callback) => {
    electron.ipcRenderer.on("update-status", (_, status) => callback(status));
  },
  onUpdateAvailable: (callback) => {
    electron.ipcRenderer.on("update-available", (_, info) => callback(info));
  },
  onUpdateProgress: (callback) => {
    electron.ipcRenderer.on("update-progress", (_, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback) => {
    electron.ipcRenderer.on("update-downloaded", (_, info) => callback(info));
  },
  onUpdateError: (callback) => {
    electron.ipcRenderer.on("update-error", (_, error) => callback(error));
  },
  // 操作方法
  startDownload: () => electron.ipcRenderer.invoke("start-download"),
  quitAndInstall: () => electron.ipcRenderer.invoke("quit-and-install"),
  checkForUpdates: () => electron.ipcRenderer.invoke("check-for-updates"),
  getAppVersion: () => electron.ipcRenderer.invoke("get-app-version")
});
console.log("Preload script loaded successfully");
