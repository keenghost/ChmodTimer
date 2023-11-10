import fs from 'fs'
import yaml from 'yaml'
import cron from 'cron'
import chokidar from 'chokidar'
import { globSync } from 'glob'
import { promisify } from 'util'

const asyncStat = promisify(fs.stat)
const asyncChmod = promisify(fs.chmod)
const asyncChown = promisify(fs.chown)

const processor = {
  processing: false,
  queue: [], // [ { path: string, task: configObject } ]
}

async function execProcess() {
  if (processor.processing) {
    return
  }

  const current = processor.queue.shift()

  if (!current) {
    return
  }

  processor.processing = true

  try {
    const stats = await asyncStat(current.path)

    if ((stats.isDirectory() && current.task.hasOwnProperty('modedir')) || (!stats.isDirectory() && current.task.hasOwnProperty('modefile'))) {
      const mode = stats.mode.toString(8)
      const modeString = mode.substring(mode.length - 3)
      const targetmode = stats.isDirectory() ? current.task.modedir : current.task.modefile

      if (modeString !== targetmode.toString()) {
        await asyncChmod(current.path, parseInt(targetmode, 8))
      }
    }

    if (current.task.hasOwnProperty('uid') || current.task.hasOwnProperty('gid')) {
      const targetUID = current.task.hasOwnProperty('uid') ? current.task.uid : stats.uid
      const targetGID = current.task.hasOwnProperty('gid') ? current.task.gid : stats.gid

      if (stats.uid !== targetUID || stats.gid !== targetGID) {
        await asyncChown(current.path, targetUID, targetGID)
      }
    }
  } catch (err) {
    console.error(err)
  }

  processor.processing = false
  setTimeout(execProcess)
}

function addQueue(inPath, inTask) {
  processor.queue.push({ path: inPath, task: inTask })
  setTimeout(execProcess)
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
  new cron.CronJob(global.trigger, () => {
    for (const task of tasks) {
      if (global.ignoreGlobal) {
        continue
      }

      const paths = globSync(task.directories)

      for (const path of paths) {
        addQueue(path, task)
      }
    }
  }, null, true)
}

for (const task of tasks) {
  const monitoring = task.hasOwnProperty('monitoring') ? task.monitoring : true

  if (monitoring) {
    const watcher = chokidar.watch(task.directories)

    watcher.on('add', changedPath => addQueue(changedPath, task))
    watcher.on('addDir', changedPath => addQueue(changedPath, task))
  }

  if (task.trigger) {
    new cron.CronJob(task.trigger, () => {
      const paths = globSync(task.directories)

      for (const path of paths) {
        addQueue(path, task)
      }
    }, null, true)
  }
}
