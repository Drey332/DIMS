import { useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

export type UserRole = 'BRONZE' | 'SILVER' | 'GOLD' | null;

export function useRole() {
  // Fetch role from database
  const { data, isLoading } = useQuery<{ role: UserRole }>({
    queryKey: ['/api/user/role'],
    retry: false,
    staleTime: 0, // Always fetch fresh role
    refetchOnWindowFocus: true,
  });

  const role = data?.role || null;

  const validateCode = async (role: UserRole, code: string): Promise<boolean> => {
    if (!role || !code) return false;

    try {
      console.log('[useRole] Validating role:', role);
      
      const response = await apiRequest('POST', '/api/auth/validate-role', {
        role,
        code
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[useRole] Role validation failed:', error);
        return false;
      }

      console.log('[useRole] Validation successful, role saved to database');
      
      // Invalidate the role query to refetch from database
      await queryClient.invalidateQueries({ queryKey: ['/api/user/role'] });
      
      return true;
    } catch (error) {
      console.error('[useRole] Error validating role code:', error);
      return false;
    }
  };

  const clearRole = async () => {
    try {
      // Update user's sessionRole to null in database
      await apiRequest('POST', '/api/auth/validate-role', {
        role: null,
        code: '' 
      });
      
      // Invalidate query to refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/user/role'] });
    } catch (error) {
      console.error('[useRole] Error clearing role:', error);
    }
  };

  const setRole = async (newRole: UserRole) => {
    if (!newRole) return;
    // Optimistically update the cache
    queryClient.setQueryData(['/api/user/role'], { role: newRole });
  };

  return {
    role,
    setRole,
    validateCode,
    clearRole,
    hasRole: !!role,
    isLoading,
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
