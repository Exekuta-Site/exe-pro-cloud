'use strict';

// EXE PRO 4.5.0: aplica somente CSS ao HTML do Admin apos materializacao.
// Nao muda HTML funcional, JS, routes, eventos, modais, dados nem server.js.
const fs = require('node:fs');
const path = require('node:path');

const STYLE_ID = 'exeProVisualPremium450';
const STYLE_FILENAME = 'exe-pro-visual-premium-450.css';
const STYLE_REGEX = /<style id="exeProVisualPremium450">[\s\S]*?<\/style>\s*/g;

function applyVisualPremium(root = path.resolve(__dirname, '..')) {
  const indexPath = path.join(root, 'web', 'index.html');
  const cssPath = path.join(root, 'web', STYLE_FILENAME);
  const original = fs.readFileSync(indexPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8').trim();

  if (!original.includes('</head>') || !original.includes('id="content"')) {
    throw new Error('EXE PRO Premium: estrutura esperada do Admin ausente; abortando sem escrever.');
  }
  if (!css || /<\/style/i.test(css) || /<script/i.test(css)) {
    throw new Error('EXE PRO Premium: stylesheet invalido.');
  }
  const matches = original.match(STYLE_REGEX) || [];
  if (matches.length > 1) {
    throw new Error('EXE PRO Premium: marcadores duplicados; abortando sem escrever.');
  }
  const withoutPriorStyle = original.replace(STYLE_REGEX, '');
  const block = '<style id="' + STYLE_ID + '">\n' + css + '\n</style>\n';
  const updated = withoutPriorStyle.replace('</head>', block + '</head>');
  if (updated !== original) fs.writeFileSync(indexPath, updated, 'utf8');
  return { changed: updated !== original, styleId: STYLE_ID };
}

if (require.main === module) {
  try {
    const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..');
    const result = applyVisualPremium(root);
    console.log('EXE PRO Premium v4.5.0: CSS ' + (result.changed ? 'aplicado' : 'verificado') + ', sem alterar eventos.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { applyVisualPremium, STYLE_ID, STYLE_FILENAME, STYLE_REGEX };
