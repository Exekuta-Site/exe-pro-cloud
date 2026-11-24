const PostgresDashboard = require('./postgres-dashboard');

class DashboardAPI {
  constructor(db) {
    this.dashboard = new PostgresDashboard(db);
  }

  async summary() {
    return this.dashboard.getMetrics();
  }

  async history(limit) {
    return this.dashboard.getHistory(limit);
  }
}

module.exports = DashboardAPI;
