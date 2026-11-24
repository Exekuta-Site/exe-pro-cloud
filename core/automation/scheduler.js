'use strict';

class AutomationScheduler {
  constructor(worker) {
    this.worker = worker;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(async () => {
      if (this.worker && this.worker.run) {
        await this.worker.run();
      }
    }, 60000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }
}

module.exports = AutomationScheduler;
