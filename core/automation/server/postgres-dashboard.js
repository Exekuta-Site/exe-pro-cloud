class PostgresDashboard {
  constructor(db) {
    this.db = db;
  }

  async getMetrics() {
    return {
      total: 0,
      success: 0,
      errors: 0
    };
  }

  async getHistory(limit = 20) {
    return [];
  }
}

module.exports = PostgresDashboard;
