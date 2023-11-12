import _ from 'lodash'
import chokidar from 'chokidar'
import { parentPort } from 'worker_threads'
import ParseJSON from 'parse-json'
import { strArrPathTaskId } from './json-stringify.mjs'

const record = {
  queue: [],
}

function submitQueue() {
  if (record.queue.length > 0) {
    parentPort.postMessage(strArrPathTaskId(record.queue))
    record.queue = []
  }
}

parentPort.on('message', rawData => {
  const { taskId, directories, chokidarOptions } = ParseJSON(rawData)
console.log(chokidarOptions)
  const watcher = chokidar.watch(directories, _.assign({
    usePolling: true,
    interval: 600,
    awaitWriteFinish: true,
    ignoreInitial: false,
  }, chokidarOptions))

  watcher.on('add', changedPath => {
    record.queue.push({ path: changedPath, taskId })
  })

  watcher.on('addDir', changedPath => {
    record.queue.push({ path: changedPath, taskId })
  })
})

setInterval(submitQueue, 3000)
