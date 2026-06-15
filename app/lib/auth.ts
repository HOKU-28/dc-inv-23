export type UserRole = "staff" | "owner";

export interface DemoUser {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

export const DEMO_USERS: DemoUser[] = [
  // Akun staff per orang — supaya owner bisa tahu siapa yang mencatat
  {
    email: "rina@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Rina",
  },
  {
    email: "dewi@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Dewi",
  },
  {
    email: "budi@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Budi",
  },
  {
    email: "owner@dominico.com",
    password: "word456",
    role: "owner",
    name: "Owner Dominico",
  },
];

export interface AuthSession {
  email: string;
  role: UserRole;
  name: string;
}

const SESSION_KEY = "dominico-session";

export function login(email: string, password: string): AuthSession | null {
  const normalizedEmail = email.trim().toLowerCase();
  const user = DEMO_USERS.find(
    (u) => u.email === normalizedEmail && u.password === password
  );
  if (!user) return null;

  const session: AuthSession = {
    email: user.email,
    role: user.role,
    name: user.name,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem("dominico-role", user.role);
  }

  return session;
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

export function requireAuth(
  expectedRole?: UserRole
): AuthSession | null {
  const session = getSession();
  if (!session) return null;
  if (expectedRole && session.role !== expectedRole) return null;
  return session;
}
