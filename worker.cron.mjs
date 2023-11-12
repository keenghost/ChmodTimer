import cron from 'cron'
import { globSync } from 'glob'
import { parentPort } from 'worker_threads'
import ParseJSON from 'parse-json'
import { strArrPathTaskId } from './json-stringify.mjs'

parentPort.on('message', rawData => {
  const { trigger, tasks } = ParseJSON(rawData)

  new cron.CronJob(trigger, () => {
    const queue = []

    for (const task of tasks) {
      const paths = globSync(task.dirs)

      for (const path of paths) {
        queue.push({ path, taskId: task.taskId })
      }
    }

    parentPort.postMessage(strArrPathTaskId(queue))
  }, null, true)
})
