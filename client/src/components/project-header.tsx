import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Building, Shield, Activity, MapPin } from "lucide-react";

// --- Strong Project Type ---
type ProjectInfo = {
  id: string;
  number: string;
  name: string;
  client: string;
  contractor: string;
  location: string;
  status: string;
  description: string;
};

// --- User Profile Type ---
type UserProfile = {
  firstName: string;
  lastName: string;
  role: "GOLD" | "SILVER" | "BRONZE" | string;
};

interface ProjectHeaderProps {
  project?: ProjectInfo;
  className?: string;
}

// --- Main Component ---
export function ProjectHeader({ project, className = "" }: ProjectHeaderProps) {
  // Optional: Keep user profile
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ['/api/user/profile'],
    queryFn: () => fetch('/api/user/profile').then(res => res.json()),
  });

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

  // Loading/fallback
  if (!project) return null;

  return (
    <header
      className={`
        w-full bg-white border-b border-gray-200 py-3 px-6 shadow-sm sticky top-0 z-40
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 md:gap-6 text-sm">
        {/* --- Project Name/Number --- */}
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-gray-500" />
          <span className="font-semibold text-hydro-dark text-base">
            {project.name}
          </span>
          <span className="text-gray-500 font-mono">#{project.number}</span>
        </div>

        {/* --- Client --- */}
        <span className="hidden md:inline text-gray-300">|</span>
        <div className="flex items-center gap-1">
          <span className="text-gray-600 hidden md:inline">Client:</span>
          <span className="font-medium text-gray-800">{project.client}</span>
        </div>

        {/* --- Contractor (optional) --- */}
        {project.contractor && (
          <>
            <span className="hidden md:inline text-gray-300">|</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-600 hidden md:inline">Contractor:</span>
              <span className="font-medium text-gray-800">{project.contractor}</span>
            </div>
          </>
        )}

        {/* --- Location --- */}
        {project.location && (
          <>
            <span className="hidden md:inline text-gray-300">|</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{project.location}</span>
            </div>
          </>
        )}

        {/* --- Status --- */}
        <span className="hidden md:inline text-gray-300">|</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
          Status: {project.status}
        </span>

        {/* --- Description (mobile hides) --- */}
        {project.description && (
          <span className="hidden md:inline-block text-gray-400 ml-2 italic max-w-xs truncate">
            {project.description}
          </span>
        )}

        {/* --- User Info (if present) --- */}
        <div className="ml-auto flex items-center gap-2">
          {userProfile && (
            <>
              <Shield className="h-4 w-4 text-gray-400" />
              <Badge variant="outline" className={getRoleColor(userProfile.role)}>
                {userProfile.role} COMMAND
              </Badge>
              <span className="text-gray-700 font-semibold">
                {userProfile.firstName} {userProfile.lastName}
              </span>
            </>
          )}
          <Activity className="h-4 w-4 text-green-600 ml-2" />
          <span className="text-green-600 font-semibold">Active</span>
        </div>
      </div>
    </header>
  );
}