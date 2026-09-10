'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '../Components/ui/ThemeToggle';
import { motion, AnimatePresence } from 'motion/react';
import {
  IconMail,
  IconLock,
  IconUser,
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconBrandGoogle,
  IconBrandGithub,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { login, register } from '../lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'login' | 'register';

interface FieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  error?: string;
  autoComplete?: string;
  rightElement?: React.ReactNode;
}

// ─── Field Component ──────────────────────────────────────────────────────────
const Field: React.FC<FieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon,
  error,
  autoComplete,
  rightElement,
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-xs font-mono tracking-wider uppercase text-[#4A4238]/60 dark:text-[#91867E]"
    >
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4A4238]/40 dark:text-[#91867E] pointer-events-none">
        {icon}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full pl-10 ${rightElement ? 'pr-10' : 'pr-4'} py-3 rounded-xl bg-white/60 dark:bg-[#292522] border text-sm text-[#4A4238] dark:text-[#F4EDE5] placeholder-[#4A4238]/30 dark:placeholder-[#80766F] focus:outline-none focus:ring-2 transition-all duration-200 ${
          error
            ? 'border-red-400/60 dark:border-[#D97870]/60 focus:ring-red-300/40 dark:focus:ring-[#D97870]/30'
            : 'border-[#4A4238]/10 dark:border-[#3A3430] focus:ring-[#E3836C]/30 focus:border-[#E3836C]/40'
        }`}
      />
      {rightElement && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A4238]/40 dark:text-[#91867E]">
          {rightElement}
        </span>
      )}
    </div>
    {error && (
      <p className="text-xs text-red-500 dark:text-[#D97870] font-mono mt-0.5">{error}</p>
    )}
  </div>
);

// ─── Password Strength Meter ───────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels: Array<{ label: string; color: string }> = [
    { label: 'Too short', color: '#D97870' },
    { label: 'Weak', color: '#D97870' },
    { label: 'Fair', color: '#D9AD70' },
    { label: 'Good', color: '#9EBB9A' },
    { label: 'Strong', color: '#9EBB9A' },
  ];
  return { score, ...levels[score] };
}

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? color : 'rgba(150, 150, 150, 0.2)' }}
          />
        ))}
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {label}
      </span>
    </div>
  );
};

// ─── OAuth Button ─────────────────────────────────────────────────────────────
const OAuthButton: React.FC<{
  icon: React.ReactNode;
  label: string;
}> = ({ icon, label }) => (
  <button
    type="button"
    disabled
    title="Social sign-in is not configured yet"
    className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-[#4A4238]/12 dark:border-[#3A3430] bg-white/50 dark:bg-[#292522] text-xs font-medium text-[#4A4238]/50 dark:text-[#91867E] cursor-not-allowed opacity-70 shadow-xs"
  >
    {icon}
    {label} (soon)
  </button>
);

// ─── Divider ──────────────────────────────────────────────────────────────────
const Divider = () => (
  <div className="flex items-center gap-3">
    <span className="flex-1 h-px bg-[#4A4238]/10 dark:bg-[#3A3430]" />
    <span className="text-xs font-mono text-[#4A4238]/35 dark:text-[#91867E] uppercase tracking-wider">or</span>
    <span className="flex-1 h-px bg-[#4A4238]/10 dark:bg-[#3A3430]" />
  </div>
);

// ─── Login Form ───────────────────────────────────────────────────────────────
const LoginForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      onSuccess();
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {generalError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 dark:bg-[#382522] border border-red-500/20 dark:border-[#D97870]/30 text-xs text-red-600 dark:text-[#D97870] font-mono">
          <IconAlertCircle size={16} className="flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}
      <Field
        id="login-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        icon={<IconMail size={16} />}
        error={errors.email}
        autoComplete="email"
      />

      <div className="flex flex-col gap-1.5">
        <Field
          id="login-password"
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          icon={<IconLock size={16} />}
          error={errors.password}
          autoComplete="current-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="cursor-pointer hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors"
            >
              {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          }
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs text-[#E3836C] hover:text-[#ED967F] font-mono transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-sm font-medium tracking-wide transition-all duration-200 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-1"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing in…
          </span>
        ) : (
          <>
            Sign in
            <IconArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <Divider />

      <div className="grid grid-cols-2 gap-3">
        <OAuthButton icon={<IconBrandGoogle size={16} />} label="Google" />
        <OAuthButton icon={<IconBrandGithub size={16} />} label="GitHub" />
      </div>
    </form>
  );
};

// ─── Register Form ────────────────────────────────────────────────────────────
const RegisterForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    agreed?: string;
  }>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Minimum 8 characters';
    if (!confirm) e.confirm = 'Please confirm your password';
    else if (confirm !== password) e.confirm = 'Passwords do not match';
    if (!agreed) e.agreed = 'You must accept the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      onSuccess();
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {generalError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 dark:bg-[#382522] border border-red-500/20 dark:border-[#D97870]/30 text-xs text-red-600 dark:text-[#D97870] font-mono">
          <IconAlertCircle size={16} className="flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}
      <Field
        id="reg-name"
        label="Full Name"
        type="text"
        value={name}
        onChange={setName}
        placeholder="Jane Smith"
        icon={<IconUser size={16} />}
        error={errors.name}
        autoComplete="name"
      />
      <Field
        id="reg-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        icon={<IconMail size={16} />}
        error={errors.email}
        autoComplete="email"
      />
      <div className="flex flex-col gap-1.5">
        <Field
          id="reg-password"
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          placeholder="Min. 8 characters"
          icon={<IconLock size={16} />}
          error={errors.password}
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="cursor-pointer hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors"
            >
              {showPw ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          }
        />
        <PasswordStrength password={password} />
      </div>
      <Field
        id="reg-confirm"
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        value={confirm}
        onChange={setConfirm}
        placeholder="Repeat password"
        icon={<IconLock size={16} />}
        error={errors.confirm}
        autoComplete="new-password"
        rightElement={
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="cursor-pointer hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors"
          >
            {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        }
      />

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <button
            type="button"
            role="checkbox"
            aria-checked={agreed}
            onClick={() => setAgreed((v) => !v)}
            className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all duration-200 cursor-pointer ${
              agreed
                ? 'bg-[#E3836C] border-[#E3836C]'
                : 'bg-white/60 dark:bg-[#292522] border-[#4A4238]/20 dark:border-[#3A3430] group-hover:border-[#E3836C]/40'
            }`}
          >
            {agreed && <IconCheck size={10} stroke={3} className="text-white" />}
          </button>
          <span className="text-xs text-[#4A4238]/60 dark:text-[#C5B9AE] leading-relaxed">
            I agree to the{' '}
            <button type="button" className="text-[#E3836C] hover:text-[#ED967F] hover:underline cursor-pointer">Terms of Service</button>
            {' '}and{' '}
            <button type="button" className="text-[#E3836C] hover:text-[#ED967F] hover:underline cursor-pointer">Privacy Policy</button>
          </span>
        </label>
        {errors.agreed && (
          <p className="text-xs text-red-500 dark:text-[#D97870] font-mono ml-6">{errors.agreed}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="group flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#E3836C] hover:bg-[#ED967F] text-[#FFF7F1] text-sm font-medium tracking-wide transition-all duration-200 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-1"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating account…
          </span>
        ) : (
          <>
            Create account
            <IconArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </button>

      <Divider />

      <div className="grid grid-cols-2 gap-3">
        <OAuthButton icon={<IconBrandGoogle size={16} />} label="Google" />
        <OAuthButton icon={<IconBrandGithub size={16} />} label="GitHub" />
      </div>
    </form>
  );
};

// ─── Success State ────────────────────────────────────────────────────────────
const SuccessState: React.FC<{ tab: Tab }> = ({ tab }) => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/Dashboard');
    }, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-5 py-12 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-[#8FA98F]/20 dark:bg-[#283329] flex items-center justify-center">
        <IconCheck size={32} className="text-[#4A7C59] dark:text-[#9EBB9A]" />
      </div>
      <div>
        <h3 className="font-serif text-xl text-[#4A4238] dark:text-[#F4EDE5] mb-1">
          {tab === 'login' ? 'Welcome back!' : 'Account created!'}
        </h3>
        <p className="text-sm text-[#4A4238]/55 dark:text-[#C5B9AE]">
          {tab === 'login'
            ? "You're signed in. Redirecting to your dashboard…"
            : 'Your account is ready. Redirecting you now…'}
        </p>
      </div>
      <Link
        href="/Dashboard"
        className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#E3836C] hover:text-[#ED967F] transition-colors mt-2"
      >
        Go to Dashboard <IconArrowRight size={13} />
      </Link>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => setSuccess(true);

  return (
    <div className="min-h-screen bg-[#F3EDE4] dark:bg-[#171514] text-[#4A4238] dark:text-[#F4EDE5] flex flex-col transition-colors duration-300">
      {/* Minimal top nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/logo.png"
            alt="AnalyzeIt"
            width={130}
            height={30}
            className="h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/"
            className="text-xs font-mono uppercase tracking-wider text-[#4A4238]/50 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8 text-center">
            <AnimatePresence mode="wait">
              <motion.h1
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="font-serif text-3xl sm:text-4xl text-[#4A4238] dark:text-[#F4EDE5] mb-2"
              >
                {tab === 'login' ? (
                  <>Welcome <span className="italic text-[#E3836C]">back</span></>
                ) : (
                  <>Join <span className="italic text-[#E3836C]">AnalyzeIt</span></>
                )}
              </motion.h1>
            </AnimatePresence>
            <p className="text-sm text-[#4A4238]/50 dark:text-[#91867E]">
              {tab === 'login'
                ? 'Sign in to your workspace'
                : 'Create a free account to get started'}
            </p>
          </div>

          {/* Glass card */}
          <div className="glass-card dark:bg-[#211E1C] dark:border dark:border-[#3A3430] rounded-2xl p-6 sm:p-8 shadow-xl">
            {!success ? (
              <>
                {/* Tab switcher */}
                <div className="flex gap-1 p-1 bg-black/5 dark:bg-[#292522] border border-transparent dark:border-[#3A3430] rounded-xl mb-6">
                  {(['login', 'register'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTab(t); setSuccess(false); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        tab === t
                          ? 'bg-white dark:bg-[#302B28] shadow-xs text-[#4A4238] dark:text-[#F4EDE5] font-semibold border border-[#4A4238]/10 dark:border-[#504740]'
                          : 'text-[#4A4238]/45 dark:text-[#91867E] hover:text-[#4A4238] dark:hover:text-[#F4EDE5]'
                      }`}
                    >
                      {t === 'login' ? 'Sign In' : 'Register'}
                    </button>
                  ))}
                </div>

                {/* Animated form panels */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: tab === 'login' ? -14 : 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: tab === 'login' ? 14 : -14 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                  >
                    {tab === 'login' ? (
                      <LoginForm onSuccess={handleSuccess} />
                    ) : (
                      <RegisterForm onSuccess={handleSuccess} />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Bottom toggle */}
                <p className="text-center text-xs text-[#4A4238]/45 dark:text-[#91867E] mt-6">
                  {tab === 'login' ? (
                    <>
                      Don&apos;t have an account?{' '}
                      <button type="button" onClick={() => setTab('register')} className="text-[#E3836C] hover:text-[#ED967F] font-medium transition-colors cursor-pointer">
                        Create one
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button type="button" onClick={() => setTab('login')} className="text-[#E3836C] hover:text-[#ED967F] font-medium transition-colors cursor-pointer">
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </>
            ) : (
              <SuccessState tab={tab} />
            )}
          </div>

          <p className="text-center text-xs text-[#4A4238]/30 dark:text-[#91867E]/60 mt-6 font-mono">
            Protected with end-to-end encryption
          </p>
        </div>
      </div>
    </div>
  );
}
