import chokidar from 'chokidar'
import cron from 'cron'
import fs, { promises as fsp } from 'fs'
import { globSync } from 'glob'
import yaml from 'yaml'

function time() {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

function pick(inObj, inKeys) {
  const result = {}

  for (const key of Object.keys(inObj)) {
    if (inObj.hasOwnProperty(key) && inKeys.includes(key)) {
      result[key] = inObj[key]
    }
  }

  return result
}

const record = {
  queue: [], // [{ 'path', 'uid', 'gid', 'modedir', 'modefile' }]
  running: false,
}

function addQueue(inQueue) {
  record.queue = record.queue.concat(inQueue)
}

async function runQueue() {
  if (record.running) {
    return
  }

  if (record.queue.length === 0) {
    return
  }

  const queue = record.queue
  record.queue = []
  record.running = true

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) {
      break
    }

    try {
      const stats = await fsp.stat(current.path)

      if ((stats.isDirectory() && current.hasOwnProperty('modedir')) || (!stats.isDirectory() && current.hasOwnProperty('modefile'))) {
        const mode = stats.mode.toString(8)
        const modeString = mode.substring(mode.length - 3)
        const targetmode = stats.isDirectory() ? current.modedir : current.modefile

        if (modeString !== targetmode.toString()) {
          await fsp.chmod(current.path, parseInt(targetmode, 8))

          console.log(time(), 'chmod:', current.path)
        }
      }

      if (current.hasOwnProperty('uid') || current.hasOwnProperty('gid')) {
        const targetUID = current.hasOwnProperty('uid') ? current.uid : stats.uid
        const targetGID = current.hasOwnProperty('gid') ? current.gid : stats.gid

        if (stats.uid !== targetUID || stats.gid !== targetGID) {
          await fsp.chown(current.path, targetUID, targetGID)

          console.log(time(), 'chown:', current.path)
        }
      }
    } catch (err) {
      console.error(time, 'fail:', err.message || current.path)
    }
  }

  record.running = false
}

function checkConfig(inConfig) {
  const tasks = inConfig.tasks || []

  for (const task of tasks) {
    if (task.hasOwnProperty('modedir') && (task.modedir < 0 || task.modedir > 777)) {
      console.error('modedir must between 0 and 777')
      process.exit(1)
    }

    if (task.hasOwnProperty('modefile') && (task.modefile < 0 || task.modefile > 777)) {
      console.error('modefile must between 0 and 777')
      process.exit(1)
    }
  }
}

/**************************************
 *********** Program Starts ***********
 **************************************/

if (!fs.existsSync('./config')) {
  fs.mkdirSync('./config')
}

if (!fs.existsSync('./config/config.yaml')) {
  fs.writeFileSync('./config/config.yaml', fs.readFileSync('./config-template.yaml'))
}

const config = yaml.parse(fs.readFileSync('./config/config.yaml', { encoding: 'utf-8' }))

checkConfig(config)

const global = config['global'] || {}
const tasks = config['tasks'] || []

if (global.trigger) {
  const globalTrackTasks = tasks.filter(task => !task.ignoreGlobal)

  new cron.CronJob(global.trigger, () => {
    const queue = []

    for (const task of globalTrackTasks) {
      const taskProps = pick(task, ['uid', 'gid', 'modedir', 'modefile'])
      const paths = globSync(task.directories)

      for (const path of paths) {
        queue.push(Object.assign({ path }, taskProps))
      }
    }

    addQueue(queue)
  }, null, true)
}

for (const task of tasks) {
  const taskProps = pick(task, ['uid', 'gid', 'modedir', 'modefile'])
  const monitoring = task.hasOwnProperty('monitoring') ? task.monitoring : true

  if (monitoring) {
    const watcher = chokidar.watch(task.directories, Object.assign({
      usePolling: true,
      interval: 3000,
      awaitWriteFinish: true,
      ignoreInitial: false,
    }, task.chokidarOptions))

    watcher.on('add', changedPath => {
      addQueue([Object.assign({ path: changedPath }, taskProps)])
    })

    watcher.on('addDir', changedPath => {
      addQueue([Object.assign({ path: changedPath }, taskProps)])
    })
  }

  if (task.trigger) {
    new cron.CronJob(task.trigger, () => {
      const queue = []
      const paths = globSync(task.directories)

      for (const path of paths) {
        queue.push(Object.assign({ path }, taskProps))
      }

      addQueue(queue)
    }, null, true)
  }
}

setInterval(runQueue, 3000)
