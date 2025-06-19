import { Droplets, Users, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProjectSwitcher } from "@/components/project-switcher";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  role: string;
  name: string;
  title: string;
  initials: string;
}

interface Project {
  name: string;
  number: string;
  client: string;
}

interface HeaderProps {
  user?: User;
  project?: Project;
}

export function Header({ user, project }: HeaderProps = {}) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // Get current user from API if not provided via props
  const { data: currentUserData } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: () => fetch('/api/user/profile').then(res => res.json()),
    enabled: !user
  });

  // Get projects from API
  const { data: projects } = useQuery({
    queryKey: ['/api/user/projects'],
    queryFn: () => fetch('/api/user/projects').then(res => res.json())
  });

  // Use provided user or fallback to API data with safe role access
  const effectiveUser = user || currentUserData || {
    role: 'BRONZE',
    name: 'Loading...',
    title: 'Team Member',
    initials: 'LO'
  };

  // Ensure role is always defined
  const safeRole = effectiveUser?.role || 'BRONZE';

  // Use provided project or first project from API
  const effectiveProject = project || (projects && projects[0] ? {
    name: projects[0].name,
    number: projects[0].number,
    client: projects[0].client || 'HydroDive Operations'
  } : {
    name: 'Loading Project...',
    number: '---',
    client: 'HydroDive Operations'
  });

  // Set active project from projects data
  if (projects && projects.length > 0 && !activeProjectId) {
    setActiveProjectId(projects[0].id);
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'GOLD':
        return 'role-gold';
      case 'SILVER':
        return 'role-silver';
      case 'BRONZE':
        return 'role-bronze';
      default:
        return 'bg-gray-500';
    }
  };

  const currentUser = {
    id: currentUserData?.id || 1,
    role: safeRole,
    name: effectiveUser.name
  };

  const handleProjectChange = (projectId: number) => {
    setActiveProjectId(projectId);
    // In a full implementation, this would update global app state
    // and trigger re-fetching of all project-specific data
  };

  return (
    <header className="hydro-header">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Droplets className="text-primary text-2xl" />
              <h1 className="text-2xl font-bold text-hydro-dark">HydroSafe</h1>
              <span className="text-sm text-gray-600">AI Emergency Response Co-Pilot</span>
            </div>
            
            {/* Project Switcher */}
            <div className="hidden md:block">
              <ProjectSwitcher
                currentUser={currentUser}
                activeProjectId={activeProjectId}
                onProjectChange={handleProjectChange}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge className={`px-3 py-1 ${getRoleColor(safeRole)}/20 text-${getRoleColor(safeRole)} border-${getRoleColor(safeRole)}/30`}>
              <div className={`w-3 h-3 ${getRoleColor(safeRole)} rounded-full mr-2`}></div>
              {safeRole} Command
            </Badge>
            <div className="text-right">
              <div className="font-medium">{effectiveUser.name}</div>
              <div className="text-sm text-gray-600">{effectiveUser.title}</div>
            </div>
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-medium">
              {effectiveUser.initials}
            </div>
          </div>
        </div>
        
        {/* Project Context Banner */}
        <div className="bg-primary/10 px-4 py-2 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-hydro-dark">{effectiveProject.name}</h2>
              <p className="text-sm text-gray-600">
                Project No: <span className="font-medium">{effectiveProject.number}</span> | 
                Client: <span className="font-medium">{effectiveProject.client}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">Active Operations</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
