import '@testing-library/jest-dom';

// Mock Electron
global.window = global.window || {};
global.window.electron = {
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    send: jest.fn(),
  },
};
