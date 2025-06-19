import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for HydroDive personnel
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(), // 'BRONZE', 'SILVER', 'GOLD'
  title: text("title").notNull(),
  isActive: boolean("is_active").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  lastActivity: timestamp("last_activity").defaultNow(),
  isOnline: boolean("is_online").default(false),
  activityStatus: text("activity_status").default("OFFLINE"), // ONLINE, IDLE, OFFLINE
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table for actual HydroDive projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(), // e.g., "863-01-24"
  name: text("name").notNull(),
  client: text("client").notNull(),
  contractor: text("contractor"),
  location: text("location").notNull(),
  status: text("status").default("ACTIVE"), // ACTIVE, COMPLETED, SUSPENDED
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  description: text("description"),
  emergencyContacts: jsonb("emergency_contacts"),
  assets: jsonb("assets"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project assignments linking users to projects
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // BRONZE, SILVER, GOLD for this specific project
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Incidents table for emergency responses
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // MEDICAL, EQUIPMENT, WEATHER, OPERATIONAL
  priority: text("priority").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  status: text("status").default("ACTIVE"), // ACTIVE, RESOLVED, ESCALATED
  reportedBy: integer("reported_by").references(() => users.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  bronzeController: integer("bronze_controller").references(() => users.id),
  silverController: integer("silver_controller").references(() => users.id),
  goldController: integer("gold_controller").references(() => users.id),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  decisionData: jsonb("decision_data"), // I-A-P-O-A-R framework data
  protocolsFollowed: jsonb("protocols_followed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Actions/tasks within incidents
export const incidentActions = pgTable("incident_actions", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id).notNull(),
  actionType: text("action_type").notNull(), // CHECKLIST_ITEM, TASK, COMMUNICATION, DECISION
  description: text("description").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  completedBy: integer("completed_by").references(() => users.id),
  status: text("status").default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  priority: text("priority").default("MEDIUM"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  evidenceFiles: jsonb("evidence_files"), // Array of file paths/URLs
  decisionJustification: text("decision_justification"),
  protocolReference: text("protocol_reference"), // IMCA, IOGP, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Communication messages between team members
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidents.id),
  projectId: integer("project_id").references(() => projects.id),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id),
  messageType: text("message_type").default("CHAT"), // CHAT, ALERT, SYSTEM, TASK_ASSIGNMENT
  content: text("content").notNull(),
  attachments: jsonb("attachments"),
  isUrgent: boolean("is_urgent").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit trail for all system actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  incidentId: integer("incident_id").references(() => incidents.id),
  actionType: text("action_type").notNull(), // LOGIN, INCIDENT_CREATED, DECISION_MADE, etc.
  description: text("description").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Emergency contacts and resources
export const emergencyContacts = pgTable("emergency_contacts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  contactType: text("contact_type").notNull(), // HOSPITAL, MEDEVAC, MARINE_RESCUE, etc.
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  responseTime: text("response_time"), // e.g., "25 minutes"
  capabilities: jsonb("capabilities"),
  lastVerified: timestamp("last_verified"),
  verifiedBy: integer("verified_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// File uploads (photos, documents)
export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  incidentId: integer("incident_id").references(() => incidents.id),
  actionId: integer("action_id").references(() => incidentActions.id),
  description: text("description"),
  gpsLocation: text("gps_location"),
  timestamp: timestamp("timestamp").defaultNow(),
  metadata: jsonb("metadata"), // Camera settings, device info, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projectAssignments: many(projectAssignments),
  reportedIncidents: many(incidents, { relationName: "reportedBy" }),
  assignedIncidents: many(incidents, { relationName: "assignedTo" }),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  auditLogs: many(auditLogs),
  fileUploads: many(fileUploads),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  assignments: many(projectAssignments),
  incidents: many(incidents),
  messages: many(messages),
  emergencyContacts: many(emergencyContacts),
  auditLogs: many(auditLogs),
  fileUploads: many(fileUploads),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  project: one(projects, {
    fields: [incidents.projectId],
    references: [projects.id],
  }),
  reportedByUser: one(users, {
    fields: [incidents.reportedBy],
    references: [users.id],
    relationName: "reportedBy",
  }),
  assignedToUser: one(users, {
    fields: [incidents.assignedTo],
    references: [users.id],
    relationName: "assignedTo",
  }),
  actions: many(incidentActions),
  messages: many(messages),
  auditLogs: many(auditLogs),
  fileUploads: many(fileUploads),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIncidentActionSchema = createInsertSchema(incidentActions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertEmergencyContactSchema = createInsertSchema(emergencyContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  createdAt: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type IncidentAction = typeof incidentActions.$inferSelect;
export type InsertIncidentAction = z.infer<typeof insertIncidentActionSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = z.infer<typeof insertEmergencyContactSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
