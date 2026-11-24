'use strict';

class AutomationQueue {
  constructor() {
    this.jobs = [];
  }

  add(job) {
    this.jobs.push(job);
  }

  next() {
    return this.jobs.shift();
  }

  size() {
    return this.jobs.length;
  }
}

module.exports = AutomationQueue;
