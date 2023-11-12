import fs from 'fs'
import yaml from 'yaml'
import { Worker } from 'worker_threads'
import { strArrPathTask, strTriggerTasks } from './json-stringify.mjs'
import ParseJSON from 'parse-json'
import _ from 'lodash'

const record = {
  prequeue: [],
}

const TASKS = new Map()

function addQueue(inQueue) {
  record.prequeue.push(...inQueue.map(task => ({ path: task.path, task: _.pick(TASKS.get(task.taskId), ['uid', 'gid', 'modir', 'modefile']) })))
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

let nextId = 0
const global = config['global'] || {}
const tasks = (config['tasks'] || []).map(task => {
  nextId += 1
  return { taskId: nextId, ...task }
})
for (const task of tasks) {
  TASKS.set(task.taskId, task)
}

if (global.trigger) {
  const globalTrackTasks = tasks.filter(task => !task.ignoreGlobal)
  const cronWorker = new Worker('./worker.cron.mjs')
  cronWorker.on('message', data => {
    addQueue(ParseJSON(data))
  })
  cronWorker.postMessage(strTriggerTasks({
    trigger: global.trigger,
    tasks: globalTrackTasks.map(task => ({
      taskId: task.taskId,
      directories: task.directories,
    })),
  }))
}

for (const task of tasks) {
  const monitoring = task.hasOwnProperty('monitoring') ? task.monitoring : true

  if (monitoring) {
    const watcherWorker = new Worker('./worker.watcher.mjs')

    watcherWorker.on('message', data => {
      addQueue(ParseJSON(data))
    })

    watcherWorker.postMessage(JSON.stringify({
      taskId: task.taskId,
      directories: task.directories,
      chokidarOptions: task.chokidarOptions,
    }))
  }

  if (task.trigger) {
    const cronWorker = new Worker('./worker.cron.mjs')
    cronWorker.on('message', data => {
      addQueue(ParseJSON(data))
    })
    cronWorker.postMessage(strTriggerTasks({
      trigger: task.trigger,
      tasks: [{ taskId: task.taskId, directories: task.directories }],
    }))
  }
}

const processorWorker = new Worker('./worker.processor.mjs')

setInterval(() => {
  if (record.prequeue.length > 0) {
    processorWorker.postMessage(strArrPathTask(record.prequeue))
    record.prequeue = []
  }
}, 3000)
