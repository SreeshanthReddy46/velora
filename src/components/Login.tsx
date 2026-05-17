import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Cpu } from 'lucide-react';
import { motion } from 'motion/react';

export const Login = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 sm:p-6 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 text-center shadow-3xl"
      >
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-900 dark:bg-white rounded-[2rem] sm:rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 sm:mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative group">
          <div className="absolute inset-0 bg-blue-500 rounded-[2rem] sm:rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity" />
          <Cpu className="w-10 h-10 sm:w-12 sm:h-12 text-white dark:text-neutral-950 relative z-10" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-neutral-900 dark:text-white mb-4 tracking-tighter">Velora</h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm mb-8 sm:mb-12 max-w-[240px] mx-auto leading-relaxed">
          Elite technical intelligence for rapid software engineering and research.
        </p>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all active:scale-95 shadow-xl text-sm sm:text-base"
        >
          <LogIn className="w-5 h-5" />
          Get Started
        </button>
      </motion.div>
    </div>
  );
};
