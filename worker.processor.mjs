import { Worker, parentPort } from 'worker_threads'
import ParseJSON from 'parse-json'
import { strPathTask } from './json-stringify.mjs'

const processor = {
  processing: false,
  queue: [],
  prequeue: [],
}

function execProcess() {
  if (processor.processing) {
    return
  }

  if (processor.queue.length === 0) {
    processor.queue = processor.queue.concat(processor.prequeue)
    processor.prequeue = []
  }

  if (processor.queue.length === 0) {
    return
  }

  processor.processing = true

  const current = processor.queue.shift()
  const worker = new Worker('./worker.execprocess.mjs')

  worker.on('exit', () => {
    // console.log('Task Finished:', current.path)
    processor.processing = false
    setTimeout(execProcess)
  })

  worker.postMessage(strPathTask(current))
}

parentPort.on('message', data => {
  processor.prequeue = processor.prequeue.concat(ParseJSON(data))
  setTimeout(execProcess)
})
