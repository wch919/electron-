"use strict";
const electron = require("electron");
const electronUpdater = require("electron-updater");
const path = require("path");
const fs = require("fs");
let mainWindow = null;
electronUpdater.autoUpdater.autoDownload = false;
electronUpdater.autoUpdater.autoInstallOnAppQuit = true;
function getPreloadPath() {
  const isDev = !electron.app.isPackaged;
  if (isDev) {
    const devPath = path.join(__dirname, "preload.ts");
    if (fs.existsSync(devPath)) {
      console.log("Using dev preload:", devPath);
      return devPath;
    }
  }
  const possiblePaths = [
    path.join(__dirname, "preload.js"),
    path.join(process.resourcesPath, "app.asar", "dist-electron", "preload.js"),
    path.join(__dirname, "../dist-electron/preload.js")
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log("Using preload:", p);
      return p;
    }
  }
  console.error("Preload script not found");
  return "";
}
function createWindow() {
  const preloadPath = getPreloadPath();
  mainWindow = new electron.BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    icon: path.join(__dirname, "../public/icon.ico"),
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  const isDev = !electron.app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  if (!isDev) {
    setupAutoUpdater();
  }
}
function setupAutoUpdater() {
  electronUpdater.autoUpdater.setFeedURL({
    provider: "github",
    owner: "wch919",
    repo: "electron-",
    private: false
  });
  setTimeout(() => {
    console.log("Checking for updates...");
    electronUpdater.autoUpdater.checkForUpdates().catch((err) => {
      console.error("Update check failed:", err);
    });
  }, 5e3);
  setInterval(() => {
    console.log("Scheduled update check...");
    electronUpdater.autoUpdater.checkForUpdates().catch((err) => {
      console.error("Scheduled update check failed:", err);
    });
  }, 60 * 60 * 1e3);
  electronUpdater.autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-status", "正在检查更新...");
  });
  electronUpdater.autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-available", info);
  });
  electronUpdater.autoUpdater.on("update-not-available", () => {
    console.log("Update not available");
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-status", "当前已是最新版本");
  });
  electronUpdater.autoUpdater.on("error", (err) => {
    console.error("Update error:", err);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-error", err.message);
  });
  electronUpdater.autoUpdater.on("download-progress", (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(2)}%`);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-progress", progress);
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-downloaded", info);
  });
}
electron.ipcMain.handle("start-download", () => {
  console.log("Starting download...");
  electronUpdater.autoUpdater.downloadUpdate();
});
electron.ipcMain.handle("quit-and-install", () => {
  console.log("Quitting and installing...");
  electronUpdater.autoUpdater.quitAndInstall();
});
electron.ipcMain.handle("check-for-updates", () => {
  console.log("Manual check for updates...");
  electronUpdater.autoUpdater.checkForUpdates();
});
electron.ipcMain.handle("get-app-version", () => {
  const version = electron.app.getVersion();
  console.log("Current version:", version);
  return version;
});
electron.app.whenReady().then(() => {
  console.log("App ready, creating window...");
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
