'use client';

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { registerAction } from '@/lib/auth/actions';
import { registerSchema, type RegisterInput } from '@/lib/auth/schemas';
import { ZodError } from 'zod';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      staggerChildren: 0.08,
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

interface Bubble {
  id: number;
  x: number;
}

export function DiveDropRegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof RegisterInput]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const createBubbles = () => {
    const newBubbles = Array.from({ length: 2 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 60 - 30,
    }));
    setBubbles(newBubbles);

    setTimeout(() => {
      setBubbles([]);
    }, 800);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGlobalError('');
    setErrors({});
    setLoading(true);

    try {
      registerSchema.parse(formData);
      const result = await registerAction(formData);

      if (result.error) {
        setGlobalError(result.error);
        if (formRef.current) {
          formRef.current.style.animation = 'shake 0.5s ease-in-out';
          setTimeout(() => {
            if (formRef.current) {
              formRef.current.style.animation = '';
            }
          }, 500);
        }
      } else if (result.success) {
        // Success animation
        const successBubbles = Array.from({ length: 8 }, (_, i) => ({
          id: Date.now() + i,
          x: Math.random() * 100 - 50,
        }));
        setBubbles(successBubbles);

        setTimeout(() => {
          router.push(`/${locale}/auth/login?registered=true`);
        }, 800);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof RegisterInput] = err.message;
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
            {t('register_subtitle')}
          </motion.p>
        </motion.div>

        {/* Bubble animation - rising bubbles */}
        <motion.div
          variants={itemVariants}
          className="h-20 flex justify-center mb-6 relative"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`static-bubble-${i}`}
              className="absolute rounded-full border border-cyan-300"
              style={{
                width: 10 + i * 3,
                height: 10 + i * 3,
                left: `${20 + i * 15}%`,
              }}
              animate={{
                y: [-20, -60],
                opacity: [0.3, 0.1],
              }}
              transition={{
                duration: 2 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </motion.div>

        {/* Error message */}
        {globalError && (
          <motion.div
            variants={itemVariants}
            className="p-4 bg-red-500/20 border border-red-400 rounded-xl text-red-200 text-sm backdrop-blur-sm mb-6"
          >
            {globalError}
          </motion.div>
        )}

        {/* Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={itemVariants}>
              <label className="block text-cyan-300 text-sm font-semibold mb-2">
                {t('first_name')}
              </label>
              <motion.input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onFocus={createBubbles}
                disabled={loading}
                className="w-full px-3 py-2 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50 text-sm"
                placeholder="First"
                whileFocus={{ scale: 1.02 }}
              />
              {errors.firstName && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mt-1">
                  {errors.firstName}
                </motion.p>
              )}
            </motion.div>

            <motion.div variants={itemVariants}>
              <label className="block text-cyan-300 text-sm font-semibold mb-2">
                {t('last_name')}
              </label>
              <motion.input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                onFocus={createBubbles}
                disabled={loading}
                className="w-full px-3 py-2 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50 text-sm"
                placeholder="Last"
                whileFocus={{ scale: 1.02 }}
              />
              {errors.lastName && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mt-1">
                  {errors.lastName}
                </motion.p>
              )}
            </motion.div>
          </div>

          {/* Email Input */}
          <motion.div variants={itemVariants}>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">
              {t('email')}
            </label>
            <motion.input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={createBubbles}
              disabled={loading}
              className="w-full px-4 py-2 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50"
              placeholder="dive@example.com"
              whileFocus={{ scale: 1.02 }}
            />
            {errors.email && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mt-1">
                {errors.email}
              </motion.p>
            )}
          </motion.div>

          {/* Password Input */}
          <motion.div variants={itemVariants}>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">
              {t('password')}
            </label>
            <div className="relative">
              <motion.input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={createBubbles}
                disabled={loading}
                className="w-full px-4 py-2 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50"
                placeholder="••••••••"
                whileFocus={{ scale: 1.02 }}
              />
              <motion.button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-cyan-300 hover:text-cyan-100 text-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {showPassword ? '🙈' : '👁️'}
              </motion.button>
            </div>
            {errors.password && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mt-1">
                {errors.password}
              </motion.p>
            )}
            <p className="text-cyan-300/60 text-xs mt-1">{t('password_hint')}</p>
          </motion.div>

          {/* Confirm Password Input */}
          <motion.div variants={itemVariants}>
            <label className="block text-cyan-300 text-sm font-semibold mb-2">
              {t('confirm_password')}
            </label>
            <div className="relative">
              <motion.input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onFocus={createBubbles}
                disabled={loading}
                className="w-full px-4 py-2 bg-cyan-900/30 border-2 border-cyan-400/50 rounded-lg text-white placeholder-cyan-300/50 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 transition-all backdrop-blur-sm disabled:opacity-50"
                placeholder="••••••••"
                whileFocus={{ scale: 1.02 }}
              />
              <motion.button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2 text-cyan-300 hover:text-cyan-100 text-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </motion.button>
            </div>
            {errors.confirmPassword && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mt-1">
                {errors.confirmPassword}
              </motion.p>
            )}
          </motion.div>

          {/* Register Button */}
          <motion.button
            variants={itemVariants}
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-900 font-bold rounded-lg relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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
              t('register_button')
            )}
          </motion.button>
        </form>

        {/* Login Link */}
        <motion.div variants={itemVariants} className="text-center mt-6">
          <span className="text-cyan-300/70 text-sm">{t('have_account')} </span>
          <Link
            href={`/${locale}/auth/login`}
            className="text-cyan-300 font-semibold hover:text-cyan-100 transition-colors hover:underline"
          >
            {t('login_link')}
          </Link>
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
