'use strict';

class AutomationPostgresMetrics {
  constructor(db) {
    this.db = db;
  }

  async summary() {
    return {
      total: 0,
      success: 0,
      errors: 0,
      latest: []
    };
  }
}

module.exports = AutomationPostgresMetrics;
