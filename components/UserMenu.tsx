'use client';

import { useState, useRef, useEffect } from 'react';
import { FaUser, FaCog, FaSignOutAlt, FaChevronDown } from 'react-icons/fa';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import LogoutConfirmationModal from './LogoutConfirmationModal';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState<{ email: string; username?: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For Google users, use their Google account name
        const username = user.app_metadata?.provider === 'google' 
          ? user.user_metadata?.full_name 
          : user.user_metadata?.username;

        setUserData({
          email: user.email || '',
          username: username
        });
      }
    }
    getUserData();
  }, [supabase.auth]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#6c63ff] flex items-center justify-center text-white">
            <FaUser />
          </div>
          <FaChevronDown className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-100">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">
                {userData?.username || 'User'}
              </p>
              <p className="text-xs text-gray-500">
                {userData?.email || 'Loading...'}
              </p>
            </div>
            
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                setIsOpen(false);
                // Add settings navigation logic here
              }}
            >
              <FaCog className="text-gray-500" />
              Settings
            </button>
            
            <button
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                setIsOpen(false);
                setShowLogoutModal(true);
              }}
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        )}
      </div>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  );
} 