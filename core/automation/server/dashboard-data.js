// EXE PRO 4.0 - Dados do Dashboard de Automação

async function getAutomationDashboard(db){
  return {
    rules: 0,
    executions: 0,
    success: 0,
    errors: 0,
    lastEvents: []
  };
}

module.exports = getAutomationDashboard;
