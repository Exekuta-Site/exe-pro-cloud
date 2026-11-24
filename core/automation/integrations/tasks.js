'use strict';

class TaskAutomation {
  constructor(db) {
    this.db = db;
  }

  async createTask(data) {
    if (!this.db) {
      return { status: 'ready', data };
    }

    const result = await this.db.query(`
      INSERT INTO task_items
      (task_id, lead_id, project_id, title, description, priority, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING *
    `, [
      data.task_id,
      data.lead_id || null,
      data.project_id || null,
      data.title,
      data.description || null,
      data.priority || 'Alta',
      data.status || 'A fazer'
    ]);

    return result.rows[0];
  }
}

module.exports = TaskAutomation;
