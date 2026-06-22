"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Coffee, Eye, EyeOff, Loader2, UserCog, Users, ArrowLeft, Copy, Check, ShieldCheck } from "lucide-react";
import {
  login,
  getSession,
  isSessionValid,
  createOwner,
  hasOwner,
  resetOwnerPassword,
  UserRole,
  isRecoveryCodeFormatValid,
  formatRecoveryCode,
  normalizeRecoveryCode,
} from "@/app/lib/auth";
import { syncAll } from "@/app/lib/sync";
import { syncExtra } from "@/app/lib/sync-extra";
import { useOnlineStatus } from "@/app/hooks/use-online-status";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/app/components/skeletons";

type Step = "role" | "login" | "setup" | "recovery";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  recoveryCode?: string;
  agree?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return "Email wajib diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Format email tidak valid.";
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Password wajib diisi.";
  if (password.length < 6) return "Password minimal 6 karakter.";
}

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return "weak";
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  if (password.length >= 12 && variety >= 3) return "strong";
  if (variety >= 2) return "medium";
  return "weak";
}

function strengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "Lemah";
    case "medium":
      return "Sedang";
    case "strong":
      return "Kuat";
  }
}

function strengthColor(strength: PasswordStrength): string {
  switch (strength) {
    case "weak":
      return "bg-red-500";
    case "medium":
      return "bg-amber-500";
    case "strong":
      return "bg-green-500";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const online = useOnlineStatus();

  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [checking, setChecking] = useState(true);

  // Setup owner
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Login & recovery
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [agreeIrreversible, setAgreeIrreversible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    const redirectIfValid = async () => {
      const session = getSession();
      if (session && (await isSessionValid(session))) {
        router.replace(`/dashboard/${session.role}`);
        return;
      }

      if (!hasOwner()) {
        setStep("setup");
      }
      if (mounted) setChecking(false);
    };

    redirectIfValid();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Show auth reason if redirected by useAuth.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reason = sessionStorage.getItem("dominico-auth-reason");
    if (reason) {
      toast.info(reason);
      sessionStorage.removeItem("dominico-auth-reason");
    }
  }, []);

  useEffect(() => {
    if (online) {
      syncAll().catch((err) => console.error("[login] syncAll failed:", err));
      syncExtra().catch((err) => console.error("[login] syncExtra failed:", err));
    }
  }, [online]);

  const setFieldError = (name: keyof FormErrors, value: string | undefined) => {
    setErrors((prev) => ({ ...prev, [name]: value }));
  };

  const clearErrors = () => setErrors({});

  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = !ownerName.trim() ? "Nama wajib diisi." : undefined;
    const emailError = validateEmail(ownerEmail);
    const passwordError = validatePassword(password);
    const confirmError = password !== confirmPassword ? "Password tidak cocok." : undefined;

    setErrors({
      name: nameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmError,
    });

    if (nameError || emailError || passwordError || confirmError) return;

    setLoading(true);
    try {
      const { recoveryCode: code } = await createOwner({
        name: ownerName,
        email: ownerEmail,
        password,
      });
      setGeneratedRecoveryCode(code);
      toast.success("Akun owner berhasil dibuat. Simpan recovery code dengan aman!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat akun owner.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;

    setLoading(true);
    try {
      const session = await login(email, password, { rememberMe });
      if (session) {
        toast.success(`Selamat datang, ${session.name}!`);
        router.replace(`/dashboard/${session.role}`);
      } else {
        setLoading(false);
        toast.error("Email atau password salah.");
        setPassword("");
      }
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan saat login.");
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCode = normalizeRecoveryCode(recoveryCode);
    const codeError = !isRecoveryCodeFormatValid(recoveryCode)
      ? "Recovery code tidak valid."
      : undefined;
    const passwordError = validatePassword(password);
    const confirmError = password !== confirmPassword ? "Password tidak cocok." : undefined;
    const agreeError = !agreeIrreversible ? "Centang kotak persetujuan diperlukan." : undefined;

    setErrors({
      recoveryCode: codeError,
      password: passwordError,
      confirmPassword: confirmError,
      agree: agreeError,
    });

    if (codeError || passwordError || confirmError || agreeError) return;

    setLoading(true);
    try {
      const ok = await resetOwnerPassword(normalizedCode, password);
      if (ok) {
        toast.success("Password owner berhasil direset. Silakan login.");
        setStep("login");
        setPassword("");
        setConfirmPassword("");
        setRecoveryCode("");
        setAgreeIrreversible(false);
      } else {
        toast.error("Recovery code salah atau tidak ada owner.");
      }
    } catch {
      toast.error("Gagal mereset password.");
    } finally {
      setLoading(false);
    }
  };

  const copyRecoveryCode = async () => {
    if (!generatedRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(generatedRecoveryCode);
      setCopied(true);
      toast.success("Recovery code disalin.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin.");
    }
  };

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
    setRememberMe(false);
    setErrors({});
    setStep("login");
  };

  const goToRecovery = () => {
    clearErrors();
    setRecoveryCode("");
    setPassword("");
    setConfirmPassword("");
    setAgreeIrreversible(false);
    setStep("recovery");
  };

  const goBackToRole = () => {
    setSelectedRole(null);
    setEmail("");
    setPassword("");
    clearErrors();
    setStep("role");
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

        {step === "setup" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Setup Owner Pertama</CardTitle>
              <CardDescription>Buat akun owner untuk mulai menggunakan sistem</CardDescription>
            </CardHeader>
            <CardContent>
              {!generatedRecoveryCode ? (
                <form onSubmit={handleCreateOwner} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Nama Owner</Label>
                    <Input
                      id="ownerName"
                      placeholder="Nama lengkap"
                      value={ownerName}
                      onChange={(e) => {
                        setOwnerName(e.target.value);
                        if (errors.name) setFieldError("name", undefined);
                      }}
                      disabled={loading}
                    />
                    {errors.name && <ErrorMessage message={errors.name} />}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="owner@dominico.com"
                      value={ownerEmail}
                      onChange={(e) => {
                        setOwnerEmail(e.target.value);
                        if (errors.email) setFieldError("email", undefined);
                      }}
                      disabled={loading}
                    />
                    {errors.email && <ErrorMessage message={errors.email} />}
                  </div>

                  <PasswordField
                    id="setupPassword"
                    label="Password"
                    value={password}
                    onChange={(v) => {
                      setPassword(v);
                      if (errors.password) setFieldError("password", undefined);
                    }}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    error={errors.password}
                    showStrength
                  />

                  <PasswordField
                    id="setupConfirmPassword"
                    label="Konfirmasi Password"
                    value={confirmPassword}
                    onChange={(v) => {
                      setConfirmPassword(v);
                      if (errors.confirmPassword) setFieldError("confirmPassword", undefined);
                    }}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    disabled={loading}
                    error={errors.confirmPassword}
                  />

                  <Button type="submit" className="w-full min-h-11" disabled={loading}>
                    {loading ? <LoadingText /> : "Buat Akun Owner"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-100">
                    <p className="text-sm font-medium mb-2">
                      Simpan recovery code ini dengan amat sangat hati-hati!
                    </p>
                    <p className="text-xs opacity-80 mb-3">
                      Code ini hanya ditampilkan sekali. Gunakan untuk reset password owner jika lupa.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-white/70 dark:bg-black/30 px-3 py-2 text-sm font-mono tracking-wide">
                        {generatedRecoveryCode}
                      </code>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={copyRecoveryCode}
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setGeneratedRecoveryCode(null);
                      setStep("role");
                      setPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Saya Sudah Menyimpannya — Lanjut ke Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "role" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pilih Role</CardTitle>
              <CardDescription>Login sebagai owner atau staff</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => selectRole("owner")}
                  className="h-auto flex-col gap-2 py-6"
                >
                  <UserCog className="h-6 w-6" />
                  <span className="font-semibold">Owner</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => selectRole("staff")}
                  className="h-auto flex-col gap-2 py-6"
                >
                  <Users className="h-6 w-6" />
                  <span className="font-semibold">Staff</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "login" && selectedRole && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={goBackToRole}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-base">Login sebagai {capitalize(selectedRole)}</CardTitle>
                  <CardDescription>Masukkan email dan password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={selectedRole === "owner" ? "owner@dominico.com" : "staff@dominico.com"}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setFieldError("email", undefined);
                    }}
                    disabled={loading}
                  />
                  {errors.email && <ErrorMessage message={errors.email} />}
                </div>

                <PasswordField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (errors.password) setFieldError("password", undefined);
                  }}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  error={errors.password}
                />

                <div className="flex items-start gap-2">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 rounded border-primary text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Label htmlFor="rememberMe" className="text-xs font-normal leading-relaxed cursor-pointer">
                    Ingat saya di perangkat ini (30 hari)
                  </Label>
                </div>

                <Button type="submit" className="w-full min-h-11" disabled={loading}>
                  {loading ? <LoadingText /> : "Masuk"}
                </Button>
              </form>

              {selectedRole === "owner" && (
                <button
                  type="button"
                  onClick={goToRecovery}
                  className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground underline"
                >
                  Lupa password owner?
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {step === "recovery" && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={() => setStep("login")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle className="text-base">Reset Password Owner</CardTitle>
                  <CardDescription>Masukkan recovery code dan password baru</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecovery} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recoveryCode">Recovery Code</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recoveryCode"
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                      value={recoveryCode}
                      onChange={(e) => {
                        const raw = e.target.value.toUpperCase();
                        const formatted = formatRecoveryCode(raw);
                        setRecoveryCode(formatted.slice(0, 29)); // 24 chars + 5 dashes
                        if (errors.recoveryCode) setFieldError("recoveryCode", undefined);
                      }}
                      disabled={loading}
                      className="pl-9 font-mono tracking-wide"
                    />
                  </div>
                  {errors.recoveryCode && <ErrorMessage message={errors.recoveryCode} />}
                </div>

                <PasswordField
                  id="recoveryPassword"
                  label="Password Baru"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    if (errors.password) setFieldError("password", undefined);
                  }}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  error={errors.password}
                  showStrength
                />

                <PasswordField
                  id="recoveryConfirmPassword"
                  label="Konfirmasi Password Baru"
                  value={confirmPassword}
                  onChange={(v) => {
                    setConfirmPassword(v);
                    if (errors.confirmPassword) setFieldError("confirmPassword", undefined);
                  }}
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  error={errors.confirmPassword}
                />

                <div className="flex items-start gap-2">
                  <input
                    id="agree"
                    type="checkbox"
                    checked={agreeIrreversible}
                    onChange={(e) => {
                      setAgreeIrreversible(e.target.checked);
                      if (errors.agree) setFieldError("agree", undefined);
                    }}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 rounded border-primary text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Label htmlFor="agree" className="text-xs font-normal leading-relaxed cursor-pointer">
                    Saya mengerti tindakan ini tidak bisa dibatalkan setelah password berhasil diganti.
                  </Label>
                </div>
                {errors.agree && <ErrorMessage message={errors.agree} />}

                <Button type="submit" className="w-full min-h-11" disabled={loading}>
                  {loading ? <LoadingText /> : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

function LoadingText() {
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Memproses...
    </>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  disabled?: boolean;
  error?: string;
  showStrength?: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  disabled,
  error,
  showStrength,
}: PasswordFieldProps) {
  const strength = getPasswordStrength(value);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={id === "password" ? "current-password" : "new-password"}
          placeholder="••••••••"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`pr-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value && (
        <div className="space-y-1">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`${strengthColor(strength)} transition-all`}
              style={{
                width: strength === "weak" ? "33%" : strength === "medium" ? "66%" : "100%",
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Kekuatan password: <span className="font-medium text-foreground">{strengthLabel(strength)}</span>
          </p>
        </div>
      )}
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
