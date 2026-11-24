'use strict';

class AutomationPostgresLogger {
  constructor(db) {
    this.db = db;
  }

  async save(event, payload, status) {
    if (!this.db) return;

    await this.db.query(
      `INSERT INTO automation_logs(event,payload,status,created_at)
       VALUES($1,$2,$3,NOW())`,
      [event, payload, status]
    );
  }
}

module.exports = AutomationPostgresLogger;
