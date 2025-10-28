import { useState, useEffect } from 'react';

export type UserRole = 'BRONZE' | 'SILVER' | 'GOLD' | null;

const ROLE_CODES = {
  BRONZE: '000',
  SILVER: '001',
  GOLD: '100',
} as const;

const STORAGE_KEY = 'selectedRole';

export function useRole() {
  const [role, setRoleState] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      return (sessionStorage.getItem(STORAGE_KEY) as UserRole) || null;
    }
    return null;
  });

  const setRole = (newRole: UserRole) => {
    if (newRole) {
      sessionStorage.setItem(STORAGE_KEY, newRole);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setRoleState(newRole);
  };

  const validateCode = (role: UserRole, code: string): boolean => {
    if (!role) return false;
    return ROLE_CODES[role] === code;
  };

  const clearRole = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setRoleState(null);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const storedRole = sessionStorage.getItem(STORAGE_KEY) as UserRole;
      setRoleState(storedRole || null);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    role,
    setRole,
    validateCode,
    clearRole,
    hasRole: !!role,
  };
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'BRONZE':
      return 'orange';
    case 'SILVER':
      return 'blue';
    case 'GOLD':
      return 'yellow';
    default:
      return 'gray';
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'BRONZE':
      return 'Frontline Responder - Emergency response and documentation';
    case 'SILVER':
      return 'Tactical Lead - Resource coordination and team management';
    case 'GOLD':
      return 'Strategic Command - Oversight, compliance, and reporting';
    default:
      return '';
  }
}
