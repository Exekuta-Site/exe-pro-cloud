class CreateTaskAction {
  constructor(db) {
    this.db = db;
  }

  async execute(payload) {
    return {
      type: 'task.create',
      payload,
      status: 'READY'
    };
  }
}

module.exports = CreateTaskAction;
