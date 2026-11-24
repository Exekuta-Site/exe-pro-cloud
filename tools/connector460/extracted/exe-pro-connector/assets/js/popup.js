/* Pop-up EXE PRO: sem dependências, controle de foco e frequência por versão. */
(function () {
  'use strict';
  var root = document.getElementById('exe-pro-popup-root');
  if (!root) return;

  var dialog = root.querySelector('.exe-pro-popup-dialog');
  if (!dialog) return;
  var frequency = root.getAttribute('data-frequency') || 'session';
  var delay = Math.max(0, Math.min(30, parseInt(root.getAttribute('data-delay') || '0', 10) || 0));
  var revision = root.getAttribute('data-revision') || 'default';
  var key = 'exe_pro_popup_' + revision;
  var previousFocus = null;
  var previousOverflow = '';

  try {
    if (frequency === 'session' && window.sessionStorage.getItem(key)) return;
    if (frequency === 'daily') {
      var lastSeen = parseInt(window.localStorage.getItem(key) || '0', 10);
      if (lastSeen && (Date.now() - lastSeen) < 86400000) return;
    }
  } catch (error) {
    // Se o navegador bloquear armazenamento local, o aviso ainda funciona.
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key !== 'Tab') return;
    var elements = dialog.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])');
    if (!elements.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    var first = elements[0];
    var last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    document.body.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onKeyDown);
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  var closers = root.querySelectorAll('[data-exe-popup-close]');
  for (var i = 0; i < closers.length; i++) {
    closers[i].addEventListener('click', close);
  }

  window.setTimeout(function () {
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    root.hidden = false;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    var closeButton = dialog.querySelector('.exe-pro-popup-close');
    (closeButton || dialog).focus();
    try {
      if (frequency === 'session') window.sessionStorage.setItem(key, '1');
      if (frequency === 'daily') window.localStorage.setItem(key, String(Date.now()));
    } catch (error) {
      // Falha de storage não impede a exibição.
    }
  }, delay * 1000);
}());
