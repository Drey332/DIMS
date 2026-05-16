import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Plus, Trash2, Shield, Clock, Phone, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  title?: string;
  isActive: boolean;
  isGoldCodeHolder: boolean;
  lastSeen?: string;
  activityStatus: "ONLINE" | "IDLE" | "OFFLINE";
}

interface AddMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  title: string;
  goldCode?: string;
}

const roleColors = {
  GOLD: "bg-yellow-100 border-yellow-400 text-yellow-800",
  SILVER: "bg-gray-100 border-gray-400 text-gray-800",
  BRONZE: "bg-orange-100 border-orange-400 text-orange-800"
};

const statusColors = {
  ONLINE: "bg-green-500",
  IDLE: "bg-yellow-500",
  OFFLINE: "bg-gray-400"
};

function TeamMemberCard({ member, onRemove, canManage }: { 
  member: TeamMember; 
  onRemove?: (id: number) => void;
  canManage: boolean;
}) {
  return (
    <Card className={`hydro-card border-l-8 ${roleColors[member.role]}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {member.firstName} {member.lastName}
              <Badge variant="outline" className={roleColors[member.role]}>
                {member.role} COMMAND
              </Badge>
              {member.isGoldCodeHolder && (
                <Shield className="h-4 w-4 text-yellow-600" />
              )}
            </CardTitle>
            {member.title && (
              <p className="text-sm text-gray-600 mt-1">{member.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${statusColors[member.activityStatus]}`}
              title={member.activityStatus}
            />
            {canManage && onRemove && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onRemove(member.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <span>{member.email}</span>
          </div>
          {member.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>{member.phone}</span>
            </div>
          )}
          {member.lastSeen && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span>Last seen: {new Date(member.lastSeen).toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeamHierarchyPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AddMemberForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "BRONZE",
    title: "",
    goldCode: ""
  });

  // Get current user profile to check permissions
  const { data: userProfile } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: () => fetch('/api/user/profile').then(res => res.json()),
  });

  // Get team members
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['/api/team-members'],
    queryFn: () => fetch('/api/team-members').then(res => res.json()),
  });

  useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
    }
  }, [userProfile]);

  // Check if current user can manage team (Gold code holder)
  const canManageTeam = currentUser?.role === "GOLD" && currentUser?.isGoldCodeHolder;

  // Add team member mutation
  const addMemberMutation = useMutation({
    mutationFn: (memberData: AddMemberForm) => 
      apiRequest('/api/team-members', 'POST', memberData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
      setShowAddForm(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "BRONZE",
        title: "",
        goldCode: ""
      });
      toast({
        title: "Success",
        description: "Team member added successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive"
      });
    }
  });

  // Remove team member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/team-members/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
      toast({
        title: "Success",
        description: "Team member removed successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive"
      });
    }
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMemberMutation.mutate(form);
  };

  const handleRemoveMember = (id: number) => {
    if (window.confirm("Are you sure you want to remove this team member?")) {
      removeMemberMutation.mutate(id);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Sort team members: Gold first, then Silver, then Bronze
  const sortedTeamMembers = [...teamMembers].sort((a: TeamMember, b: TeamMember) => {
    const roleOrder: Record<string, number> = { GOLD: 0, SILVER: 1, BRONZE: 2 };
    if (roleOrder[a.role] !== roleOrder[b.role]) {
      return roleOrder[a.role] - roleOrder[b.role];
    }
    // Within same role, sort by last seen (most recent first)
    return new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime();
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading team hierarchy...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Command Hierarchy</h1>
          <p className="text-gray-600 mt-2">
            Manage your emergency response team structure
          </p>
        </div>
        {canManageTeam && (
          <Button 
            onClick={() => setShowAddForm(true)}
            className="hydro-button-gold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        )}
      </div>

      {!canManageTeam && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800">
                Only Gold Command with proper authorization can manage team members.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {sortedTeamMembers.length === 0 ? (
          <Card className="hydro-card">
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No team members found</p>
            </CardContent>
          </Card>
        ) : (
          sortedTeamMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onRemove={canManageTeam ? handleRemoveMember : undefined}
              canManage={canManageTeam}
            />
          ))
        )}
      </div>

      {/* Add Team Member Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Emergency Response Coordinator"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Command Level</Label>
              <Select
                value={form.role}
                onValueChange={(value) => handleInputChange("role", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze Command</SelectItem>
                  <SelectItem value="SILVER">Silver Command</SelectItem>
                  <SelectItem value="GOLD">Gold Command</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "GOLD" && (
              <div>
                <Label htmlFor="goldCode">Gold Authorization Code</Label>
                <Input
                  id="goldCode"
                  type="password"
                  value={form.goldCode}
                  onChange={(e) => handleInputChange("goldCode", e.target.value)}
                  placeholder="Enter Gold Code"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required for Gold Command assignment
                </p>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={addMemberMutation.isPending}
                className="flex-1"
              >
                {addMemberMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}