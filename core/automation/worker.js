'use strict';

class AutomationWorker {
  constructor(queue, engine) {
    this.queue = queue;
    this.engine = engine;
  }

  async process() {
    const jobs = this.queue.drain ? this.queue.drain() : [];

    for (const job of jobs) {
      await this.engine.execute(job.type, job.payload);
    }
  }
}

module.exports = AutomationWorker;
