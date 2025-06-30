import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { User, LogOut } from 'lucide-react';

export default function ProfileMenu() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Close menu if clicked outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setOpen(false);
      setLocation('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 transition-colors"
        title="Profile menu"
      >
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt="Profile" 
            className="w-8 h-8 rounded-full object-cover" 
          />
        ) : (
          <span className="font-bold text-lg text-blue-600">
            {user.email?.[0]?.toUpperCase() ?? "U"}
          </span>
        )}
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] z-50 py-1">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="font-medium text-gray-900 truncate">
              {user.displayName || 'User'}
            </div>
            <div className="text-sm text-gray-500 truncate">
              {user.email}
            </div>
          </div>
          
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-gray-700"
            onClick={() => {
              setOpen(false);
              setLocation("/profile");
            }}
          >
            <User className="h-4 w-4" />
            Profile
          </button>
          
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-red-600"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}