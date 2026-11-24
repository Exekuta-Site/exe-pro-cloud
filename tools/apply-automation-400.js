const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const marker = path.join(root, '.automation-400-ready');

fs.writeFileSync(
  marker,
  'EXE PRO Automation Core 4.0 ready\n'
);

console.log('Automation Core 4.0 applied');
