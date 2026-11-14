// Public prototype credentials for switching between fictional demo personas.
// This browser-local session is not secure authentication or access control.
export const DEMO_PASSWORD = "password123";
export const SESSION_KEY = "civicshift-demo-session-v1";
export const SESSION_VERSION = 1;
export const TEST_ACCOUNTS = Object.freeze([
  { username: "admin123", userId: "admin-1", role: "admin" },
  { username: "user123", userId: "stu-1", role: "student" },
  { username: "organizer123", userId: "org-1", role: "organizer" },
  { username: "counselor123", userId: "counselor-1", role: "counselor" },
  { username: "user456", userId: "stu-2", role: "student" },
  { username: "user789", userId: "stu-3", role: "student" },
  { username: "organizer456", userId: "org-2", role: "organizer" },
].map(account => Object.freeze(account)));

function browserStorage() {
  try { return globalThis.sessionStorage; } catch { return null; }
}

function mappedAccount(value) {
  if (!value || typeof value !== "object") return null;
  return TEST_ACCOUNTS.find(account => account.username === value.username &&
    account.userId === value.userId && account.role === value.role) || null;
}

function userExists(account, users) {
  return Array.isArray(users) && users.some(user =>
    user?.id === account.userId && user.role === account.role);
}

export function authenticate(username, password, users) {
  if (typeof username !== "string" || password !== DEMO_PASSWORD) return null;
  const normalized = username.trim().toLowerCase();
  const account = TEST_ACCOUNTS.find(candidate => candidate.username === normalized);
  return account && userExists(account, users) ? { ...account } : null;
}

export function startSession(account, storage = browserStorage()) {
  const identity = mappedAccount(account);
  if (!identity) return null;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify({ version: SESSION_VERSION, ...identity }));
    return { ...identity };
  } catch { return null; }
}

export function endSession(storage = browserStorage()) {
  try {
    storage.removeItem(SESSION_KEY);
    return true;
  } catch { return false; }
}

export function loadSession(users, storage = browserStorage()) {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw === null) return null;
    const saved = JSON.parse(raw);
    const account = mappedAccount(saved);
    if (saved?.version === SESSION_VERSION && account && userExists(account, users) &&
        Object.keys(saved).length === 4) return { ...account };
  } catch { /* Unreadable storage and malformed records mean signed out. */ }
  endSession(storage);
  return null;
}
