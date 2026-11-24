'use strict';

module.exports = {
  event: 'sla.expired',
  handle(payload) {
    return {
      type: 'create.alert',
      title: 'SLA vencido',
      payload
    };
  }
};
