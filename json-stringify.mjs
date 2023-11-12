import FastJsonStringify from 'fast-json-stringify'

export const strArrPathTaskId = FastJsonStringify({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      taskId: { type: 'number' },
    },
    required: ['path', 'taskId'],
  },
})

export const strArrPathTask = FastJsonStringify({
  type: 'array',
  items: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      task: {
        type: 'object',
        properties: {
          uid: { type: 'number' },
          gid: { type: 'number' },
          modedir: { type: 'number' },
          modefile: { type: 'number' },
        },
      },
    },
    required: ['path', 'task'],
  },
})

export const strPathTask = FastJsonStringify({
  type: 'object',
  properties: {
    path: { type: 'string' },
    task: {
      type: 'object',
      properties: {
        uid: { type: 'number' },
        gid: { type: 'number' },
        modedir: { type: 'number' },
        modefile: { type: 'number' },
      },
    },
  },
  required: ['path', 'task'],
})

export const strTaskIdDirs = FastJsonStringify({
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    dirs: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['taskId', 'dirs'],
})

export const strTriggerTasks = FastJsonStringify({
  type: 'object',
  properties: {
    trigger: { type: 'string' },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'string' },
          dirs: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['taskId', 'dirs'],
      },
    },
  },
  required: ['trigger', 'tasks'],
})
