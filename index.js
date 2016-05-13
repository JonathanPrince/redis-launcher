'use strict'
const electron = require('electron')
const childProcess = require('child_process')
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

  return win
}

function startRedisServer (port) {
  serverProcess = childProcess.exec('redis-server')
}

function stopRedisServer () {
  serverProcess.kill()
}

function setupMenuBar () {
  appIcon = new Tray(`${__dirname}/assets/images/tray-icon.png`)
  var contextMenu = Menu.buildFromTemplate([
    { label: 'Item1', type: 'radio' },
    { label: 'Item2', type: 'radio' },
    { label: 'Item3', type: 'radio', checked: true },
    { label: 'Item4', type: 'radio' }
  ])
  appIcon.setToolTip('This is my application.')
  appIcon.setContextMenu(contextMenu)
}

app.on('window-all-closed', () => {
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
