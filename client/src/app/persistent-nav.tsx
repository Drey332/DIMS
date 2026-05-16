import { Link, useLocation } from "wouter";
import type { ComponentType } from "react";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  FileText, 
  Settings,
  Package,
  Menu,
  X,
  UserCircle,
  LogOut,
  ShieldCheck,
  Shield,
  Crown
} from "lucide-react";
import ProfileMenu from "@/features/auth/profile-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { RoleCodeModal } from "@/features/team/RoleCodeModal";
import { useRole, UserRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/team", label: "Team Management", icon: Users },
  { href: "/clients", label: "Client Management", icon: Users },
  { href: "/assets", label: "Asset Management", icon: Package },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/setup", label: "Project Setup", icon: Settings },
];

export function PersistentNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { role, setRole, validateCode, clearRole } = useRole();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const { toast } = useToast();

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const getRoleBadgeColor = (currentRole: UserRole) => {
    switch (currentRole) {
      case 'BRONZE':
        return 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200';
      case 'SILVER':
        return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
      case 'GOLD':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
    }
  };

  const getRoleIcon = (currentRole: UserRole) => {
    switch (currentRole) {
      case 'BRONZE':
        return Shield;
      case 'SILVER':
        return Users;
      case 'GOLD':
        return Crown;
      default:
        return ShieldCheck;
    }
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setShowRoleSwitcher(true);
  };

  const handleCodeSuccess = () => {
    if (selectedRole) {
      setRole(selectedRole);
      setShowRoleSwitcher(false);
      toast({
        title: 'Role Switched',
        description: `${selectedRole} command level activated`,
      });
      window.location.reload(); // Reload to apply new role context
    }
  };

  const handleCodeCancel = () => {
    setShowRoleSwitcher(false);
    setSelectedRole(null);
  };

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <ShieldCheck className="h-8 w-8 text-blue-600" />
                  <span className="text-xl font-bold text-gray-900">HydroSafe</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveLink(item.href);
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={cn(
                        "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-blue-100 text-blue-700 border border-blue-200" 
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                      )}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Role Badge & User Menu */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Role Switcher Badge */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex items-center space-x-2 border",
                      getRoleBadgeColor(role)
                    )}
                    data-testid="role-badge"
                  >
                    {(() => {
                      const RoleIcon = getRoleIcon(role);
                      return <RoleIcon className="h-4 w-4" />;
                    })()}
                    <span className="font-semibold">{role || 'No Role'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">
                    Switch Role
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleRoleSwitch('BRONZE')}
                    className="cursor-pointer"
                    data-testid="switch-to-bronze"
                  >
                    <Shield className="mr-2 h-4 w-4 text-orange-600" />
                    <span>Bronze - Frontline</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRoleSwitch('SILVER')}
                    className="cursor-pointer"
                    data-testid="switch-to-silver"
                  >
                    <Users className="mr-2 h-4 w-4 text-blue-600" />
                    <span>Silver - Tactical</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRoleSwitch('GOLD')}
                    className="cursor-pointer"
                    data-testid="switch-to-gold"
                  >
                    <Crown className="mr-2 h-4 w-4 text-yellow-600" />
                    <span>Gold - Strategic</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ProfileMenu />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveLink(item.href);
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div 
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium",
                        isActive 
                          ? "bg-blue-100 text-blue-700 border border-blue-200" 
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
              
              {/* Mobile Role & User Menu */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                {/* Mobile Role Badge */}
                <div className="px-3 mb-2">
                  <Badge
                    className={cn(
                      "w-full justify-center py-2 text-sm font-semibold cursor-pointer",
                      getRoleBadgeColor(role)
                    )}
                    data-testid="mobile-role-badge"
                  >
                    {(() => {
                      const RoleIcon = getRoleIcon(role);
                      return (
                        <div className="flex items-center space-x-2">
                          <RoleIcon className="h-4 w-4" />
                          <span>Role: {role || 'Not Selected'}</span>
                        </div>
                      );
                    })()}
                  </Badge>
                </div>
                
                {/* Mobile Role Switcher Options */}
                <div className="space-y-1 px-3 mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Switch Role
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleRoleSwitch('BRONZE');
                      setMobileMenuOpen(false);
                    }}
                    data-testid="mobile-switch-bronze"
                  >
                    <Shield className="mr-2 h-4 w-4 text-orange-600" />
                    Bronze - Frontline
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleRoleSwitch('SILVER');
                      setMobileMenuOpen(false);
                    }}
                    data-testid="mobile-switch-silver"
                  >
                    <Users className="mr-2 h-4 w-4 text-blue-600" />
                    Silver - Tactical
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      handleRoleSwitch('GOLD');
                      setMobileMenuOpen(false);
                    }}
                    data-testid="mobile-switch-gold"
                  >
                    <Crown className="mr-2 h-4 w-4 text-yellow-600" />
                    Gold - Strategic
                  </Button>
                </div>

                <Link href="/profile">
                  <div 
                    className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserCircle className="h-5 w-5" />
                    <span className="text-base font-medium">Profile</span>
                  </div>
                </Link>
                <div className="md:hidden mt-2 px-3">
                  <ProfileMenu />
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from being hidden under fixed nav */}
      <div className="h-16"></div>

      {/* Role Switcher Modal */}
      <RoleCodeModal
        open={showRoleSwitcher}
        role={selectedRole}
        onClose={handleCodeCancel}
        onSuccess={handleCodeSuccess}
        validateCode={validateCode}
      />
    </>
  );
}
