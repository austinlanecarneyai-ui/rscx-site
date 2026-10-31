// Shared by every account page (LCH-015..024). No styling on purpose: this is
// the wireframe, proven to work before any design is applied.
'use strict';

// LCH-063: never inside another site's frame, where a page laid over the forms
// could trick a click. GitHub Pages cannot send X-Frame-Options, so it is done here.
if (window.top !== window.self) {
  document.documentElement.style.display = 'none';
  try { window.top.location = window.self.location.href; } catch (e) { /* the page stays hidden */ }
}

// LCH-024: an error in this code is shown on the page, never swallowed.
function showError(text) {
  var box = document.getElementById('errors');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'errors';
    document.body.appendChild(box);
  }
  box.hidden = false;
  box.textContent += 'Page error: ' + text + '\n';
}
window.addEventListener('error', function (e) { showError(e.message); });
window.addEventListener('unhandledrejection', function (e) {
  showError(e.reason && e.reason.message ? e.reason.message : String(e.reason));
});

var Accounts = {
  base: function () { return window.ACCOUNTS_API || ''; },

  // False while the live site cannot send mail yet (config.js ACCOUNTS_MAIL; SES
  // production access pending, 2026-11-01): resets go through support instead.
  mail: function () { return window.ACCOUNTS_MAIL !== false; },

  // One call to the API. Always resolves: {status, body}. A network failure is
  // status 0 with words a person can act on.
  call: function (method, path, body, auth) {
    var headers = {};
    if (body !== undefined) { headers['Content-Type'] = 'application/json'; }
    var token = auth ? Accounts.token() : null;
    if (token) { headers['Authorization'] = 'Bearer ' + token; }
    return fetch(Accounts.base() + path, {
      method: method,
      headers: headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, body: j };
      });
    }, function () {
      return { status: 0, body: { error: 'Could not reach the server. Check your connection and try again.' } };
    });
  },

  // The session token: sessionStorage normally, localStorage when "stay signed
  // in" was ticked. Storage can be blocked; then the session lasts the page.
  memory: null,
  token: function () {
    try {
      return sessionStorage.getItem('rscx-session') || localStorage.getItem('rscx-session') || Accounts.memory;
    } catch (e) { return Accounts.memory; }
  },
  keep: function (token, stay) {
    Accounts.memory = token;
    try {
      (stay ? localStorage : sessionStorage).setItem('rscx-session', token);
    } catch (e) { /* kept in memory only */ }
  },
  forget: function () {
    Accounts.memory = null;
    try { sessionStorage.removeItem('rscx-session'); } catch (e) { /* nothing to do */ }
    try { localStorage.removeItem('rscx-session'); } catch (e) { /* nothing to do */ }
  },

  // A token from a mail link: read once, then taken out of the address bar so
  // it is not left in history or shown over a shoulder.
  linkToken: function () {
    var m = /[?&]token=([A-Za-z0-9_-]+)/.exec(window.location.search);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    return m ? m[1] : null;
  },

  say: function (id, text) {
    document.getElementById(id).textContent = text;
  },

  value: function (id) {
    return document.getElementById(id).value;
  },

  date: function (secs) {
    if (!secs) { return 'never'; }
    return new Date(secs * 1000).toLocaleString();
  },

  // Runs fn when the form is submitted, with the button disabled until done.
  onSubmit: function (formId, fn) {
    var form = document.getElementById(formId);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = form.querySelector('button[type=submit]');
      if (button) { button.disabled = true; }
      Promise.resolve(fn()).then(function () {
        if (button) { button.disabled = false; }
      }, function (err) {
        if (button) { button.disabled = false; }
        showError(err && err.message ? err.message : String(err));
      });
    });
  }
};
