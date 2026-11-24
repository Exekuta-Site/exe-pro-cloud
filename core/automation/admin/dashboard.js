class AutomationDashboard {
  constructor(service) {
    this.service = service;
  }

  async summary() {
    return this.service.getSummary();
  }
}

module.exports = AutomationDashboard;
