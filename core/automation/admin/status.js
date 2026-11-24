class AutomationStatus {
  constructor(metrics) {
    this.metrics = metrics;
  }

  async getStatus() {
    return await this.metrics.summary();
  }
}

module.exports = AutomationStatus;
