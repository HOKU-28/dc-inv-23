import { generateId } from "@/app/lib/data";

export type UserRole = "staff" | "owner";

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  name: string;
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

const SEED_USERS: User[] = [
  {
    id: "user-rina",
    email: "rina@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Rina",
  },
  {
    id: "user-dewi",
    email: "dewi@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Dewi",
  },
  {
    id: "user-budi",
    email: "budi@dominico.com",
    password: "pass123",
    role: "staff",
    name: "Budi",
  },
  {
    id: "user-owner",
    email: "owner@dominico.com",
    password: "word456",
    role: "owner",
    name: "Owner Dominico",
  },
];

/** @deprecated Kept for backwards compatibility; prefer `getUsers()`. */
export const DEMO_USERS: DemoUser[] = SEED_USERS.map((u) => ({
  email: u.email,
  password: u.password,
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
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function addUser(
  data: Omit<User, "id"> & { id?: string }
): User {
  const users = getUsers();
  const normalizedEmail = data.email.trim().toLowerCase();

  if (users.some((u) => u.email === normalizedEmail)) {
    throw new Error("Email sudah terdaftar.");
  }

  const newUser: User = {
    id: data.id ?? generateId(),
    email: normalizedEmail,
    password: data.password,
    role: data.role,
    name: data.name.trim(),
  };

  saveUsers([...users, newUser]);
  return newUser;
}

export function updateUser(
  id: string,
  data: Partial<Pick<User, "name" | "email" | "password" | "role">>
): User | undefined {
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
    existing.password = data.password;
  }

  if (data.role !== undefined) {
    existing.role = data.role;
  }

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
  email: string;
  role: UserRole;
  name: string;
}

export function login(email: string, password: string): AuthSession | null {
  const normalizedEmail = email.trim().toLowerCase();
  const users = getUsers();
  const user = users.find(
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
