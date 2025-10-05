import * as path from 'path';
import * as url from 'url';

import { app, BrowserWindow } from 'electron';

import { registerIpcHandlers } from './ipc-handlers';

// Security: Disable GPU acceleration for better compatibility
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

let mainWindow: BrowserWindow | null = null;

// Determine if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

function createWindow(): void {
  // Create the browser window with security best practices
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#1a1a1a',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      // Security: Enable context isolation
      contextIsolation: true,
      // Security: Disable Node.js integration in renderer
      nodeIntegration: false,
      // Security: Enable sandbox
      sandbox: true,
      // Preload script for secure IPC
      preload: path.join(__dirname, 'preload.js'),
      // Security: Disable web security in dev only
      webSecurity: !isDevelopment,
      // Security: Disable DevTools in production
      devTools: isDevelopment,
    },
  });

  // Load the app
  if (isDevelopment) {
    // Development mode: Load from Vite dev server
    void mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode: Load from built files
    void mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, './renderer/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle events
void app.whenReady().then(async () => {
  // Initialize database first using dynamic import for ES module
  try {
    const { initializeDatabase } = await import('@polynote/shared');
    initializeDatabase();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
    return;
  }

  // Register IPC handlers
  registerIpcHandlers();

  createWindow();

  app.on('activate', () => {
    // macOS: Re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Only allow localhost in development
    if (isDevelopment && parsedUrl.hostname === 'localhost') {
      return;
    }

    // Block all other navigations
    event.preventDefault();
  });

  // Security: Prevent new window creation
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

// Export for IPC handlers
export { mainWindow };
