import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Crown } from 'lucide-react';
import { UserRole } from '@/hooks/useRole';

interface RolePickerProps {
  onSelectRole: (role: UserRole) => void;
}

export function RolePicker({ onSelectRole }: RolePickerProps) {
  const roles: { role: UserRole; label: string; description: string; icon: typeof Shield; color: string; bgColor: string; borderColor: string }[] = [
    {
      role: 'BRONZE',
      label: 'Bronze',
      description: 'Frontline Responder',
      icon: Shield,
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      borderColor: 'border-orange-300 hover:border-orange-500',
    },
    {
      role: 'SILVER',
      label: 'Silver',
      description: 'Tactical Lead',
      icon: Users,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      borderColor: 'border-blue-300 hover:border-blue-500',
    },
    {
      role: 'GOLD',
      label: 'Gold',
      description: 'Strategic Command',
      icon: Crown,
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100',
      borderColor: 'border-yellow-400 hover:border-yellow-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HydroSafe</h1>
          </div>
          <h2 className="text-xl text-gray-700 dark:text-gray-300 mb-2">Emergency Response Co-Pilot</h2>
          <p className="text-gray-600 dark:text-gray-400">Select your command level to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map(({ role, label, description, icon: Icon, color, bgColor, borderColor }) => (
            <Card
              key={role}
              className={`cursor-pointer transition-all duration-200 border-2 ${borderColor} ${bgColor} hover:shadow-lg transform hover:scale-105`}
              onClick={() => onSelectRole(role)}
              data-testid={`role-card-${role?.toLowerCase()}`}
            >
              <CardContent className="p-6 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${bgColor} mb-4`}>
                  <Icon className={`h-8 w-8 ${color}`} />
                </div>
                <h3 className={`text-2xl font-bold ${color} mb-2`}>{label}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                  {role === 'BRONZE' && 'Must act within seconds'}
                  {role === 'SILVER' && 'Resource coordination'}
                  {role === 'GOLD' && 'Oversight & compliance'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Access code required for role verification</p>
          <p className="mt-1">Session expires on tab close</p>
        </div>
      </div>
    </div>
  );
}
