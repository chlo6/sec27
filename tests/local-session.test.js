import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_USERS } from '../dist/data.js';
import { authenticate, startSession, loadSession, endSession, TEST_ACCOUNTS, DEMO_PASSWORD, SESSION_KEY, SESSION_VERSION } from '../dist/local-session.js';

function memory() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('all public test accounts resolve to the existing demo personas', () => {
  assert.deepEqual(TEST_ACCOUNTS.map(({ username, userId, role }) => [username, userId, role]), [
    ['admin123', 'admin-1', 'admin'],
    ['user123', 'stu-1', 'student'],
    ['organizer123', 'org-1', 'organizer'],
    ['counselor123', 'counselor-1', 'counselor'],
    ['user456', 'stu-2', 'student'],
    ['user789', 'stu-3', 'student'],
    ['organizer456', 'org-2', 'organizer'],
  ]);
  for (const account of TEST_ACCOUNTS) {
    const signedIn = authenticate(account.username, 'password123', DEMO_USERS);
    assert.deepEqual(signedIn, account);
    assert.notEqual(signedIn, account);
  }
});

test('usernames are trimmed and case insensitive; passwords remain exact', () => {
  assert.deepEqual(authenticate('  UsEr123  ', DEMO_PASSWORD, DEMO_USERS), TEST_ACCOUNTS[1]);
  for (const password of ['', 'wrong', 'Password123', ' password123', 'password123 ', null, 123]) {
    assert.equal(authenticate('user123', password, DEMO_USERS), null);
  }
  for (const username of ['', 'unknown', 'stu-1', null, {}, 123]) {
    assert.equal(authenticate(username, DEMO_PASSWORD, DEMO_USERS), null);
  }
});

test('sign-in rejects deleted users, changed roles, and invalid user collections', () => {
  assert.equal(authenticate('user123', DEMO_PASSWORD, DEMO_USERS.filter(user => user.id !== 'stu-1')), null);
  const users = DEMO_USERS.map(user => user.id === 'stu-1' ? { ...user, role: 'admin' } : user);
  assert.equal(authenticate('user123', DEMO_PASSWORD, users), null);
  for (const value of [undefined, null, {}, [null]]) {
    assert.equal(authenticate('user123', DEMO_PASSWORD, value), null);
  }
});

test('a session survives reload, stores only identity and version, and signs out cleanly', () => {
  const storage = memory();
  storage.setItem('demo-records', 'preserved');
  const account = authenticate('user123', DEMO_PASSWORD, DEMO_USERS);
  assert.deepEqual(startSession({ ...account, password: DEMO_PASSWORD }, storage), account);
  const raw = storage.getItem(SESSION_KEY);
  assert.deepEqual(JSON.parse(raw), { version: 1, ...account });
  assert.equal(SESSION_VERSION, 1);
  assert.doesNotMatch(raw, /password/i);
  assert.deepEqual(loadSession(DEMO_USERS, storage), account);
  assert.equal(endSession(storage), true);
  assert.equal(storage.getItem(SESSION_KEY), null);
  assert.equal(loadSession(DEMO_USERS, storage), null);
  assert.equal(storage.getItem('demo-records'), 'preserved');
});

test('malformed, unsupported, and mismatched session records are cleared', () => {
  const account = TEST_ACCOUNTS[1];
  const valid = { version: SESSION_VERSION, ...account };
  const badRecords = [
    '{broken', '', 'null', '[]', 'true', '42', '"user123"',
    JSON.stringify(account),
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, version: '1' }),
    JSON.stringify({ ...valid, username: 'USER123' }),
    JSON.stringify({ ...valid, username: 'unknown' }),
    JSON.stringify({ ...valid, role: 'admin' }),
    JSON.stringify({ ...valid, userId: 'stu-2' }),
    JSON.stringify({ ...valid, password: DEMO_PASSWORD }),
  ];
  for (const raw of badRecords) {
    const storage = memory();
    storage.setItem(SESSION_KEY, raw);
    assert.equal(loadSession(DEMO_USERS, storage), null, raw);
    assert.equal(storage.getItem(SESSION_KEY), null, raw);
  }
});

test('session reload clears identities whose demo user no longer exists or has changed role', () => {
  for (const users of [
    DEMO_USERS.filter(user => user.id !== 'stu-1'),
    DEMO_USERS.map(user => user.id === 'stu-1' ? { ...user, role: 'organizer' } : user),
    undefined,
  ]) {
    const storage = memory();
    startSession(TEST_ACCOUNTS[1], storage);
    assert.equal(loadSession(users, storage), null);
    assert.equal(storage.getItem(SESSION_KEY), null);
  }
});

test('separate browser storage contexts keep independent sessions', () => {
  const firstTab = memory(), secondTab = memory();
  startSession(TEST_ACCOUNTS[0], firstTab);
  assert.equal(loadSession(DEMO_USERS, secondTab), null);
  startSession(TEST_ACCOUNTS[1], secondTab);
  assert.deepEqual(loadSession(DEMO_USERS, firstTab), TEST_ACCOUNTS[0]);
  assert.deepEqual(loadSession(DEMO_USERS, secondTab), TEST_ACCOUNTS[1]);
  endSession(firstTab);
  assert.deepEqual(loadSession(DEMO_USERS, secondTab), TEST_ACCOUNTS[1]);
});

test('invalid identities and inaccessible storage fail without throwing', () => {
  const storage = memory();
  assert.equal(startSession({ ...TEST_ACCOUNTS[1], role: 'admin' }, storage), null);
  assert.equal(startSession(null, storage), null);
  assert.equal(storage.getItem(SESSION_KEY), null);
  const blockedStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  for (const unavailable of [null, blockedStorage]) {
    assert.equal(loadSession(DEMO_USERS, unavailable), null);
    assert.equal(startSession(TEST_ACCOUNTS[1], unavailable), null);
    assert.equal(endSession(unavailable), false);
  }
});

test('default persistence uses sessionStorage and never touches localStorage', () => {
  const storage = memory();
  const originalSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const originalLocal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { assert.fail('localStorage must not be accessed'); },
    });
    assert.deepEqual(startSession(TEST_ACCOUNTS[2]), TEST_ACCOUNTS[2]);
    assert.deepEqual(loadSession(DEMO_USERS), TEST_ACCOUNTS[2]);
    assert.equal(endSession(), true);
    assert.equal(loadSession(DEMO_USERS), null);
  } finally {
    if (originalSession) Object.defineProperty(globalThis, 'sessionStorage', originalSession);
    else delete globalThis.sessionStorage;
    if (originalLocal) Object.defineProperty(globalThis, 'localStorage', originalLocal);
    else delete globalThis.localStorage;
  }
});
