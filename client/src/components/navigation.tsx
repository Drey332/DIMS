import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Users, 
  FileText, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/team", label: "Team Management", icon: Users },
  { href: "/reports", label: "Reports & Audit", icon: FileText },
  { href: "/setup", label: "Project Setup", icon: Settings },
];

export function Navigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
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
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
