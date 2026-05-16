import { Droplets, Users, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProjectSwitcher } from "@/features/projects/project-switcher";
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

  return null;
}
