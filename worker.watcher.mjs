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
  const { taskId, dirs } = ParseJSON(rawData)

  const watcher = chokidar.watch(dirs, {
    usePolling: true,
    interval: 600,
    awaitWriteFinish: true,
  })

  watcher.on('add', changedPath => {
    record.queue.push({ path: changedPath, taskId })
  })

  watcher.on('addDir', changedPath => {
    record.queue.push({ path: changedPath, taskId })
  })
})

setInterval(submitQueue, 3000)
