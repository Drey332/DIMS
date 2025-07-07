import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  FileText, 
  Settings,
  Package,
  ChevronDown,
  Menu,
  X,
  UserCircle,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { 
    href: "/tools", 
    label: "Tools", 
    icon: Settings,
    children: [
      { href: "/assets", label: "Asset Verification", icon: Package },
      { href: "/assets/upload", label: "Upload Assets", icon: Package },
      { href: "/assets/manage", label: "Manage Assets", icon: Package },
      { href: "/reports", label: "Reports & Audit", icon: FileText },
      { href: "/reports/generate", label: "Generate Report", icon: FileText },
      { href: "/reports/history", label: "Report History", icon: FileText }
    ]
  },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/team", label: "Team Management", icon: Users },
  { href: "/clients", label: "Client Management", icon: Users },
  { href: "/setup", label: "Project Setup", icon: Settings },
];

export function Navigation() {
  const [location] = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = location === item.href || (item.children && item.children.some(child => location === child.href));
    
    if (item.children) {
      return (
        <div 
          key={item.href} 
          className="relative"
          onMouseEnter={() => setOpenDropdown(item.href)}
          onMouseLeave={() => setOpenDropdown(null)}
        >
          <button
            className={cn(
              "px-6 py-3 flex items-center space-x-2 font-medium transition-colors",
              isActive
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-gray-600 hover:text-primary hover:bg-gray-50"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {openDropdown === item.href && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-50">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Link key={child.href} href={child.href}>
                    <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                      <ChildIcon className="w-4 h-4 mr-2" />
                      {child.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        {navItems.map(renderNavItem)}
      </div>
    </nav>
  );
}
