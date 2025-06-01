'use client';

import React, { useState } from "react";
import { Chrome } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Refresh to update session-aware middleware
      router.refresh();
      router.push('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success, Supabase redirects to /dashboard automatically
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-transparent">
      <div className="w-full max-w-md bg-white/80 dark:bg-black/60 rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-[#18182a] dark:text-white">Sign in to YourApp</h2>
        <button
          className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-full py-3 mb-6 text-lg font-medium hover:shadow-md hover:scale-103 hover:-translate-y-0.5 transition-all duration-300 ease-in-out"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <Chrome className="text-2xl text-[#4285F4]" />
          Sign in with Google
        </button>
        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300 dark:border-gray-700" />
          <span className="mx-4 text-gray-400 text-sm">or sign in with email</span>
          <hr className="flex-grow border-gray-300 dark:border-gray-700" />
        </div>
        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block font-semibold mb-1 text-[#18182a] dark:text-white">Username or Email</label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff] bg-transparent text-[#18182a] dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-semibold text-[#18182a] dark:text-white">Password</label>
              <Link href="#" className="text-[#6c63ff] text-sm font-medium hover:underline">Forgot?</Link>
            </div>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff] bg-transparent text-[#18182a] dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#18182a]  text-white font-semibold rounded-full py-3 mt-2 text-lg shadow-lg hover:bg-[#6c63ff] dark:hover:bg-[#18182a] hover:scale-103 hover:-translate-y-0.5 transition-all duration-300 ease-in-out"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        <p className="mt-8 text-center text-gray-500 dark:text-gray-300">
          Don't have an account? <Link href="/signup" className="text-[#6c63ff] font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
