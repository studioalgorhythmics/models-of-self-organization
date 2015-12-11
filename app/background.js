// This is main process of Electron, started as first thing when your
// app starts. This script is running through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

var app = require('app');
var BrowserWindow = require('browser-window');
var env = require('./vendor/electron_boilerplate/env_config');
var devHelper = require('./vendor/electron_boilerplate/dev_helper');
var windowStateKeeper = require('./vendor/electron_boilerplate/window_state');

var Menu = require('menu');

var mainWindow;

// Preserver of the window size and position between app launches.
var mainWindowState = windowStateKeeper('main', {
  width: 1000,
  height: 600
});

function makeMenu() {
  var template = [
    {
      label: 'Models of Segregation',
      submenu: [
        {
          label: 'About Models of Segregation',
          selector: 'orderFrontStandardAboutPanel:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          label: 'Hide Electron',
          accelerator: 'Command+H',
          selector: 'hide:'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:'
        },
        {
          label: 'Show All',
          selector: 'unhideAllApplications:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { app.quit(); }
        },
      ]
    },
    {
      label: 'Models',
      submenu: [
        {
          label: 'Segregation',
          accelerator: 'Command+1',
          click: function() {
            BrowserWindow.getFocusedWindow()
              .webContents.send('select-model', 'segregation');
          }
        },
        {
          label: 'Homeostat',
          accelerator: 'Command+2',
          click: function() {
            BrowserWindow.getFocusedWindow()
              .webContents.send('select-model', 'homeostat');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: function() {
            BrowserWindow.getFocusedWindow().reloadIgnoringCache();
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'Alt+Command+I',
          click: function() {
            BrowserWindow.getFocusedWindow().toggleDevTools();
          }
        },
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:'
        },
        {
          label: 'Close',
          accelerator: 'Command+W',
          selector: 'performClose:'
        },
        {
          type: 'separator'
        },
        {
          label: 'Bring All to Front',
          selector: 'arrangeInFront:'
        },
      ]
    },
    {
      label: 'Help',
      submenu: []
    },
  ];

  var menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu); // Must be called within app.on('ready', function(){ ... });
}

app.on('ready', function() {

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height
  });

  if (mainWindowState.isMaximized) {
    mainWindow.maximize();
  }

  if (env.name === 'test') {
    mainWindow.loadUrl('file://' + __dirname + '/spec.html');
  } else {
    mainWindow.loadUrl('file://' + __dirname + '/app.html');
  }

  if (env.name !== 'production') {
    devHelper.setDevMenu();
    mainWindow.openDevTools();
  }

  mainWindow.on('close', function() {
    mainWindowState.saveState(mainWindow);
  });

  makeMenu();
});

app.on('window-all-closed', function() {
  app.quit();
});
