"use strict";
const electron = require("electron");
const electronUpdater = require("electron-updater");
const path = require("path");
const url = require("url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
const log = (message) => {
  console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}`);
};
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname$1, "preload.js")
    }
  });
  const isDev = !electron.app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
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
    log("检查更新...");
    electronUpdater.autoUpdater.checkForUpdates();
  }, 3e3);
  setInterval(() => {
    log("定时检查更新...");
    electronUpdater.autoUpdater.checkForUpdates();
  }, 60 * 60 * 1e3);
  electronUpdater.autoUpdater.on("checking-for-update", () => {
    log("正在检查更新...");
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-status", "正在检查更新...");
  });
  electronUpdater.autoUpdater.on("update-available", (info) => {
    log("发现新版本:", info.version);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-available", info);
  });
  electronUpdater.autoUpdater.on("update-not-available", () => {
    log("当前已是最新版本");
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-status", "当前已是最新版本");
  });
  electronUpdater.autoUpdater.on("error", (err) => {
    log("更新错误:", err.message);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-error", err.message);
  });
  electronUpdater.autoUpdater.on("download-progress", (progress) => {
    log(`下载进度: ${progress.percent.toFixed(2)}%`);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-progress", progress);
  });
  electronUpdater.autoUpdater.on("update-downloaded", (info) => {
    log("更新下载完成:", info.version);
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-downloaded", info);
  });
}
electron.ipcMain.handle("start-download", () => {
  log("开始下载更新");
  electronUpdater.autoUpdater.downloadUpdate();
});
electron.ipcMain.handle("quit-and-install", () => {
  log("退出并安装更新");
  electronUpdater.autoUpdater.quitAndInstall();
});
electron.ipcMain.handle("check-for-updates", () => {
  log("手动检查更新");
  electronUpdater.autoUpdater.checkForUpdates();
});
electron.ipcMain.handle("get-app-version", () => {
  return electron.app.getVersion();
});
electron.app.whenReady().then(() => {
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
