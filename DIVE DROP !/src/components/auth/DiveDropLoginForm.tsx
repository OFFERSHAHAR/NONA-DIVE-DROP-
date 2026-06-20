'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { loginAction } from '@/lib/auth/actions';
import { loginSchema, type LoginInput } from '@/lib/auth/schemas';
import { ZodError } from 'zod';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const bubbleVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: [0.8, 1, 0.8],
    opacity: [0, 0.5, 0],
    y: [-5, 10, -5],
  },
};

interface Bubble {
  id: number;
  x: number;
}

export function DiveDropLoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';

  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof LoginInput]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const createBubbles = (e: React.FocusEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newBubbles = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 60 - 30,
    }));
    setBubbles(newBubbles);

    setTimeout(() => {
      setBubbles([]);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError('');
    setErrors({});
    setLoading(true);

    try {
      loginSchema.parse(formData);
      const result = await loginAction(formData);

      if (result.error) {
        setGlobalError(result.error);
        // Wave error animation
        const input = emailInputRef.current || passwordInputRef.current;
        if (input) {
          input.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => {
            input.style.animation = '';
          }, 500);
        }
      } else if (result.success) {
        // Success animation with bubbles
        const successBubbles = Array.from({ length: 8 }, (_, i) => ({
          id: Date.now() + i,
          x: Math.random() * 100 - 50,
        }));
        setBubbles(successBubbles);

        setTimeout(() => {
          router.push(`/${locale}/dashboard`);
        }, 800);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof LoginInput] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setGlobalError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 212, 255, 0.3); }
          50% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.6); }
        }
      `}</style>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        {/* Hero Title */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <motion.h1
            className="text-5xl font-black bg-gradient-to-r from-cyan-300 via-teal-400 to-blue-400 bg-clip-text text-transparent mb-2"
            animate={{ scale: [0.95, 1, 0.95] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            DIVE DROP
          </motion.h1>
          <motion.p
            className="text-cyan-200 text-sm font-light tracking-widest"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {t('login_subtitle')}
          </motion.p>
        </motion.div>

        {/* Diver animation */}
        <motion.div
          variants={itemVariants}
          className="h-24 flex justify-center mb-8 relative"
        >
          <svg width="80" height="80" viewBox="0 0 80 80" className="relative z-20">
            <defs>
              <linearGradient id="diverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#0099cc" />
              </linearGradient>
            </defs>

            {/* Head */}
            <motion.circle
              cx="40"
              cy="20"
              r="12"
              fill="url(#diverGradient)"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Body */}
            <motion.rect
              x="32"
              y="32"
              width="16"
              height="20"
              fill="url(#diverGradient)"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Left arm */}
            <motion.line
              x1="32"
              y1="36"
              x2="18"
              y2="30"
              stroke="url(#diverGradient)"
              strokeWidth="3"
              animate={{ rotate: [0, 20, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ originX: '32px', originY: '36px' }}
            />

            {/* Right arm */}
            <motion.line
              x1="48"
              y1="36"
              x2="62"
              y2="30"
              stroke="url(#diverGradient)"
              strokeWidth="3"
              animate={{ rotate: [0, -20, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ originX: '48px', originY: '36px' }}
            />

            {/* Fins */}
            <motion.ellipse
              cx="30"
              cy="55"
              rx="6"
              ry="12"
              fill="url(#diverGradient)"
              animate={{ rotate: [-15, 15, -15] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ originX: '30px', originY: '55px' }}
            />

            <motion.ellipse
              cx="50"
              cy="55"
              rx="6"
              ry="12"
              fill="url(#diverGradient)"
              animate={{ rotate: [15, -15, 15] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ originX: '50px', originY: '55px' }}
            />
          </svg>
        </motion.div>

        {/* Success message */}
        {registered && (
          <motion.div
            variants={itemVariants}
            className="p-4 bg-emerald-500/20 border border-emerald-400 rounded-xl text-emerald-200 text-sm backdrop-blur-sm mb-6"
            animate={{ borderColor: ['rgba(16, 185, 129, 0.5)', 'rgba(16, 185, 129, 1)', 'rgba(16, 185, 129, 0.5)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {t('registration_success')}
          </motion.div>
        )}

        {/* Error message */}
        {globalError && (
          <motion.div
            variants={itemVariants}
            className="p-4 bg-red-500/20 border border-red-400 rounded-xl text-red-200 text-sm backdrop-blur-sm mb-6"
            animate={{ wave: 1 }}
          >
            {globalError}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <motion.div variants={itemVariants} className="relative">
            <label className="block text-cyan-300 text-sm font-semibold mb-2">
              {t('email')}
            </label>
            <motion.input
              ref={emailInputRef}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={createBubbles}
              disabled={loading}
              className="w-full px-4 py-3 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50"
              placeholder="dive@example.com"
              whileFocus={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
            />
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs mt-1"
              >
                {errors.email}
              </motion.p>
            )}
          </motion.div>

          {/* Password Input */}
          <motion.div variants={itemVariants} className="relative">
            <label className="block text-cyan-300 text-sm font-semibold mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <motion.input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={createBubbles}
                disabled={loading}
                className="w-full px-4 py-3 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50"
                placeholder="••••••••"
                whileFocus={{ scale: 1.02, boxShadow: '0 0 20px rgba(0, 212, 255, 0.5)' }}
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-cyan-300 hover:text-cyan-100 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {showPassword ? '🙈' : '👁️'}
              </motion.button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs mt-1"
              >
                {errors.password}
              </motion.p>
            )}
          </motion.div>

          {/* Login Button */}
          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-900 font-bold rounded-lg relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0, 212, 255, 0.6)' }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="inline-block"
              >
                🌊
              </motion.div>
            ) : (
              t('login_button')
            )}
          </motion.button>
        </form>

        {/* Links */}
        <motion.div variants={itemVariants} className="space-y-3 mt-6 text-center">
          <div>
            <Link
              href={`/${locale}/auth/forgot-password`}
              className="text-cyan-300 hover:text-cyan-100 text-sm transition-colors hover:underline"
            >
              {t('forgot_password')}
            </Link>
          </div>
          <div>
            <span className="text-cyan-300/70 text-sm">{t('no_account')} </span>
            <Link
              href={`/${locale}/auth/register`}
              className="text-cyan-300 font-semibold hover:text-cyan-100 transition-colors hover:underline"
            >
              {t('register_link')}
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Success bubbles */}
      {bubbles.map((bubble) => (
        <motion.div
          key={bubble.id}
          className="fixed rounded-full border border-cyan-300 pointer-events-none"
          style={{
            width: 20,
            height: 20,
            left: '50%',
            top: '50%',
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.8)',
          }}
          initial={{ scale: 0.8, opacity: 0, x: bubble.x, y: 0 }}
          animate={{
            scale: [0.8, 1, 0],
            opacity: [0, 1, 0],
            y: [-100, -300],
            x: bubble.x,
          }}
          transition={{
            duration: 1.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}
