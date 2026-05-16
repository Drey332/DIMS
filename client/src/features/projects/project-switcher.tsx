import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  ChevronDown, 
  Building2, 
  MapPin, 
  Calendar,
  Users,
  X
} from "lucide-react";

interface Project {
  id: number;
  number: string;
  name: string;
  client: string;
  contractor?: string;
  location: string;
  status: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

interface ProjectSwitcherProps {
  currentUser: {
    id: number;
    role: string;
    name: string;
  };
  activeProjectId: number | null;
  onProjectChange: (projectId: number) => void;
}

export function ProjectSwitcher({ currentUser, activeProjectId, onProjectChange }: ProjectSwitcherProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    contractor: "",
    location: "",
    description: "",
    startDate: "",
    endDate: ""
  });
  const { toast } = useToast();

  // Fetch user's assigned projects
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ["/api/user/projects"],
    queryFn: () => apiRequest("GET", "/api/user/projects"),
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const activeProject = projects.length > 0 ? projects.find((p: Project) => p.id === activeProjectId) : null;

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: typeof newProject) => {
      return await apiRequest("POST", "/api/projects", projectData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/projects"] });
      setIsCreateModalOpen(false);
      setNewProject({
        name: "",
        client: "",
        contractor: "",
        location: "",
        description: "",
        startDate: "",
        endDate: ""
      });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleProjectSelect = (project: Project) => {
    onProjectChange(project.id);
    setIsDropdownOpen(false);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.client || !newProject.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createProjectMutation.mutate(newProject);
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="relative">
      {/* Project Selector Button */}
      <Button
        variant="outline"
        className="hydro-button-primary min-w-[250px] justify-between"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4" />
          <span className="truncate">
            {activeProject ? activeProject.name : "Select Project"}
          </span>
        </div>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {/* Project Dropdown */}
      {isDropdownOpen && (
        <Card className="absolute top-full left-0 mt-2 w-80 z-50 shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-hydro-dark to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Select Project</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => setIsDropdownOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No projects assigned</div>
            ) : (
              projects.map((project: Project) => (
                <div
                  key={project.id}
                  className={cn(
                    "p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors",
                    activeProjectId === project.id && "bg-blue-50 border-l-4 border-l-blue-500"
                  )}
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{project.name}</h4>
                      <p className="text-sm text-gray-600 truncate">{project.client}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <MapPin className="w-3 h-3 mr-1" />
                          {project.location}
                        </div>
                        {project.number && (
                          <div className="text-xs text-gray-500">#{project.number}</div>
                        )}
                      </div>
                    </div>
                    <Badge className={cn("text-xs", getProjectStatusColor(project.status))}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            
            {/* Create New Project Button - Gold Only */}
            {currentUser.role === 'GOLD' && (
              <div className="p-4 border-t bg-gray-50">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setIsCreateModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Project Modal - Gold Only */}
      {isCreateModalOpen && currentUser.role === 'GOLD' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-gradient-to-r from-hydro-dark to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Create New Project</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <Input
                    value={newProject.name}
                    onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Forcados ACOE Decommissioning"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <Input
                    value={newProject.client}
                    onChange={(e) => setNewProject(prev => ({ ...prev, client: e.target.value }))}
                    placeholder="e.g., Shell Petroleum Development Company"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contractor
                  </label>
                  <Input
                    value={newProject.contractor}
                    onChange={(e) => setNewProject(prev => ({ ...prev, contractor: e.target.value }))}
                    placeholder="e.g., HydroDive International"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <Input
                    value={newProject.location}
                    onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g., Forcados Terminal, Nigeria"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Project description and objectives..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 hydro-button-primary"
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}