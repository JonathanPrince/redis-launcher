'use strict'
const electron = require('electron')
const spawn = require('child_process').spawn
const app = electron.app
const Menu = electron.Menu
const Tray = electron.Tray

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')()

// prevent window being garbage collected
let mainWindow
let serverProcess
let appIcon

function onClosed () {
  mainWindow = null
}

function createMainWindow () {
  const win = new electron.BrowserWindow({
    width: 600,
    height: 400
  })

  win.loadURL(`file://${__dirname}/index.html`)
  win.on('closed', onClosed)
  win.on('show', () => app.dock.show())

  return win
}

function startRedisServer (port) {
  console.log('starting redis server...')
  if (!serverProcess) {
    serverProcess = spawn('/usr/local/bin/redis-server', {detached: true})
    serverProcess.stdout.on('data', (data) => {
      console.log('data:', data.toString())
    })
  }
}

function stopRedisServer () {
  console.log('stopping redis server')
  if (serverProcess) {
    serverProcess.kill('SIGKILL')
    serverProcess = null
  }
}

function setupMenuBar () {
  appIcon = new Tray(`${__dirname}/assets/images/tray-icon.png`)
  var contextMenu = Menu.buildFromTemplate([
    { label: 'Open Window',
      click: () => {
        if (!mainWindow) {
          mainWindow = createMainWindow()
        } else {
          mainWindow.show()
        }
      }
    },
    { type: 'separator' },
    { label: 'Start Server', click: () => startRedisServer() },
    { label: 'Stop Server', click: () => stopRedisServer() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])
  appIcon.setToolTip('This is my application.')
  appIcon.setContextMenu(contextMenu)
}

app.on('window-all-closed', () => {
  app.dock.hide()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
})

app.on('ready', () => {
  mainWindow = createMainWindow()
  setupMenuBar()
  startRedisServer()
})

app.on('quit', () => {
  stopRedisServer()
})
