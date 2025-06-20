import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Building, User, Shield, Activity } from "lucide-react";

interface ProjectHeaderProps {
  className?: string;
}

export function ProjectHeader({ className }: ProjectHeaderProps) {
  // Get current user profile
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: () => fetch('/api/user/profile').then(res => res.json()),
  });

  // Get user projects (assuming first one is active)
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/user/projects'],
    queryFn: () => fetch('/api/user/projects').then(res => res.json()),
  });

  const activeProject = projects[0];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'GOLD':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'SILVER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'BRONZE':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!activeProject || !userProfile) {
    return null;
  }

  return (
    <div className={`w-full bg-white border-b border-gray-200 py-3 px-6 ${className}`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 text-sm">
        {/* Project Info */}
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-gray-900">
            Project: {activeProject.name}
          </span>
          <span className="text-gray-400">({activeProject.number})</span>
        </div>

        <span className="text-gray-300">|</span>

        {/* Client Info */}
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Client:</span>
          <span className="font-medium text-gray-900">
            Shell Petroleum Development Company (SPDC)
          </span>
        </div>

        <span className="text-gray-300">|</span>

        {/* Command Status */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-gray-500" />
          <Badge variant="outline" className={getRoleColor(userProfile.role)}>
            {userProfile.role} COMMAND
          </Badge>
          <span className="text-gray-600">
            {userProfile.firstName} {userProfile.lastName}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="ml-auto flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-semibold">
            Active Operations
          </span>
        </div>
      </div>
    </div>
  );
}