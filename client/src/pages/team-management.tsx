import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { User, Plus, Trash2, Shield, Clock, Phone, Mail, Lock, Unlock, Crown, Star, Award } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { socket } from '../socket.js';

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
  GOLD: "bg-yellow-50 border-yellow-400 text-yellow-800",
  SILVER: "bg-gray-100 border-gray-400 text-gray-800",
  BRONZE: "bg-orange-50 border-orange-400 text-orange-800"
};

const statusColors = {
  ONLINE: "bg-green-500",
  IDLE: "bg-yellow-500",
  OFFLINE: "bg-gray-400"
};

function TeamMemberCard({ member, onRemove, goldUnlocked }: { 
  member: TeamMember; 
  onRemove?: (id: number) => void;
  goldUnlocked: boolean;
}) {
  return (
    <Card className={`border-l-8 mb-3 ${roleColors[member.role]}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {member.firstName} {member.lastName}
              <Badge variant="outline" className="text-xs font-bold uppercase">
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
            {goldUnlocked && onRemove && (
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

const GOLD_CODE = "000";

export default function TeamManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [goldUnlocked, setGoldUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
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

  // Check for persistent Gold unlock state
  useEffect(() => {
    const goldUnlockedState = localStorage.getItem("goldUnlocked");
    if (goldUnlockedState === "true") {
      setGoldUnlocked(true);
    }
  }, []);

  // Real-time team member updates via Socket.IO
  useEffect(() => {
    socket.connect();
    
    const handleTeamUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team-members'] });
    };

    socket.on('team-member-added', handleTeamUpdate);
    socket.on('team-member-updated', handleTeamUpdate);
    socket.on('team-member-removed', handleTeamUpdate);

    return () => {
      socket.off('team-member-added', handleTeamUpdate);
      socket.off('team-member-updated', handleTeamUpdate);
      socket.off('team-member-removed', handleTeamUpdate);
    };
  }, [queryClient]);

  React.useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
    }
  }, [userProfile]);

  // Gold Command code verification
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeInput.trim() === GOLD_CODE) {
      setGoldUnlocked(true);
      localStorage.setItem("goldUnlocked", "true");
      toast({
        title: "Gold Command Unlocked",
        description: "You now have full team management permissions",
      });
      setCodeInput("");
    } else {
      toast({
        title: "Incorrect Code",
        description: "Please enter the correct Gold Command code",
        variant: "destructive",
      });
    }
  };

  // Gold Command permissions based on code unlock
  const canManageTeam = goldUnlocked;

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
        <div className="text-center">Loading team management...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your emergency response team and command hierarchy
          </p>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left: Team Members List */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Command Team Members</h2>
            {goldUnlocked && (
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            )}
          </div>

          {/* Gold Command Authentication */}
          {!goldUnlocked && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Lock className="h-5 w-5" />
                  Gold Command Authentication Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    To add, edit, or remove team members, enter the Gold Command code below.
                  </AlertDescription>
                </Alert>
                <form onSubmit={handleCodeSubmit} className="flex items-center gap-3">
                  <div className="flex-1 max-w-xs">
                    <Input
                      type="password"
                      placeholder="Enter Gold Command Code"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="border-yellow-300 focus:border-yellow-500"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    disabled={!codeInput.trim()}
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Unlock Gold Command
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Gold Command Active Status */}
          {goldUnlocked && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-800">
                  <Crown className="h-5 w-5" />
                  <span className="font-semibold">Gold Command Active</span>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    Full Permissions
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {!goldUnlocked && (
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
                  onRemove={goldUnlocked ? handleRemoveMember : undefined}
                  goldUnlocked={goldUnlocked}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Command Structure Summary */}
        <div className="w-72">
          <Card className="hydro-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Command Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-black">
                    G
                  </div>
                  <div className="flex-1">
                    <span className="font-bold">GOLD</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({teamMembers.filter((u: TeamMember) => u.role === 'GOLD').length} Active)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center font-bold text-white">
                    S
                  </div>
                  <div className="flex-1">
                    <span className="font-bold">SILVER</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({teamMembers.filter((u: TeamMember) => u.role === 'SILVER').length} Active)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center font-bold text-white">
                    B
                  </div>
                  <div className="flex-1">
                    <span className="font-bold">BRONZE</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({teamMembers.filter((u: TeamMember) => u.role === 'BRONZE').length} Active)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
