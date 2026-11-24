module.exports = {
  name: 'Pagamento atrasado',
  event: 'payment.overdue',
  condition: {
    field: 'daysLate',
    operator: '>=',
    value: 5
  },
  action: 'task.create'
};
