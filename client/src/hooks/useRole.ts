import { useState, useEffect } from 'react';

export type UserRole = 'BRONZE' | 'SILVER' | 'GOLD' | null;

const STORAGE_KEY = 'selectedRole';
const ROLE_TOKEN_KEY = 'roleToken';

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
      sessionStorage.removeItem(ROLE_TOKEN_KEY);
    }
    setRoleState(newRole);
  };

  const validateCode = async (role: UserRole, code: string): Promise<boolean> => {
    if (!role || !code) return false;

    try {
      // Get auth token from localStorage (set by Firebase login)
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        console.error('No auth token found');
        return false;
      }

      const response = await fetch('/api/auth/validate-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role, code }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Role validation failed:', error.message);
        return false;
      }

      const data = await response.json();
      
      // Store role token for API requests
      sessionStorage.setItem(ROLE_TOKEN_KEY, data.roleToken);
      sessionStorage.setItem(STORAGE_KEY, role);
      
      return true;
    } catch (error) {
      console.error('Error validating role code:', error);
      return false;
    }
  };

  const clearRole = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(ROLE_TOKEN_KEY);
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

export function getRoleToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ROLE_TOKEN_KEY);
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
