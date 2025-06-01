'use client';

import React, { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const supabase = createClientComponentClient();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .single();

      if (existingUser) {
        setError("An account with this email already exists. Please try logging in instead.");
        setLoading(false);
        return;
      }
      await supabase.auth.updateUser({
        data: {
          username: username,
        }
      })
      

      // Supabase sign up with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // User is logged in immediately (no email confirmation required)
        router.push('/dashboard');
      } else {
        // Email confirmation required
        alert("Signup successful! Please check your email to confirm your account.");
        setLoading(false);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during signup');
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    setLoading(true);

    try {
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
    } catch (error: any) {
      setError(error.message || 'An error occurred during Google sign up');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 bg-transparent">
      <div className="w-full max-w-md bg-white/80 dark:bg-black/60 rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-[#18182a] dark:text-white">Sign up for YourApp</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
            {error.includes("already exists") && (
              <div className="mt-2">
                <Link href="/login" className="text-[#6c63ff] font-semibold hover:underline">
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        )}

        <button
          className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600 rounded-full py-3 mb-6 text-lg font-medium hover:shadow-md hover:scale-103 hover:-translate-y-0.5 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleGoogleSignup}
          disabled={loading}
        >
          <FcGoogle className="text-2xl" />
          {loading ? "Signing up..." : "Sign up with Google"}
        </button>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300 dark:border-gray-700" />
          <span className="mx-4 text-gray-400 text-sm">or sign up with email</span>
          <hr className="flex-grow border-gray-300 dark:border-gray-700" />
        </div>

        <form className="space-y-5" onSubmit={handleSignup}>
          <div>
            <label className="block font-semibold mb-1 text-[#18182a] dark:text-white">Username</label>
            <input
              type="text"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff] bg-transparent text-[#18182a] dark:text-white disabled:opacity-50"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[#18182a] dark:text-white">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff] bg-transparent text-[#18182a] dark:text-white disabled:opacity-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[#18182a] dark:text-white">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6c63ff] bg-transparent text-[#18182a] dark:text-white disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              disabled={loading}
              minLength={8}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Must be at least 8 characters long
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-[#18182a] text-white font-semibold rounded-full py-3 mt-2 text-lg shadow-lg hover:bg-[#6c63ff] dark:hover:bg-[#18182a] hover:scale-103 hover:-translate-y-0.5 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500 dark:text-gray-300">
          Already have an account?{" "}
          <Link href="/login" className="text-[#6c63ff] font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
