class AutomationHistory {
  constructor(logger) {
    this.logger = logger;
  }

  async list(filters = {}) {
    return this.logger.query(filters);
  }
}

module.exports = AutomationHistory;
