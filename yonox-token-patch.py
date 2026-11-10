
from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT = Path.home() / "YonoX"
NAMES = ["server.js", "app.js", "yonox-ui.js"]

def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise RuntimeError(f"{label}: expected 1 match, got {n}")
    return text.replace(old, new, 1)

def main():
    if not ROOT.is_dir():
        raise RuntimeError(f"Project not found: {ROOT}")

    src = {n: (ROOT / n).read_text() for n in NAMES}
    out = dict(src)

    # SERVER: account-token table and queries
    s = out["server.js"]
    s = replace_once(s, "const q = {", """DB.exec(`
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const q = {""", "token table")

    s = replace_once(
        s,
        "  insertSession: DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),",
        """  insertSession: DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
  accountByToken: DB.prepare('SELECT user_id FROM user_tokens WHERE token_hash = ?'),
  upsertAccountToken: DB.prepare(`
    INSERT INTO user_tokens (user_id, token_hash)
    VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      token_hash = excluded.token_hash,
      created_at = CURRENT_TIMESTAMP
  `),""",
        "token queries"
    )

    start = s.index("  if (method === 'POST' && route === '/api/register') {")
    end = s.index("  if (method === 'POST' && route === '/api/logout') {", start)

    register = """  if (method === 'POST' && route === '/api/register') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return fail(res, 400, 'Username must be 3-20 letters, numbers or underscores.');
    }
    if (q.userByName.get(username)) {
      return fail(res, 409, 'This username is already registered.');
    }

    try {
      DB.exec('BEGIN IMMEDIATE');

      const secret = crypto.randomBytes(48).toString('hex');
      const result = q.insertUser.run(username, hashPassword(secret));
      const userId = Number(result.lastInsertRowid);

      const accountToken = crypto.randomBytes(48).toString('hex');
      q.upsertAccountToken.run(userId, hashToken(accountToken));

      const sessionToken = crypto.randomBytes(48).toString('hex');
      const expires = new Date(Date.now() + 365 * 86400000).toISOString();
      q.insertSession.run(hashToken(sessionToken), userId, expires);

      DB.exec('COMMIT');
      setSessionCookie(res, sessionToken);

      return json(res, 201, {
        success: true,
        user: q.userById.get(userId),
        token: accountToken
      });
    } catch (error) {
      try { DB.exec('ROLLBACK'); } catch {}
      if (String(error.message).includes('UNIQUE')) {
        return fail(res, 409, 'This username is already registered.');
      }
      throw error;
    }
  }

  if (method === 'POST' && route === '/api/login') {
    const body = await readBody(req);
    const token = String(body.token || '').trim().toLowerCase();

    if (!/^[a-f0-9]{96}$/.test(token)) {
      return fail(res, 400, 'Enter a valid account token.');
    }

    const record = q.accountByToken.get(hashToken(token));
    if (!record) return fail(res, 401, 'Invalid account token.');

    const account = q.userById.get(record.user_id);
    if (!account) return fail(res, 401, 'This account is unavailable.');

    const sessionToken = crypto.randomBytes(48).toString('hex');
    const expires = new Date(Date.now() + 365 * 86400000).toISOString();
    q.insertSession.run(hashToken(sessionToken), account.id, expires);
    setSessionCookie(res, sessionToken);

    return json(res, 200, { success: true, user: account });
  }

"""
    s = s[:start] + register + s[end:]

    s = replace_once(
        s,
        "  const user = currentUser(req);",
        """  const user = currentUser(req);

  if (method === 'POST' && route === '/api/account/token') {
    if (!user) return fail(res, 401, 'Please log in.');

    const token = crypto.randomBytes(48).toString('hex');
    q.upsertAccountToken.run(user.id, hashToken(token));
    return json(res, 200, { success: true, token });
  }""",
        "token issue route"
    )
    out["server.js"] = s

    # APP: login/register screen
    a = out["app.js"]
    a = replace_once(a, "let user = null;", "let user = null;\nlet authMode = 'register';", "auth mode")

    begin = a.index("auth.innerHTML = `")
    finish = a.index("document.body.appendChild(auth);", begin)

    auth_html = """auth.innerHTML = `
  <div class="yx-auth-card">
    <div class="yx-auth-logo">YonoX</div>
    <div class="yx-auth-desc" id="yx-auth-desc">Create your YonoX account.</div>
    <form id="yx-auth-form">
      <label class="yx-field" id="yx-username-label" for="yx-username">Username</label>
      <input class="yx-auth-input" id="yx-username" maxlength="20"
        minlength="3" pattern="[A-Za-z0-9_]{3,20}"
        placeholder="Username" autocomplete="username" required>
      <label class="yx-field" id="yx-token-label" for="yx-token" hidden>Account token</label>
      <input class="yx-auth-input" id="yx-token" type="text"
        placeholder="Paste account token" autocomplete="off"
        autocapitalize="none" spellcheck="false" hidden>
      <button class="yx-auth-button" id="yx-auth-submit">Create account</button>
    </form>
    <button type="button" id="yx-auth-switch"
      style="margin-top:12px;width:100%;padding:11px;border:1px solid #dce5df;border-radius:10px;background:#f4f8f5;color:#176b55;font-weight:bold">
      Already have an account? Log in
    </button>
    <div class="yx-auth-error" id="yx-auth-error"></div>
    <div class="yx-note" id="yx-auth-note">Username: 3-20 letters, numbers or underscores.</div>
  </div>`;
"""
    a = a[:begin] + auth_html + a[finish:]

    begin = a.index("function showAuth(")
    finish = a.index("\nfunction addAccountBar()", begin)

    auth_functions = """function setAuthMode(mode) {
  authMode = mode === 'login' ? 'login' : 'register';
  const login = authMode === 'login';

  $('yx-username-label').hidden = login;
  $('yx-username').hidden = login;
  $('yx-username').required = !login;
  $('yx-token-label').hidden = !login;
  $('yx-token').hidden = !login;
  $('yx-token').required = login;

  $('yx-auth-desc').textContent = login
    ? 'Enter your account token to log in.'
    : 'Create your YonoX account using a username.';
  $('yx-auth-note').textContent = login
    ? 'Your account token is available on the Account page.'
    : 'Username: 3-20 letters, numbers or underscores.';
  $('yx-auth-submit').textContent = login ? 'Log in' : 'Create account';
  $('yx-auth-switch').textContent = login
    ? 'Create a new account'
    : 'Already have an account? Log in';
}

function showAuth(message = '') {
  auth.style.display = 'grid';
  $('yx-auth-error').textContent = message;
  $('yx-username').value = '';
  $('yx-token').value = '';
  setAuthMode(authMode);
  (authMode === 'login' ? $('yx-token') : $('yx-username')).focus();
}
"""
    a = a[:begin] + auth_functions + a[finish:]

    begin = a.index("$('yx-auth-form').addEventListener('submit'")
    finish = a.index("$('yx-quantity').addEventListener", begin)

    handlers = """async function finishAuthentication(data) {
  user = data.user;
  await refresh();
  addAccountBar();
  auth.style.display = 'none';
  await loadMathStatus();

  window.yonoxOwnershipLoad?.().catch(error =>
    console.error('Ownership loading failed:', error)
  );

  if (data.token) window.yonoxShowAccountToken?.(data.token);
}

$('yx-auth-switch').addEventListener('click', () => {
  $('yx-auth-error').textContent = '';
  setAuthMode(authMode === 'register' ? 'login' : 'register');
});

$('yx-auth-form').addEventListener('submit', async event => {
  event.preventDefault();
  const login = authMode === 'login';
  const button = $('yx-auth-submit');
  const body = login
    ? { token: $('yx-token').value.trim() }
    : { username: $('yx-username').value.trim() };

  button.disabled = true;
  button.textContent = login ? 'Logging in...' : 'Creating account...';

  try {
    const data = await request(login ? '/login' : '/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    await finishAuthentication(data);
  } catch (error) {
    $('yx-auth-error').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = authMode === 'login' ? 'Log in' : 'Create account';
  }
});

"""
    a = a[:begin] + handlers + a[finish:]
    out["app.js"] = a

    # UI: account token panel and translations
    u = out["yonox-ui.js"]
    u = replace_once(
        u,
        "let page = 'home';",
        "let page = 'home';\n  let displayedAccountToken = '';\n  let tokenStatusKey = 'tokenHidden';",
        "token UI state"
    )

    u = replace_once(
        u,
        "accountInfo:'Account information', language:'Language',",
        """accountInfo:'Account information', language:'Language',
      accountToken:'Account login token',
      accountTokenDesc:'Use this token to sign in to your YonoX account.',
      createToken:'Create / renew token',
      copyToken:'Copy token',
      tokenHidden:'The token is shown only once. If lost, create a new one.',
      tokenCreated:'Save this token safely. It will not be shown again.',
      tokenCopied:'Token copied.',""",
        "English translations"
    )
    u = replace_once(
        u,
        "accountInfo:'معلومات الحساب', language:'اللغة',",
        """accountInfo:'معلومات الحساب', language:'اللغة',
      accountToken:'توكن تسجيل الدخول',
      accountTokenDesc:'استخدم هذا التوكن لتسجيل الدخول إلى حسابك في YonoX.',
      createToken:'إنشاء / تجديد التوكن',
      copyToken:'نسخ التوكن',
      tokenHidden:'يظهر التوكن مرة واحدة فقط. إذا فقدته، أنشئ توكنًا جديدًا.',
      tokenCreated:'احفظ التوكن في مكان آمن، فلن يظهر مرة أخرى.',
      tokenCopied:'تم نسخ التوكن.',""",
        "Arabic translations"
    )

    start = u.index("    account.innerHTML = `")
    end_marker = '      <div id="yx-ownership"></div>`;'
    end = u.index(end_marker, start) + len(end_marker)

    panel = """    account.innerHTML = `
      <h1 data-word="accountInfo"></h1>
      <section class="yx-panel">
        <div id="yx-profile"></div>
        <p data-word="language"></p>
        <button id="yx-language" class="yx-language"></button>
      </section>
      <section class="yx-panel" id="yx-token-panel">
        <h2 data-word="accountToken"></h2>
        <p class="yx-muted" data-word="accountTokenDesc"></p>
        <div id="yx-token-value" style="margin:12px 0;padding:12px;background:#f2f6f3;border-radius:9px;overflow-wrap:anywhere;direction:ltr;text-align:left;user-select:text"></div>
        <p class="yx-muted" id="yx-token-message"></p>
        <button id="yx-token-action" class="yx-language"></button>
        <button id="yx-token-copy" class="yx-language" hidden></button>
      </section>
      <div id="yx-ownership"></div>`;"""
    u = u[:start] + panel + u[end:]

    functions = """
  function updateTokenPanel() {
    const value = $('yx-token-value');
    const message = $('yx-token-message');
    const action = $('yx-token-action');
    const copy = $('yx-token-copy');
    if (!value || !message || !action || !copy) return;
    const t = window.yonoxT || (key => key);
    value.textContent = displayedAccountToken;
    message.textContent = t(tokenStatusKey);
    action.textContent = t('createToken');
    copy.textContent = t('copyToken');
    copy.hidden = !displayedAccountToken;
  }

  function setupTokenPanel() {
    const action = $('yx-token-action');
    const copy = $('yx-token-copy');
    if (!action || !copy || action.dataset.bound) return;
    action.dataset.bound = '1';

    action.addEventListener('click', async () => {
      action.disabled = true;
      try {
        const result = await request('/account/token', { method: 'POST' });
        displayedAccountToken = result.token;
        tokenStatusKey = 'tokenCreated';
        updateTokenPanel();
      } catch (error) {
        $('yx-token-message').textContent = error.message;
      } finally {
        action.disabled = false;
      }
    });

    copy.addEventListener('click', async () => {
      if (!displayedAccountToken) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(displayedAccountToken);
        } else {
          const field = document.createElement('textarea');
          field.value = displayedAccountToken;
          document.body.appendChild(field);
          field.select();
          document.execCommand('copy');
          field.remove();
        }
        tokenStatusKey = 'tokenCopied';
        updateTokenPanel();
      } catch {
        $('yx-token-message').textContent = 'Copy failed. Copy the token manually.';
      }
    });

    window.yonoxShowAccountToken = token => {
      displayedAccountToken = String(token || '');
      tokenStatusKey = 'tokenCreated';
      updateTokenPanel();
      showPage('account');
    };
    updateTokenPanel();
  }

"""
    u = replace_once(u, "  function updateAccount() {", functions + "  function updateAccount() {", "token UI functions")
    u = replace_once(
        u,
        "    if (!$('yx-pages')) return setTimeout(init, 150);",
        "    if (!$('yx-pages')) return setTimeout(init, 150);\n    setupTokenPanel();",
        "token UI initialization"
    )
    u = replace_once(
        u,
        "    window.dispatchEvent(new Event('yonox-language-change'));",
        "    window.dispatchEvent(new Event('yonox-language-change'));\n    updateTokenPanel();",
        "token UI translation refresh"
    )
    out["yonox-ui.js"] = u

    # Validate everything before modifying any source file.
    for name in NAMES:
        if out[name] == src[name]:
            raise RuntimeError(f"No changes generated for {name}")

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backups = {}
    for name in NAMES:
        backup = ROOT / f"{name}.{stamp}.bak"
        shutil.copy2(ROOT / name, backup)
        backups[name] = backup

    try:
        for name in NAMES:
            temp = ROOT / f".{name}.patch.tmp"
            temp.write_text(out[name])
            temp.replace(ROOT / name)
    except Exception:
        for name in NAMES:
            (ROOT / name).write_text(src[name])
        raise

    print("Patch applied successfully.")
    for name in NAMES:
        print(f"{name} backup: {backups[name].name}")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PATCH ABORTED: {exc}", file=sys.stderr)
        sys.exit(1)
