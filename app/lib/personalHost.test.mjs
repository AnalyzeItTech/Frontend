/**
 * Personal subdomain routing and session boot.
 * Run: node --test app/lib/personalHost.test.mjs
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { describe, it } from 'node:test';

import {
  AUTH_COOKIE,
  SESSION_COOKIE,
  TOKEN_STORAGE_KEY,
  buildSessionBootScript,
  canonicalAppOrigin,
  classifySlugFailure,
  decideHostRequest,
  extractPersonalSlug,
  isValidPersonalSlug,
  personalSlugAllowed,
  publicHost,
  returnUrlForPersonalSlug,
} from './personalHost.mjs';

function runBoot({
  hostname,
  protocol = 'https:',
  cookie = '',
  storage = {},
  hash = '',
  search = '',
}) {
  const jar = new Map();
  for (const part of cookie.split(';').map((s) => s.trim()).filter(Boolean)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    jar.set(part.slice(0, eq), part.slice(eq + 1));
  }
  const local = { ...storage };
  const loc = {
    hostname,
    protocol,
    hash,
    search,
    pathname: '/',
    href: `${protocol}//${hostname}/${search}${hash}`,
    port: '',
  };
  const document = {
    documentElement: {
      classList: { add() {} },
      setAttribute() {},
    },
  };
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set(value) {
      const [pair, ...attrs] = String(value).split(';').map((s) => s.trim());
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const val = pair.slice(eq + 1);
      const maxAge = attrs.find((a) => a.toLowerCase().startsWith('max-age='));
      if (maxAge && Number(maxAge.split('=')[1]) === 0) jar.delete(name);
      else jar.set(name, val);
    },
  });
  const sandbox = {
    location: loc,
    document,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(local, k) ? local[k] : null),
      setItem: (k, v) => {
        local[k] = String(v);
      },
    },
    history: {
      replaceState(_a, _b, next) {
        loc.search = String(next);
        loc.hash = '';
      },
    },
    window: { matchMedia: () => ({ matches: false }) },
  };
  vm.createContext(sandbox);
  vm.runInContext(buildSessionBootScript(), sandbox);
  return { jar, local, loc };
}

describe('personal host routing', () => {
  it('reads a single personal label and ignores apex, www, and nested hosts', () => {
    assert.equal(extractPersonalSlug('yourname.analyzeit.in'), 'yourname');
    assert.equal(extractPersonalSlug('Your-Name.analyzeit.in:443'), 'your-name');
    assert.equal(extractPersonalSlug('www.analyzeit.in'), null);
    assert.equal(extractPersonalSlug('analyzeit.in'), null);
    assert.equal(extractPersonalSlug('app.analyzeit.in'), null);
    assert.equal(extractPersonalSlug('a.b.analyzeit.in'), null);
    assert.equal(extractPersonalSlug('ab.analyzeit.in'), null);
    assert.equal(extractPersonalSlug('foo.vercel.app'), null);
    assert.equal(extractPersonalSlug('yourname.localhost:3000'), 'yourname');
    assert.equal(extractPersonalSlug('localhost:3000'), null);
  });

  it('does not trust a forwarded host when the request already has a public host', () => {
    assert.equal(
      publicHost('www.analyzeit.in', 'evil.analyzeit.in'),
      'www.analyzeit.in',
    );
    assert.equal(
      publicHost('frontend-abc.vercel.app', 'yourname.analyzeit.in'),
      'yourname.analyzeit.in',
    );
  });

  it('sends an unknown personal host to the www session handoff', () => {
    const decision = decideHostRequest({
      hostHeader: 'yourname.analyzeit.in',
      pathname: '/',
      protocol: 'https:',
    });
    assert.equal(decision.action, 'redirect');
    assert.equal(decision.url, 'https://www.analyzeit.in/auth/subdomain?slug=yourname');
  });

  it('rewrites a signed-in personal host to the dashboard slug', () => {
    const decision = decideHostRequest({
      hostHeader: 'yourname.analyzeit.in',
      pathname: '/',
      sessionCookie: 'jwt-token',
    });
    assert.deepEqual(decision, { action: 'rewrite', slug: 'yourname' });
  });

  it('keeps other app routes on the canonical host', () => {
    const decision = decideHostRequest({
      hostHeader: 'yourname.analyzeit.in',
      pathname: '/research',
      sessionCookie: 'jwt-token',
    });
    assert.equal(decision.action, 'redirect');
    assert.equal(decision.url, 'https://www.analyzeit.in/research');
  });

  it('keeps apex on www', () => {
    const decision = decideHostRequest({
      hostHeader: 'analyzeit.in',
      pathname: '/dashboard',
      search: '?project=1',
    });
    assert.equal(decision.action, 'redirect');
    assert.equal(decision.status, 308);
    assert.equal(decision.url, 'https://www.analyzeit.in/dashboard?project=1');
  });

  it('builds a same-site return URL and refuses anything that is not a slug', () => {
    assert.equal(
      returnUrlForPersonalSlug('yourname', { hostname: 'www.analyzeit.in', protocol: 'https:' }),
      'https://yourname.analyzeit.in/',
    );
    assert.equal(
      returnUrlForPersonalSlug('yourname', { hostname: 'localhost', protocol: 'http:', port: '3000' }, 'tok'),
      'http://yourname.localhost:3000/?handoff=1#session=tok',
    );
    assert.equal(returnUrlForPersonalSlug('https://evil.com', { hostname: 'www.analyzeit.in' }), null);
    assert.equal(returnUrlForPersonalSlug('../etc', { hostname: 'www.analyzeit.in' }), null);
    assert.equal(isValidPersonalSlug('www'), false);
    assert.equal(canonicalAppOrigin({ protocol: 'http:', hostHeader: 'yourname.localhost:3000' }), 'http://localhost:3000');
  });
});

describe('session boot script', () => {
  it('hydrates localStorage from the parent cookie and does not clear it', () => {
    const encoded = encodeURIComponent('header.payload.sig');
    const { jar, local } = runBoot({
      hostname: 'yourname.analyzeit.in',
      cookie: `${SESSION_COOKIE}=${encoded}; ${AUTH_COOKIE}=1`,
    });
    assert.equal(local[TOKEN_STORAGE_KEY], 'header.payload.sig');
    assert.equal(jar.has(AUTH_COOKIE), true);
    assert.equal(jar.get(AUTH_COOKIE), '1');
  });

  it('does not clear the shared cookie when a personal host has no local token yet', () => {
    const { jar } = runBoot({
      hostname: 'yourname.analyzeit.in',
      cookie: `${AUTH_COOKIE}=1`,
    });
    assert.equal(jar.get(AUTH_COOKIE), '1');
  });

  it('mirrors a www token into the shared session cookie', () => {
    const { jar } = runBoot({
      hostname: 'www.analyzeit.in',
      storage: { [TOKEN_STORAGE_KEY]: 'header.payload.sig' },
    });
    assert.equal(decodeURIComponent(jar.get(SESSION_COOKIE)), 'header.payload.sig');
    assert.equal(jar.get(AUTH_COOKIE), '1');
  });

  it('hydrates www from the shared session cookie', () => {
    const { jar, local } = runBoot({
      hostname: 'www.analyzeit.in',
      cookie: `${SESSION_COOKIE}=${encodeURIComponent('header.payload.sig')}`,
    });
    assert.equal(local[TOKEN_STORAGE_KEY], 'header.payload.sig');
    assert.equal(jar.get(AUTH_COOKIE), '1');
  });

  it('clears a stale auth flag on www when there is no session', () => {
    const { jar } = runBoot({
      hostname: 'www.analyzeit.in',
      cookie: `${AUTH_COOKIE}=1`,
    });
    assert.equal(jar.has(AUTH_COOKIE), false);
    assert.equal(jar.has(SESSION_COOKIE), false);
  });
});

describe('entitlement gate', () => {
  it('follows the personal_dashboard_slug flag, then Premium or VIP', () => {
    assert.equal(personalSlugAllowed({ tier: 'premium', entitlements: { personal_dashboard_slug: false } }), false);
    assert.equal(personalSlugAllowed({ tier: 'free', entitlements: { personal_dashboard_slug: true } }), true);
    assert.equal(personalSlugAllowed({ tier: 'premium' }), true);
    assert.equal(personalSlugAllowed({ tier: 'premium_plus' }), true);
    assert.equal(personalSlugAllowed({ tier: 'free' }), false);
    assert.equal(personalSlugAllowed({}), null);
  });

  it('classifies slug lookup failures', () => {
    assert.equal(classifySlugFailure(403, true), 'upgrade');
    assert.equal(classifySlugFailure(402, false), 'upgrade');
    assert.equal(classifySlugFailure(404, false), 'missing');
    assert.equal(classifySlugFailure(403, false), 'denied');
    assert.equal(classifySlugFailure(500, false), 'error');
  });
});
