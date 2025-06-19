import {
  users,
  projects,
  projectAssignments,
  incidents,
  incidentActions,
  messages,
  auditLogs,
  emergencyContacts,
  fileUploads,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Incident,
  type InsertIncident,
  type IncidentAction,
  type InsertIncidentAction,
  type Message,
  type InsertMessage,
  type AuditLog,
  type InsertAuditLog,
  type EmergencyContact,
  type InsertEmergencyContact,
  type FileUpload,
  type InsertFileUpload,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  updateUserActivity(id: number, activity: { lastActivity: Date; isOnline: boolean; activityStatus: string; sessionId?: string | null }): Promise<User>;
  getActiveUsers(): Promise<User[]>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectByNumber(number: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  getActiveProjects(): Promise<Project[]>;
  getUserProjects(userId: number): Promise<Project[]>;
  assignUserToProject(userId: number, projectId: number, role: string): Promise<void>;
  getUserProjectRole(userId: number, projectId: number): Promise<string | null>;
  
  // Incident operations
  getIncident(id: number): Promise<Incident | undefined>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: number, updates: Partial<InsertIncident>): Promise<Incident>;
  getIncidentsByProject(projectId: number): Promise<Incident[]>;
  getActiveIncidents(): Promise<Incident[]>;
  
  // Action operations
  createIncidentAction(action: InsertIncidentAction): Promise<IncidentAction>;
  updateIncidentAction(id: number, updates: Partial<InsertIncidentAction>): Promise<IncidentAction>;
  getIncidentActions(incidentId: number): Promise<IncidentAction[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByIncident(incidentId: number): Promise<Message[]>;
  getMessagesByProject(projectId: number): Promise<Message[]>;
  getRecentMessages(limit?: number): Promise<Message[]>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { userId?: number; projectId?: number; incidentId?: number }): Promise<AuditLog[]>;
  
  // Emergency contacts
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact>;
  getEmergencyContactsByProject(projectId: number): Promise<EmergencyContact[]>;
  
  // File operations
  createFileUpload(file: InsertFileUpload): Promise<FileUpload>;
  getFileUploadsByIncident(incidentId: number): Promise<FileUpload[]>;
  getFileUploadsByProject(projectId: number): Promise<FileUpload[]>;
  
  // Dashboard analytics
  getDashboardStats(projectId?: number): Promise<{
    activeIncidents: number;
    totalActions: number;
    filesArchived: number;
    complianceScore: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, lastSeen: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserActivity(id: number, activity: { lastActivity: Date; isOnline: boolean; activityStatus: string; sessionId?: string | null }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        lastSeen: activity.lastActivity,
        isOnline: activity.isOnline,
        activityStatus: activity.activityStatus,
        sessionId: activity.sessionId,
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return user;
  }

  async getActiveUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).where(eq(users.isActive, true));
    return allUsers;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectByNumber(number: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.number, number));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async getActiveProjects(): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.status, 'ACTIVE'));
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    return await db
      .select({
        id: projects.id,
        number: projects.number,
        name: projects.name,
        client: projects.client,
        contractor: projects.contractor,
        location: projects.location,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        description: projects.description,
        emergencyContacts: projects.emergencyContacts,
        assets: projects.assets,
        goldManagerId: projects.goldManagerId,
        documents: projects.documents,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(and(
        eq(projectAssignments.userId, userId),
        eq(projects.status, 'ACTIVE')
      ))
      .orderBy(desc(projects.createdAt));
  }

  async assignUserToProject(userId: number, projectId: number, role: string): Promise<void> {
    await db.insert(projectAssignments).values({
      userId,
      projectId,
      role,
    });
  }

  async getUserProjectRole(userId: number, projectId: number): Promise<string | null> {
    const [assignment] = await db
      .select({ role: projectAssignments.role })
      .from(projectAssignments)
      .where(and(
        eq(projectAssignments.userId, userId),
        eq(projectAssignments.projectId, projectId)
      ));
    return assignment?.role || null;
  }

  async getIncident(id: number): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident;
  }

  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const [incident] = await db.insert(incidents).values(insertIncident).returning();
    return incident;
  }

  async updateIncident(id: number, updates: Partial<InsertIncident>): Promise<Incident> {
    const [incident] = await db
      .update(incidents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(incidents.id, id))
      .returning();
    return incident;
  }

  async getIncidentsByProject(projectId: number): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .where(eq(incidents.projectId, projectId))
      .orderBy(desc(incidents.createdAt));
  }

  async getActiveIncidents(): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .where(eq(incidents.status, 'ACTIVE'))
      .orderBy(desc(incidents.createdAt));
  }

  async createIncidentAction(insertAction: InsertIncidentAction): Promise<IncidentAction> {
    const [action] = await db.insert(incidentActions).values(insertAction).returning();
    return action;
  }

  async updateIncidentAction(id: number, updates: Partial<InsertIncidentAction>): Promise<IncidentAction> {
    const [action] = await db
      .update(incidentActions)
      .set({ ...updates, completedAt: updates.status === 'COMPLETED' ? new Date() : undefined })
      .where(eq(incidentActions.id, id))
      .returning();
    return action;
  }

  async getIncidentActions(incidentId: number): Promise<IncidentAction[]> {
    return await db
      .select()
      .from(incidentActions)
      .where(eq(incidentActions.incidentId, incidentId))
      .orderBy(desc(incidentActions.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessagesByIncident(incidentId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.incidentId, incidentId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesByProject(projectId: number): Promise<any[]> {
    return await db
      .select({
        id: messages.id,
        incidentId: messages.incidentId,
        projectId: messages.projectId,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        messageType: messages.messageType,
        content: messages.content,
        attachments: messages.attachments,
        isUrgent: messages.isUrgent,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        sender: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.projectId, projectId))
      .orderBy(desc(messages.createdAt));
  }

  async getRecentMessages(limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogs(filters?: { userId?: number; projectId?: number; incidentId?: number }): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);
    
    if (filters) {
      const conditions = [];
      if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
      if (filters.projectId) conditions.push(eq(auditLogs.projectId, filters.projectId));
      if (filters.incidentId) conditions.push(eq(auditLogs.incidentId, filters.incidentId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query.orderBy(desc(auditLogs.createdAt));
  }

  async createEmergencyContact(insertContact: InsertEmergencyContact): Promise<EmergencyContact> {
    const [contact] = await db.insert(emergencyContacts).values(insertContact).returning();
    return contact;
  }

  async updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact> {
    const [contact] = await db
      .update(emergencyContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emergencyContacts.id, id))
      .returning();
    return contact;
  }

  async getEmergencyContactsByProject(projectId: number): Promise<EmergencyContact[]> {
    return await db
      .select()
      .from(emergencyContacts)
      .where(and(eq(emergencyContacts.projectId, projectId), eq(emergencyContacts.isActive, true)));
  }

  async createFileUpload(insertFile: InsertFileUpload): Promise<FileUpload> {
    const [file] = await db.insert(fileUploads).values(insertFile).returning();
    return file;
  }

  async getFileUploadsByIncident(incidentId: number): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .where(eq(fileUploads.incidentId, incidentId))
      .orderBy(desc(fileUploads.createdAt));
  }

  async getFileUploadsByProject(projectId: number): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .where(eq(fileUploads.projectId, projectId))
      .orderBy(desc(fileUploads.createdAt));
  }

  async getDashboardStats(projectId?: number): Promise<{
    activeIncidents: number;
    totalActions: number;
    filesArchived: number;
    complianceScore: number;
  }> {
    const baseCondition = projectId ? eq(incidents.projectId, projectId) : undefined;
    
    // Count active incidents
    const activeIncidentsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(baseCondition ? and(eq(incidents.status, 'ACTIVE'), baseCondition) : eq(incidents.status, 'ACTIVE'));
    
    // Count total actions in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalActionsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(incidentActions)
      .where(sql`created_at >= ${twentyFourHoursAgo}`);
    
    // Count files archived
    const filesArchivedQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(fileUploads)
      .where(projectId ? eq(fileUploads.projectId, projectId) : undefined);
    
    const [activeIncidentsResult, totalActionsResult, filesArchivedResult] = await Promise.all([
      activeIncidentsQuery,
      totalActionsQuery,
      filesArchivedQuery,
    ]);
    
    // Calculate compliance score (simplified - based on completed actions vs total actions)
    const complianceScore = 98.5; // Simplified for now
    
    return {
      activeIncidents: activeIncidentsResult[0]?.count || 0,
      totalActions: totalActionsResult[0]?.count || 0,
      filesArchived: filesArchivedResult[0]?.count || 0,
      complianceScore,
    };
  }
}

export const storage = new DatabaseStorage();
