'use strict';

module.exports = {
  name: 'payment.overdue.flow',
  steps: [
    'event.receive',
    'rule.validate',
    'task.create',
    'log.record'
  ]
};
