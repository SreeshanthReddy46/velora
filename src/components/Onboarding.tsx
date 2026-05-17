import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { motion } from 'motion/react';
import { ArrowRight, User as UserIcon, Calendar } from 'lucide-react';

export const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [age, setAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !age) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name,
        age: parseInt(age),
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
      });
      await refreshProfile();
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipOnboarding = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName || 'User',
        age: 0,
        onboardingCompleted: true,
        createdAt: serverTimestamp(),
      });
      await refreshProfile();
    } catch (error) {
      console.error("Skip failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">Complete your profile</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-sm leading-relaxed">
          Just a few more details to personalize your neural link. ✨
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] pl-1">Neural ID (Name)</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                placeholder="Ex: John Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em] pl-1">Synchronization Age</label>
            <div className="relative group">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-purple-500 transition-colors" />
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min="13"
                max="120"
                className="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
                placeholder="Your age"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold py-3.5 pr-4 pl-6 rounded-2xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl"
            >
              {isSubmitting ? "Setting up..." : (
                <>
                  Establish Connection
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={skipOnboarding}
              disabled={isSubmitting}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors py-2 uppercase tracking-widest font-bold"
            >
              Skip for now
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
