'use strict'
const electron = require('electron')
const child = require('child_process')
const spawn = child.spawn
const exec = child.exec
const execSync = child.execSync
const ipc = electron.ipcMain
const app = electron.app
const Menu = electron.Menu
const Tray = electron.Tray

// prevent window being garbage collected
let mainWindow
let installWindow
let serverProcess
let appIcon
let redisInstalled
let redisServer
let redisCli

function loadMainWindow () {
  checkRedisInstallation()
  if (redisInstalled) {
    if (installWindow) installWindow.close()
    mainWindow = createMainWindow()
    setupMenuBar()
    startRedisServer()
  }
}

function onClosed () {
  mainWindow = null
}

function createMainWindow () {
  const win = new electron.BrowserWindow({
    width: 700,
    height: 350
  })

  win.loadURL(`file://${__dirname}/index.html`)
  win.on('closed', onClosed)
  win.on('show', () => app.dock.show())

  return win
}

function checkRedisInstallation () {
  try {
    redisServer = execSync('which redis-server').toString().trim()
    redisCli = execSync('which redis-cli').toString().trim()
    redisInstalled = true
  } catch (e) {
    installRedis()
  }
}

function installRedis () {
  if (!installWindow) {
    installWindow = new electron.BrowserWindow({
      width: 700,
      height: 350
    })
    installWindow.loadURL(`file://${__dirname}/install-redis.html`)
    installWindow.on('closed', () => installWindow = null)
  }
}

function startRedisServer (port) {
  if (!serverProcess) {
    console.log('starting redis server...')

    serverProcess = spawn(redisServer, ['--loglevel warning'], {detached: true})

    serverProcess.on('error', err => {
      console.log('Server Error: ', err)
      mainWindow.webContents.send('server-status-update', false)
    })

    serverProcess.stdout.on('data', (data) => {
      console.log('Redis - STDOUT:', data.toString())
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

function sendServerStatus (e) {
  exec(`${redisCli} ping`, (err, stdout, stderr) => {
    let isRunning = !err && stdout === 'PONG\n'
    console.log('server is running?', isRunning)
    if (e) {
      e.sender.send('server-status-update', isRunning)
    } else if (mainWindow) {
      mainWindow.webContents.send('server-status-update', isRunning)
    }
  })
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
    {
      label: 'Start Server',
      click: () => {
        startRedisServer()
        sendServerStatus()
      }
    },
    {
      label: 'Stop Server',
      click: () => {
        stopRedisServer()
        sendServerStatus()
      }
    },
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

app.on('ready', loadMainWindow)
app.on('quit', stopRedisServer)

ipc.on('is-server-running', sendServerStatus)
ipc.on('control-server', (e, action) => {
  if (action === 'start') startRedisServer()
  if (action === 'stop') stopRedisServer()
  sendServerStatus(e)
})
ipc.on('retry', loadMainWindow)
