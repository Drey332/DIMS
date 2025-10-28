import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Users, Crown, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';

interface RoleCodeModalProps {
  open: boolean;
  role: UserRole;
  onClose: () => void;
  onSuccess: () => void;
  validateCode: (role: UserRole, code: string) => boolean;
}

export function RoleCodeModal({ open, role, onClose, onSuccess, validateCode }: RoleCodeModalProps) {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setCode('');
      setShowCode(false);
      setIsShaking(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateCode(role, code)) {
      toast({
        title: 'Access Granted',
        description: `${role} role activated`,
      });
      onSuccess();
    } else {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      toast({
        title: 'Access Denied',
        description: `Incorrect code for ${role} role`,
        variant: 'destructive',
      });
      setCode('');
      
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'BRONZE':
        return <Shield className="h-12 w-12 text-orange-600" />;
      case 'SILVER':
        return <Users className="h-12 w-12 text-blue-600" />;
      case 'GOLD':
        return <Crown className="h-12 w-12 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'BRONZE':
        return 'border-orange-500 bg-orange-50';
      case 'SILVER':
        return 'border-blue-500 bg-blue-50';
      case 'GOLD':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md ${isShaking ? 'animate-shake' : ''}`}>
        <DialogHeader>
          <div className="flex flex-col items-center mb-4">
            <div className={`p-4 rounded-full ${getRoleColor()} border-2 mb-4`}>
              {getRoleIcon()}
            </div>
            <DialogTitle className="text-2xl text-center">{role} Access Code</DialogTitle>
            <DialogDescription className="text-center mt-2">
              Enter the access code to activate {role} command level
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showCode ? 'text' : 'password'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter access code"
              className="text-center text-2xl tracking-widest pr-12"
              maxLength={3}
              autoFocus
              data-testid="role-code-input"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setShowCode(!showCode)}
              data-testid="toggle-code-visibility"
            >
              {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
              <Button
                key={num}
                type="button"
                variant="outline"
                className="h-14 text-xl"
                onClick={() => {
                  if (code.length < 3) {
                    setCode(code + num);
                  }
                }}
                data-testid={`numpad-${num}`}
              >
                {num}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-14"
              onClick={() => setCode(code.slice(0, -1))}
              data-testid="numpad-backspace"
            >
              ←
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={code.length !== 3}
              data-testid="button-submit"
            >
              Submit
            </Button>
          </div>
        </form>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
            20%, 40%, 60%, 80% { transform: translateX(10px); }
          }
          .animate-shake {
            animation: shake 0.5s;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
