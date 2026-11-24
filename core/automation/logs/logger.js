'use strict';

class AutomationLogger {
  async log(event, payload, status = 'SUCCESS') {
    return { event, payload, status };
  }
}

module.exports = AutomationLogger;
