'use strict';

class TaskRunner {
  constructor(db){
    this.db = db;
  }

  async createTask(payload){
    return {
      module: 'task_items',
      title: payload.title || 'Tarefa automática',
      status: 'A fazer',
      priority: payload.priority || 'Alta'
    };
  }
}

module.exports = TaskRunner;
