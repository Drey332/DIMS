import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';

interface UserStatusProps {
  userId: number;
  initialStatus?: string;
  className?: string;
}

export function UserStatus({ userId, initialStatus = 'OFFLINE', className }: UserStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const { isConnected, lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'USER_STATUS_UPDATE' && lastMessage.userId === userId) {
      setStatus(lastMessage.status);
    }
  }, [lastMessage, userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-500'; // Green: User is active
      case 'IDLE':
        return 'bg-orange-500'; // Orange: User inactive for 3+ minutes
      case 'OFFLINE':
        return 'bg-red-500'; // Red: User inactive for 1 hour 3+ minutes
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'Active';
      case 'IDLE':
        return 'Away';
      case 'OFFLINE':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn("w-3 h-3 rounded-full", getStatusColor(status))}></div>
      <span className="text-sm font-medium">{getStatusText(status)}</span>
    </div>
  );
}

interface UserStatusIndicatorProps {
  status: string;
  className?: string;
}

export function UserStatusIndicator({ status, className }: UserStatusIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-500';
      case 'IDLE':
        return 'bg-orange-500';
      case 'OFFLINE':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={cn("w-3 h-3 rounded-full", getStatusColor(status), className)}></div>
  );
}