import { generateId } from "@/app/lib/data";
import {
  hashPassword,
  verifyPassword,
  generateRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
  sha256Base64,
} from "@/app/lib/crypto";

export type UserRole = "staff" | "owner";

export interface User {
  id: string;
  email: string;
  /** @deprecated Stored for backwards compatibility; prefer passwordHash. */
  password?: string;
  passwordHash?: string;
  recoveryCodeHash?: string;
  role: UserRole;
  name: string;
  updatedAt?: number;
}

/** @deprecated Kept for backwards compatibility; prefer `User`. */
export interface DemoUser {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

const USERS_KEY = "dominico-users";
const SESSION_KEY = "dominico-session";
const OWNER_SETUP_KEY = "dominico-owner-setup";
const LOGIN_ATTEMPTS_KEY = "dominico-login-attempts";

// Session durations in milliseconds.
const DEFAULT_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const RECOVERY_CODE_RAW_LENGTH = 24;

// Rate limiting config.
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const SEED_USERS: User[] = [
  {
    id: "user-rina",
    email: "rina@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Rina",
    updatedAt: 0,
  },
  {
    id: "user-dewi",
    email: "dewi@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Dewi",
    updatedAt: 0,
  },
  {
    id: "user-budi",
    email: "budi@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Budi",
    updatedAt: 0,
  },
  {
    id: "user-owner",
    email: "owner@dominico.com",
    password: "word456",
    role: "owner",
    name: "Owner Dominico",
    updatedAt: 0,
  },
];

/** @deprecated Kept for backwards compatibility; prefer `getUsers()`. */
export const DEMO_USERS: DemoUser[] = SEED_USERS.map((u) => ({
  email: u.email,
  password: u.password ?? "",
  role: u.role,
  name: u.name,
}));

function seedUsers(): User[] {
  if (typeof window === "undefined") return SEED_USERS;
  localStorage.setItem(USERS_KEY, JSON.stringify(SEED_USERS));
  return SEED_USERS;
}

export function getUsers(): User[] {
  if (typeof window === "undefined") return SEED_USERS;
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return seedUsers();
  try {
    return JSON.parse(raw) as User[];
  } catch {
    return seedUsers();
  }
}

export function saveUsers(users: User[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan data pengguna.";
    throw new Error(`Penyimpanan penuh atau tidak tersedia: ${message}`);
  }
}

export function hasOwner(): boolean {
  return getUsers().some((u) => u.role === "owner");
}

export function markOwnerSetupComplete() {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNER_SETUP_KEY, "1");
}

export function isOwnerSetupComplete(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(OWNER_SETUP_KEY) === "1";
}

export async function createOwner(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: User; recoveryCode: string }> {
  if (hasOwner()) {
    throw new Error("Owner sudah dibuat.");
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const passwordHash = await hashPassword(data.password);
  const recoveryCode = generateRecoveryCode();
  const recoveryCodeHash = await hashRecoveryCode(recoveryCode);

  const owner: User = {
    id: generateId(),
    email: normalizedEmail,
    passwordHash,
    recoveryCodeHash,
    role: "owner",
    name: data.name.trim(),
    updatedAt: Date.now(),
  };

  saveUsers([owner]);
  markOwnerSetupComplete();
  return { user: owner, recoveryCode };
}

export async function addUser(
  data: Omit<User, "id"> & { id?: string }
): Promise<User> {
  const users = getUsers();
  const normalizedEmail = data.email.trim().toLowerCase();

  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error("Email sudah terdaftar.");
  }

  const password = data.password ?? "";
  const passwordHash =
    data.passwordHash ?? (password ? await hashPassword(password) : undefined);

  const newUser: User = {
    id: data.id ?? generateId(),
    email: normalizedEmail,
    passwordHash,
    role: data.role,
    name: data.name.trim(),
    updatedAt: Date.now(),
  };

  saveUsers([...users, newUser]);
  return newUser;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "name" | "email" | "password" | "role">>
): Promise<User | undefined> {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return undefined;

  const existing = users[index];

  if (data.email !== undefined) {
    const normalizedEmail = data.email.trim().toLowerCase();
    if (
      users.some(
        (u) => u.email === normalizedEmail && u.id !== id
      )
    ) {
      throw new Error("Email sudah digunakan oleh pengguna lain.");
    }
    existing.email = normalizedEmail;
  }

  if (data.name !== undefined) {
    existing.name = data.name.trim();
  }

  if (data.password !== undefined && data.password !== "") {
    existing.passwordHash = await hashPassword(data.password);
    // Clear legacy plaintext password once migrated.
    delete existing.password;
  }

  if (data.role !== undefined) {
    existing.role = data.role;
  }

  existing.updatedAt = Date.now();
  users[index] = existing;
  saveUsers(users);
  return existing;
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return false;

  // Protect the built-in owner account from deletion.
  if (user.role === "owner") {
    throw new Error("Akun owner tidak dapat dihapus.");
  }

  saveUsers(users.filter((u) => u.id !== id));
  return true;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  expiresAt: number;
  /** Fingerprint derived from user secrets; invalidates session on password change. */
  fingerprint: string;
  /** Whether this session was created with remember-me enabled. */
  rememberMe: boolean;
}

interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

function readLoginAttempts(): Record<string, LoginAttempt> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LoginAttempt>) : {};
  } catch {
    return {};
  }
}

function writeLoginAttempts(attempts: Record<string, LoginAttempt>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    // Login attempts are non-critical; ignore storage errors.
  }
}

function getAttemptKey(email: string): string {
  return email.trim().toLowerCase();
}

function isLockedOut(email: string): { locked: boolean; remainingMs?: number } {
  const attempts = readLoginAttempts();
  const key = getAttemptKey(email);
  const attempt = attempts[key];
  if (!attempt?.lockedUntil) return { locked: false };
  const now = Date.now();
  if (now < attempt.lockedUntil) {
    return { locked: true, remainingMs: attempt.lockedUntil - now };
  }
  // Lockout expired; reset.
  delete attempts[key];
  writeLoginAttempts(attempts);
  return { locked: false };
}

function recordFailedLogin(email: string) {
  const attempts = readLoginAttempts();
  const key = getAttemptKey(email);
  const now = Date.now();
  const current = attempts[key] ?? { count: 0, firstAttemptAt: now };

  // Once locked, don't keep incrementing the counter.
  if (current.lockedUntil && now < current.lockedUntil) {
    return;
  }

  current.count += 1;

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = now + LOGIN_LOCKOUT_MS;
  }

  attempts[key] = current;
  writeLoginAttempts(attempts);
}

function recordSuccessfulLogin(email: string) {
  const attempts = readLoginAttempts();
  const key = getAttemptKey(email);
  if (attempts[key]) {
    delete attempts[key];
    writeLoginAttempts(attempts);
  }
}

function formatLockoutDuration(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} jam${remainingMinutes > 0 ? ` ${remainingMinutes} menit` : ""}`;
  }
  return `${minutes} menit`;
}

async function createFingerprint(user: User): Promise<string> {
  // Deterministic fingerprint tied to user id, password hash, and updatedAt.
  // This invalidates existing sessions when the password is changed.
  const material = `${user.id}:${user.passwordHash ?? user.password ?? ""}:${user.updatedAt ?? 0}`;
  return sha256Base64(material);
}

async function createSession(
  user: User,
  rememberMe = false
): Promise<AuthSession> {
  const durationMs = rememberMe
    ? REMEMBER_ME_DURATION_MS
    : DEFAULT_SESSION_DURATION_MS;
  const now = Date.now();
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    expiresAt: now + durationMs,
    fingerprint: await createFingerprint(user),
    rememberMe,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem("dominico-role", user.role);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan sesi.";
      throw new Error(`Penyimpanan penuh atau tidak tersedia: ${message}`);
    }
  }

  return session;
}

async function migratePlaintextPassword(
  user: User,
  password: string
): Promise<void> {
  if (!user.password) return;
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) return;

  users[index] = {
    ...users[index],
    passwordHash: await hashPassword(password),
    updatedAt: Date.now(),
  };
  delete users[index].password;
  saveUsers(users);
}

export interface LoginOptions {
  /** Extend session to 30 days instead of 8 hours. */
  rememberMe?: boolean;
}

export async function login(
  email: string,
  password: string,
  options: LoginOptions = {}
): Promise<AuthSession | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const lockout = isLockedOut(normalizedEmail);
  if (lockout.locked) {
    throw new Error(
      `Terlalu banyak percobaan login. Coba lagi dalam ${formatLockoutDuration(lockout.remainingMs ?? 0)}.`
    );
  }

  const users = getUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    recordFailedLogin(normalizedEmail);
    return null;
  }

  let valid = false;

  if (user.passwordHash) {
    valid = await verifyPassword(password, user.passwordHash);
  } else if (user.password) {
    // Backwards compatibility for plaintext passwords.
    valid = user.password === password;
  }

  if (!valid) {
    recordFailedLogin(normalizedEmail);
    return null;
  }

  // Migrate plaintext password after successful verification so the session
  // fingerprint is computed from the new hash, not the old plaintext.
  if (user.password) {
    await migratePlaintextPassword(user, password);
  }

  // Re-fetch user so the session uses the migrated password hash.
  const currentUser = getUsers().find((u) => u.id === user.id);
  if (!currentUser) {
    recordFailedLogin(normalizedEmail);
    return null;
  }

  recordSuccessfulLogin(normalizedEmail);
  return createSession(currentUser, options.rememberMe);
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return false;

  let validOld = false;
  if (user.passwordHash) {
    validOld = await verifyPassword(oldPassword, user.passwordHash);
  } else if (user.password) {
    validOld = user.password === oldPassword;
  }

  if (!validOld) return false;

  const index = users.findIndex((u) => u.id === userId);
  users[index] = {
    ...users[index],
    passwordHash: await hashPassword(newPassword),
    updatedAt: Date.now(),
  };
  delete users[index].password;
  saveUsers(users);
  return true;
}

export async function resetOwnerPassword(
  recoveryCode: string,
  newPassword: string
): Promise<boolean> {
  const owner = getUsers().find((u) => u.role === "owner");
  if (!owner) return false;
  if (!owner.recoveryCodeHash) return false;

  const valid = await verifyRecoveryCode(recoveryCode, owner.recoveryCodeHash);
  if (!valid) return false;

  const users = getUsers();
  const index = users.findIndex((u) => u.id === owner.id);
  users[index] = {
    ...users[index],
    passwordHash: await hashPassword(newPassword),
    updatedAt: Date.now(),
  };
  delete users[index].password;
  saveUsers(users);
  return true;
}

/**
 * Generate a new recovery code for the owner after verifying the current password.
 * Returns the new plain recovery code. Important: show it once and store safely.
 */
export async function regenerateOwnerRecoveryCode(
  currentPassword: string
): Promise<{ code: string } | null> {
  const owner = getUsers().find((u) => u.role === "owner");
  if (!owner) return null;

  let valid = false;
  if (owner.passwordHash) {
    valid = await verifyPassword(currentPassword, owner.passwordHash);
  } else if (owner.password) {
    valid = owner.password === currentPassword;
  }
  if (!valid) return null;

  const code = generateRecoveryCode();
  const recoveryCodeHash = await hashRecoveryCode(code);

  const users = getUsers();
  const index = users.findIndex((u) => u.id === owner.id);
  users[index] = {
    ...users[index],
    recoveryCodeHash,
    updatedAt: Date.now(),
  };
  saveUsers(users);
  return { code };
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("dominico-role");
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

async function validateSessionFingerprint(
  session: AuthSession
): Promise<boolean> {
  const user = getUsers().find((u) => u.id === session.userId);
  if (!user) return false;
  const currentFingerprint = await createFingerprint(user);
  return currentFingerprint === session.fingerprint;
}

export async function isSessionValid(
  session?: AuthSession | null
): Promise<boolean> {
  const s = session ?? getSession();
  if (!s) return false;
  if (typeof s.expiresAt !== "number" || Date.now() >= s.expiresAt) return false;
  if (!s.fingerprint) return false;
  return validateSessionFingerprint(s);
}

export async function requireAuth(
  expectedRole?: UserRole
): Promise<AuthSession | null> {
  const session = getSession();
  if (!(await isSessionValid(session))) {
    logout();
    return null;
  }
  if (expectedRole && session!.role !== expectedRole) return null;
  return session;
}

/** Refresh session expiry on user activity. */
export function touchSession(): void {
  const s = getSession();
  if (!s) return;
  const durationMs = s.rememberMe
    ? REMEMBER_ME_DURATION_MS
    : DEFAULT_SESSION_DURATION_MS;
  s.expiresAt = Date.now() + durationMs;
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function getCurrentUser(): User | undefined {
  const session = getSession();
  if (!session) return undefined;
  return getUsers().find((u) => u.id === session.userId);
}

/** Validate raw recovery code length (without dashes). */
export function isRecoveryCodeFormatValid(code: string): boolean {
  const normalized = code.replace(/-/g, "").trim().toUpperCase();
  return normalized.length === RECOVERY_CODE_RAW_LENGTH;
}

export function normalizeRecoveryCode(code: string): string {
  return code.replace(/-/g, "").trim().toUpperCase();
}

/** Format raw recovery code with dashes for readability. */
export function formatRecoveryCode(code: string): string {
  const normalized = normalizeRecoveryCode(code);
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}
