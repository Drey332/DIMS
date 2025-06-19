export type UserRole = 'BRONZE' | 'SILVER' | 'GOLD';

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  title: string;
  isActive: boolean;
  lastSeen: string;
}

export interface Project {
  id: number;
  number: string;
  name: string;
  client: string;
  contractor?: string;
  location: string;
  status: string;
  description?: string;
  emergencyContacts?: any;
  assets?: any;
}

export interface Incident {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  startTime: string;
  endTime?: string;
  bronzeController?: number;
  silverController?: number;
  goldController?: number;
}

export interface IncidentAction {
  id: number;
  incidentId: number;
  actionType: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  priority: string;
  assignedTo?: number;
  completedBy?: number;
  dueDate?: string;
  completedAt?: string;
}

export interface Message {
  id: number;
  senderId: number;
  content: string;
  messageType: string;
  isUrgent: boolean;
  createdAt: string;
  sender?: User;
}

export interface DashboardStats {
  activeIncidents: number;
  totalActions: number;
  filesArchived: number;
  complianceScore: number;
}

export interface ChecklistItem {
  id: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTime: string;
  protocolReference?: string;
  dependencies?: string[];
  riskMitigation?: string;
}

export interface EmergencyContact {
  id: number;
  projectId: number;
  contactType: string;
  name: string;
  phone: string;
  email?: string;
  responseTime?: string;
  lastVerified?: string;
  isActive: boolean;
}

export interface ProactiveRecommendation {
  type: 'SAFETY' | 'OPERATIONAL' | 'COMPLIANCE' | 'WEATHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  actionRequired: string;
  timeframe: string;
  riskLevel: string;
}
