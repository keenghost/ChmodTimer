import fs from 'fs'
import { promisify } from 'util'
import { parentPort } from 'worker_threads'
import ParseJSON from 'parse-json'

const asyncStat = promisify(fs.stat)
const asyncChmod = promisify(fs.chmod)
const asyncChown = promisify(fs.chown)

parentPort.on('message', async rawData => {
  try {
    const current = ParseJSON(rawData)
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
    // console.error(err)
  }

  process.exit(0)
})
