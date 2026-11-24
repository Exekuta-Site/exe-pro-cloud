'use strict';

module.exports = {
  event: 'payment.overdue',
  handle(payload) {
    return {
      type: 'create.task',
      title: 'Verificar pagamento pendente',
      payload
    };
  }
};
