'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const marker = path.join(root, '.automation-engine-401-ready');

fs.writeFileSync(marker, 'EXE PRO Automation Engine 4.0.1 ready\n');

console.log('EXE PRO Automation Engine 4.0.1 preparado.');
