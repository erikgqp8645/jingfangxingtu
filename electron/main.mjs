import {app, BrowserWindow} from 'electron';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ensureWritableAppRoot} from './bootstrap.mjs';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(moduleDir, '..');
const isDev = !app.isPackaged;
const iconPath = path.join(appRoot, 'assets', 'desktop', 'icon.png');

let mainWindow = null;
let localServer = null;

async function createMainWindow() {
  ensureWritableAppRoot({app, isDev, appRoot});

  if (!isDev) {
    const {startLocalServer} = await import('../server/app.mjs');
    localServer = await startLocalServer({
      port: 0,
      staticDir: path.join(appRoot, 'dist'),
    });
  } else {
    localServer = null;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: '#f6f1e8',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setTitle('经方关系图');

  if (isDev) {
    await mainWindow.loadURL(process.env.JINGFANG_ELECTRON_RENDERER_URL || 'http://127.0.0.1:3100');
    mainWindow.webContents.openDevTools({mode: 'detach'});
  } else {
    await mainWindow.loadURL(localServer.url);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', async () => {
  await new Promise(resolve => {
    if (!localServer?.server) {
      resolve();
      return;
    }

    localServer.server.close(() => resolve());
  });
  localServer = null;

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});
