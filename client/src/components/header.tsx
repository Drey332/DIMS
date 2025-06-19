import { Droplets, Users, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProjectSwitcher } from "@/components/project-switcher";
import { useState } from "react";

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
  user: User;
  project: Project;
}

export function Header({ user, project }: HeaderProps) {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(1);

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
    id: 1,
    role: user.role,
    name: user.name
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
            <Badge className={`px-3 py-1 ${getRoleColor(user.role)}/20 text-${getRoleColor(user.role)} border-${getRoleColor(user.role)}/30`}>
              <div className={`w-3 h-3 ${getRoleColor(user.role)} rounded-full mr-2`}></div>
              {user.role} Command
            </Badge>
            <div className="text-right">
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-gray-600">{user.title}</div>
            </div>
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-medium">
              {user.initials}
            </div>
          </div>
        </div>
        
        {/* Project Context Banner */}
        <div className="bg-primary/10 px-4 py-2 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-hydro-dark">{project.name}</h2>
              <p className="text-sm text-gray-600">
                Project No: <span className="font-medium">{project.number}</span> | 
                Client: <span className="font-medium">{project.client}</span>
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
