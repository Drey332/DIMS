import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, addDoc, onSnapshot, deleteDoc, doc, query, updateDoc
} from "firebase/firestore";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SelectContent } from "@/components/ui/select";
import { SelectItem } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { SelectValue } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { DialogHeader } from "@/components/ui/dialog";
import { DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Trash2, Plus, Mail, Phone, Clock, Crown, Lock, Unlock, User, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROJECT_ID = "hydrosafe-5d245";
const GOLD_CODE = "000";

const roleColors: Record<string, string> = {
  GOLD: "bg-yellow-50 border-yellow-400 text-yellow-800",
  SILVER: "bg-gray-100 border-gray-400 text-gray-800",
  BRONZE: "bg-orange-50 border-orange-400 text-orange-800"
};
const statusColors: Record<string, string> = {
  ONLINE: "bg-green-500",
  IDLE: "bg-yellow-500",
  OFFLINE: "bg-gray-400"
};

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  title?: string;
  isActive?: boolean;
  isGoldCodeHolder?: boolean;
  lastSeen?: string;
  activityStatus?: "ONLINE" | "IDLE" | "OFFLINE";
}

interface TeamMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "GOLD" | "SILVER" | "BRONZE";
  title?: string;
  isActive?: boolean;
  isGoldCodeHolder?: boolean;
  lastSeen?: string;
  activityStatus?: "ONLINE" | "IDLE" | "OFFLINE";
}

const initialForm: TeamMemberForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "BRONZE",
  title: "",
  isActive: true,
  isGoldCodeHolder: false,
  lastSeen: "",
  activityStatus: "OFFLINE"
};

export default function TeamManagement({ currentUser }: { currentUser: any }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamMemberForm>(initialForm);
  const [goldUnlocked, setGoldUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const { toast } = useToast();

  // Real-time listener for Firestore team members
  useEffect(() => {
    const q = query(collection(db, "projects", PROJECT_ID, "teamMembers"));
    const unsub = onSnapshot(q, snap => {
      setTeamMembers(
        snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TeamMember[]
      );
    });
    return unsub;
  }, []);

  // Gold Command authentication (code unlock)
  const handleCodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (codeInput.trim() === GOLD_CODE) {
      setGoldUnlocked(true);
      toast({ title: "Gold Command Unlocked", description: "You have full team permissions" });
      setCodeInput("");
    } else {
      toast({ title: "Incorrect Code", variant: "destructive" });
    }
  };

  // Add member to Firestore
  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "projects", PROJECT_ID, "teamMembers"), {
        ...form,
        isGoldCodeHolder: form.role === "GOLD",
        isActive: true,
        activityStatus: "OFFLINE",
        lastSeen: new Date().toISOString()
      });
      setShowAddForm(false);
      setForm(initialForm);
      toast({ title: "Team member added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Edit member (Gold only)
  const handleEditMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editMemberId) return;
    try {
      const memberRef = doc(db, "projects", PROJECT_ID, "teamMembers", editMemberId);
      await updateDoc(memberRef, {
        ...form,
        isGoldCodeHolder: form.role === "GOLD",
      });
      setShowEditForm(false);
      setEditMemberId(null);
      setForm(initialForm);
      toast({ title: "Team member updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Remove a member (Gold only)
  const handleRemoveMember = async (id: string) => {
    if (!window.confirm("Remove this team member?")) return;
    try {
      await deleteDoc(doc(db, "projects", PROJECT_ID, "teamMembers", id));
      toast({ title: "Team member removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Safe input change
  const handleInputChange = (field: keyof TeamMemberForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  // For editing, load data into form
  const openEditForm = (member: TeamMember) => {
    setForm({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.role || "BRONZE",
      title: member.title || "",
      isActive: member.isActive !== undefined ? member.isActive : true,
      isGoldCodeHolder: member.role === "GOLD",
      activityStatus: member.activityStatus || "OFFLINE",
      lastSeen: member.lastSeen || "",
    });
    setEditMemberId(member.id);
    setShowEditForm(true);
  };

  // Sort: Gold > Silver > Bronze, then lastSeen desc
  const sortedTeamMembers = [...teamMembers].sort((a, b) => {
    const roleOrder: Record<string, number> = { GOLD: 0, SILVER: 1, BRONZE: 2 };
    if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
    return new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime();
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        {goldUnlocked && (
          <Button onClick={() => setShowAddForm(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Team Member
          </Button>
        )}
      </div>

      {/* Gold Command Unlock Prompt */}
      {!goldUnlocked && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Lock className="h-5 w-5" /> Gold Command Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCodeSubmit} className="flex items-center gap-3">
              <Input
                type="password"
                placeholder="Enter Gold Command Code"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value)}
                className="border-yellow-300 focus:border-yellow-500"
              />
              <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700 text-white" disabled={!codeInput.trim()}>
                <Unlock className="h-4 w-4 mr-2" /> Unlock Gold Command
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {goldUnlocked && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <Crown className="h-5 w-5" />
              <span className="font-semibold">Gold Command Active</span>
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Full Permissions</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team List */}
      <div className="space-y-4">
        {sortedTeamMembers.length === 0 ? (
          <Card className="hydro-card">
            <CardContent className="pt-6 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No team members found</p>
            </CardContent>
          </Card>
        ) : (
          sortedTeamMembers.map(member => (
            <Card key={member.id} className={`border-l-8 mb-3 ${roleColors[member.role]}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {member.firstName} {member.lastName}
                      <Badge variant="outline" className="text-xs font-bold uppercase">{member.role} COMMAND</Badge>
                      {member.isGoldCodeHolder && <Shield className="h-4 w-4 text-yellow-600" />}
                    </CardTitle>
                    {member.title && <p className="text-sm text-gray-600 mt-1">{member.title}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${statusColors[member.activityStatus || "OFFLINE"]}`} title={member.activityStatus} />
                    {goldUnlocked && (
                      <>
                        <Button variant="secondary" size="sm"
                          onClick={() => openEditForm(member)} className="h-8 w-8 p-0">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm"
                          onClick={() => handleRemoveMember(member.id)} className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-500" /><span>{member.email}</span></div>
                  {member.phone && (<div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-500" /><span>{member.phone}</span></div>)}
                  {member.lastSeen && (<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><span>Last seen: {new Date(member.lastSeen).toLocaleString()}</span></div>)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Team Member Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={form.firstName} onChange={e => handleInputChange("firstName", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={form.lastName} onChange={e => handleInputChange("lastName", e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => handleInputChange("email", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => handleInputChange("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={e => handleInputChange("title", e.target.value)} placeholder="Project Manager, Coordinator, etc." />
            </div>
            <div>
              <Label htmlFor="role">Command Level</Label>
              <Select value={form.role} onValueChange={value => handleInputChange("role", value as "GOLD" | "SILVER" | "BRONZE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze Command</SelectItem>
                  <SelectItem value="SILVER">Silver Command</SelectItem>
                  <SelectItem value="GOLD">Gold Command</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">Add Member</Button>
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Team Member</DialogTitle></DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={form.firstName} onChange={e => handleInputChange("firstName", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={form.lastName} onChange={e => handleInputChange("lastName", e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => handleInputChange("email", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => handleInputChange("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={e => handleInputChange("title", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="role">Command Level</Label>
              <Select value={form.role} onValueChange={value => handleInputChange("role", value as "GOLD" | "SILVER" | "BRONZE")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze Command</SelectItem>
                  <SelectItem value="SILVER">Silver Command</SelectItem>
                  <SelectItem value="GOLD">Gold Command</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => setShowEditForm(false)} className="flex-1">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
          </div>
        );
      }