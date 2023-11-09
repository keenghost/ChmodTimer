import fs from 'fs'
import yaml from 'yaml'
import cron from 'cron'
import chokidar from 'chokidar'
import { globSync } from 'glob'

function processor(inPath, inTask) {
  fs.stat(inPath, (err, stats) => {
    if (err) {
      console.error(err)
      return
    }

    if ((stats.isDirectory() && inTask.hasOwnProperty('modedir')) || (!stats.isDirectory() && inTask.hasOwnProperty('modefile'))) {
      const mode = stats.mode.toString(8)
      const modeString = mode.substring(mode.length - 3)
      const targetmode = stats.isDirectory() ? inTask.modedir : inTask.modefile
  
      if (modeString !== targetmode.toString()) {
        fs.chmod(inPath, parseInt(targetmode, 8), err => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
    }

    if (inTask.hasOwnProperty('uid') || inTask.hasOwnProperty('gid')) {
      const targetUID = inTask.hasOwnProperty('uid') ? inTask.uid : stats.uid
      const targetGID = inTask.hasOwnProperty('gid') ? inTask.gid : stats.gid

      if (stats.uid !== targetUID || stats.gid !== targetGID) {
        fs.chown(inPath, targetUID, targetGID, err => {
          if (err) {
            console.error(err)
            return
          }
        })
      }
    }
  })
}

if (!fs.existsSync('./config')) {
  fs.mkdirSync('./config')
}

if (!fs.existsSync('./config/config.yaml')) {
  fs.writeFileSync('./config/config.yaml', fs.readFileSync('./config-template.yaml'))
}

const config = yaml.parse(fs.readFileSync('./config/config.yaml', { encoding: 'utf-8' }))

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
        processor(path, task)
      }
    }
  }, null, true)
}

for (const task of tasks) {
  const monitoring = task.hasOwnProperty('monitoring') ? task.monitoring : true

  if (monitoring) {
    const watcher = chokidar.watch(task.directories)

    watcher.on('add', changedPath => processor(changedPath, task))
    watcher.on('addDir', changedPath => processor(changedPath, task))
  }

  if (task.trigger) {
    new cron.CronJob(task.trigger, () => {
      const paths = globSync(task.directories)

      for (const path of paths) {
        processor(path, task)
      }
    }, null, true)
  }
}
