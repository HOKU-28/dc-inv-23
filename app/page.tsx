"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Coffee, Eye, EyeOff, Loader2, UserCog, Users } from "lucide-react";
import { login, getSession } from "@/app/lib/auth";
import { syncAll } from "@/app/lib/sync";
import { useOnlineStatus } from "@/app/hooks/use-online-status";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/app/components/skeletons";

interface FormErrors {
  email?: string;
  password?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Email wajib diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Format email tidak valid.";
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Password wajib diisi.";
  if (password.length < 6) return "Password minimal 6 karakter.";
}

export default function LoginPage() {
  const router = useRouter();
  const online = useOnlineStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(`/dashboard/${session.role}`);
    } else {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (online) {
      syncAll().catch((err) => console.error("[login] syncAll failed:", err));
    }
  }, [online]);

  const validateField = (name: keyof FormErrors, value: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: name === "email" ? validateEmail(value) : validatePassword(value),
    }));
  };

  const validateForm = (): boolean => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    return !emailError && !passwordError;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    setTimeout(() => {
      const session = login(email, password);
      if (session) {
        toast.success(`Selamat datang, ${session.name}!`);
        router.replace(`/dashboard/${session.role}`);
      } else {
        setLoading(false);
        toast.error("Email atau password salah.");
        setPassword("");
      }
    }, 400);
  };

  const fillDemo = (role: "staff" | "owner") => {
    if (role === "staff") {
      setEmail("rina@dominico.com");
      setPassword("pass123");
    } else {
      setEmail("owner@dominico.com");
      setPassword("word456");
    }
    setErrors({});
  };

  if (checking) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm sm:max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Coffee className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Dominico Stock</h1>
          <p className="text-sm text-muted-foreground">Masuk untuk mencatat & memantau stok</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Login</CardTitle>
            <CardDescription>Masukkan email dan password Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="timdominico@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) validateField("email", e.target.value);
                  }}
                  onBlur={(e) => validateField("email", e.target.value)}
                  disabled={loading}
                  aria-invalid={!!errors.email}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) validateField("password", e.target.value);
                    }}
                    onBlur={(e) => validateField("password", e.target.value)}
                    disabled={loading}
                    aria-invalid={!!errors.password}
                    className={`pr-10 ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full min-h-11" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memeriksa...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Demo cepat</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemo("staff")}
              className="w-full"
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Staff
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillDemo("owner")}
              className="w-full"
            >
              <UserCog className="h-3.5 w-3.5 mr-1.5" />
              Owner
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Tombol demo mengisi form secara otomatis. Kredensial tidak ditampilkan demi keamanan.
          </p>
        </div>
      </div>
    </div>
  );
}
