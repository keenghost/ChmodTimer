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
          directories: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['taskId', 'directories'],
      },
    },
  },
  required: ['trigger', 'tasks'],
})
