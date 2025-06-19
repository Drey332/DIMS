import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  generateDynamicChecklist, 
  getEmergencyProtocolGuidance, 
  analyzeDecisionContext,
  generateProactiveRecommendations 
} from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { insertIncidentSchema, insertMessageSchema, insertIncidentActionSchema, insertEmergencyContactSchema } from "@shared/schema";
import { 
  loginUser, 
  registerUser, 
  getCurrentUser, 
  authenticateToken,
  initiateGoogleAuth,
  initiateAppleAuth,
  handleGoogleCallback,
  handleAppleCallback,
  type AuthRequest
} from "./auth";

// File upload configuration
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

// Simple session-based authentication middleware (replace with proper auth)
const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  // For demo purposes, we'll set a default user
  // In production, implement proper session/JWT authentication
  req.user = {
    id: 1,
    username: 'david.mooney',
    role: 'GOLD',
    firstName: 'David',
    lastName: 'Mooney'
  };
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (no auth middleware required)
  app.post('/api/auth/login', loginUser);
  app.post('/api/auth/register', registerUser);
  app.get('/api/auth/user', authenticateToken, getCurrentUser);
  
  // OAuth routes
  app.get('/auth/google', initiateGoogleAuth);
  app.get('/auth/apple', initiateAppleAuth);
  app.get('/auth/google/callback', handleGoogleCallback);
  app.post('/auth/apple/callback', handleAppleCallback);

  // Apply authentication middleware to protected API routes
  app.use('/api', authenticateUser);

  // User routes
  app.get('/api/user/profile', async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user's assigned projects
  app.get('/api/user/projects', async (req: AuthenticatedRequest, res) => {
    try {
      const projects = await storage.getUserProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      res.status(500).json({ message: "Failed to fetch user projects" });
    }
  });

  // Create new project (Gold only)
  app.post('/api/projects', async (req: AuthenticatedRequest, res) => {
    if (req.user!.role !== 'GOLD') {
      return res.status(403).json({ message: 'Only Gold users can create projects' });
    }
    
    try {
      const projectData = {
        ...req.body,
        goldManagerId: req.user!.id,
        number: `HDS-${Date.now()}`,
        status: 'ACTIVE'
      };
      
      const project = await storage.createProject(projectData);
      await storage.assignUserToProject(req.user!.id, project.id, 'GOLD');
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Project routes
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.getActiveProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const stats = await storage.getDashboardStats(projectId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Incident routes
  app.get('/api/incidents', async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const incidents = projectId 
        ? await storage.getIncidentsByProject(projectId)
        : await storage.getActiveIncidents();
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  app.post('/api/incidents', async (req: AuthenticatedRequest, res) => {
    try {
      const incidentData = insertIncidentSchema.parse({
        ...req.body,
        reportedBy: 1, // Use default user ID since authentication is not fully implemented
      });
      
      const incident = await storage.createIncident(incidentData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: 1, // Use default user ID
        projectId: incident.projectId,
        incidentId: incident.id,
        actionType: 'INCIDENT_CREATED',
        description: `Incident created: ${incident.title}`,
        newData: incident,
      });
      
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.put('/api/incidents/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const updates = req.body;
      
      const oldIncident = await storage.getIncident(incidentId);
      const updatedIncident = await storage.updateIncident(incidentId, updates);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        incidentId: incidentId,
        actionType: 'INCIDENT_UPDATED',
        description: `Incident updated: ${updatedIncident.title}`,
        oldData: oldIncident,
        newData: updatedIncident,
      });
      
      res.json(updatedIncident);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Incident actions
  app.get('/api/incidents/:id/actions', async (req, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const actions = await storage.getIncidentActions(incidentId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching incident actions:", error);
      res.status(500).json({ message: "Failed to fetch incident actions" });
    }
  });

  app.post('/api/incidents/:id/actions', async (req: AuthenticatedRequest, res) => {
    try {
      const incidentId = parseInt(req.params.id);
      const actionData = insertIncidentActionSchema.parse({
        ...req.body,
        incidentId,
        assignedTo: req.body.assignedTo || req.user!.id,
      });
      
      const action = await storage.createIncidentAction(actionData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        incidentId: incidentId,
        actionType: 'ACTION_CREATED',
        description: `Action created: ${action.description}`,
        newData: action,
      });
      
      res.status(201).json(action);
    } catch (error) {
      console.error("Error creating incident action:", error);
      res.status(500).json({ message: "Failed to create incident action" });
    }
  });

  // Messages and communication
  app.get('/api/messages', async (req, res) => {
    try {
      const incidentId = req.query.incidentId ? parseInt(req.query.incidentId as string) : undefined;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let messages;
      if (incidentId) {
        messages = await storage.getMessagesByIncident(incidentId);
      } else if (projectId) {
        messages = await storage.getMessagesByProject(projectId);
      } else {
        messages = await storage.getRecentMessages(50);
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', async (req: AuthenticatedRequest, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id,
      });
      
      const message = await storage.createMessage(messageData);
      
      // Broadcast message via WebSocket (if connected)
      broadcastMessage(message);
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Emergency contacts
  app.get('/api/emergency-contacts', async (req, res) => {
    try {
      const projectIdParam = req.query.projectId as string;
      const projectId = projectIdParam && !isNaN(parseInt(projectIdParam)) ? parseInt(projectIdParam) : 1;
      const contacts = await storage.getEmergencyContactsByProject(projectId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching emergency contacts:", error);
      res.status(500).json({ message: "Failed to fetch emergency contacts" });
    }
  });

  app.post('/api/emergency-contacts', async (req: AuthenticatedRequest, res) => {
    try {
      const contactData = insertEmergencyContactSchema.parse({
        ...req.body,
        verifiedBy: req.user!.id,
        lastVerified: new Date(),
      });
      
      const contact = await storage.createEmergencyContact(contactData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        projectId: contact.projectId,
        actionType: 'CONTACT_CREATED',
        description: `Emergency contact created: ${contact.name}`,
        newData: contact,
      });
      
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating emergency contact:", error);
      res.status(500).json({ message: "Failed to create emergency contact" });
    }
  });

  app.put('/api/emergency-contacts/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const updates = {
        ...req.body,
        verifiedBy: req.user!.id,
        lastVerified: new Date(),
      };
      
      const updatedContact = await storage.updateEmergencyContact(contactId, updates);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        projectId: updatedContact.projectId,
        actionType: 'CONTACT_UPDATED',
        description: `Emergency contact updated: ${updatedContact.name}`,
        newData: updatedContact,
      });
      
      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating emergency contact:", error);
      res.status(500).json({ message: "Failed to update emergency contact" });
    }
  });

  // AI-powered routes
  app.post('/api/ai/checklist', async (req: AuthenticatedRequest, res) => {
    try {
      const { scenarioType, projectDetails } = req.body;
      const userRole = req.user!.role as 'BRONZE' | 'SILVER' | 'GOLD';
      
      const checklist = await generateDynamicChecklist(scenarioType, projectDetails, userRole);
      res.json({ checklist });
    } catch (error) {
      console.error("Error generating checklist:", error);
      res.status(500).json({ message: "Failed to generate dynamic checklist" });
    }
  });

  app.post('/api/ai/protocol-guidance', async (req, res) => {
    try {
      const { emergencyType, projectContext, currentConditions } = req.body;
      const guidance = await getEmergencyProtocolGuidance(emergencyType, projectContext, currentConditions);
      res.json(guidance);
    } catch (error) {
      console.error("Error getting protocol guidance:", error);
      res.status(500).json({ message: "Failed to get protocol guidance" });
    }
  });

  app.post('/api/ai/decision-analysis', async (req: AuthenticatedRequest, res) => {
    try {
      const { decisionData, projectContext } = req.body;
      const analysis = await analyzeDecisionContext(decisionData, req.user!.role, projectContext);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing decision context:", error);
      res.status(500).json({ message: "Failed to analyze decision context" });
    }
  });

  app.get('/api/ai/recommendations', async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      // Get project data, weather, assets, recent incidents
      const projectData = projectId ? await storage.getProject(projectId) : null;
      const weatherData = {}; // In production, fetch from weather API
      const assetStatus = {}; // In production, fetch from asset management system
      const recentIncidents = projectId ? await storage.getIncidentsByProject(projectId) : [];
      
      const recommendations = await generateProactiveRecommendations(
        projectData,
        weatherData,
        assetStatus,
        recentIncidents.slice(0, 5) // Last 5 incidents
      );
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // File upload routes
  app.post('/api/upload', upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileData = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user!.id,
        projectId: req.body.projectId ? parseInt(req.body.projectId) : undefined,
        incidentId: req.body.incidentId ? parseInt(req.body.incidentId) : undefined,
        actionId: req.body.actionId ? parseInt(req.body.actionId) : undefined,
        description: req.body.description,
        gpsLocation: req.body.gpsLocation,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      };
      
      const file = await storage.createFileUpload(fileData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
        projectId: file.projectId,
        incidentId: file.incidentId,
        actionType: 'FILE_UPLOADED',
        description: `File uploaded: ${file.originalName}`,
        newData: file,
      });
      
      res.status(201).json(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Audit logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        projectId: req.query.projectId ? parseInt(req.query.projectId as string) : undefined,
        incidentId: req.query.incidentId ? parseInt(req.query.incidentId as string) : undefined,
      };
      
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Initialize sample data for Forcados project
  app.post('/api/init-sample-data', async (req, res) => {
    try {
      // Create HydroDive personnel with real command structure
      const users = [
        {
          username: 'frank.ifedi',
          password: 'hydrosafe2025',
          firstName: 'Frank',
          lastName: 'Ifedi',
          email: 'f.ifedi@hydrodive.com',
          role: 'GOLD',
          title: 'MD/CEO - Gold Manager',
        },
        {
          username: 'dave.ward',
          password: 'hydrosafe2025',
          firstName: 'Dave',
          lastName: 'Ward',
          email: 'd.ward@hydrodive.com',
          role: 'SILVER',
          title: 'Marine and Diving Operations Director',
        },
        {
          username: 'latifatu.osagie',
          password: 'hydrosafe2025',
          firstName: 'Latifatu',
          lastName: 'Osagie',
          email: 'l.osagie@hydrodive.com',
          role: 'SILVER',
          title: 'Personnel Logistics Manager',
        },
        {
          username: 'modupe.oherein',
          password: 'hydrosafe2025',
          firstName: 'Modupe',
          lastName: 'Oherein',
          email: 'm.oherein@hydrodive.com',
          role: 'SILVER',
          title: 'Human Resources Manager',
        },
        {
          username: 'stephan.wessels',
          password: 'hydrosafe2025',
          firstName: 'Stephan',
          lastName: 'Wessels',
          email: 's.wessels@hydrodive.com',
          role: 'SILVER',
          title: 'Operations Manager',
        },
        {
          username: 'steve.hardy',
          password: 'hydrosafe2025',
          firstName: 'Steve',
          lastName: 'Hardy',
          email: 's.hardy@hydrodive.com',
          role: 'SILVER',
          title: 'Marine Manager',
        },
        {
          username: 'afam.ejidike',
          password: 'hydrosafe2025',
          firstName: 'Afam',
          lastName: 'Ejidike',
          email: 'a.ejidike@hydrodive.com',
          role: 'GOLD',
          title: 'Project Manager',
        },
        {
          username: 'tochi.nwogu',
          password: 'hydrosafe2025',
          firstName: 'Tochi',
          lastName: 'Nwogu',
          email: 't.nwogu@hydrodive.com',
          role: 'GOLD',
          title: 'Legal Advisor',
        },
      ];
      
      for (const userData of users) {
        try {
          await storage.createUser(userData);
        } catch (error) {
          // User might already exist, skip
          console.log(`User ${userData.username} already exists, skipping...`);
        }
      }
      
      // Create Forcados project
      const projectData = {
        number: '863-01-24',
        name: 'Forcados ACOE Decommissioning Project',
        client: 'Shell Petroleum Development Company of Nigeria (SPDC)',
        contractor: 'Century Ports & Terminals LTD (CPTL)',
        location: 'Forcados, Nigeria',
        status: 'ACTIVE',
        description: 'Decommissioning of Forcados ACOE Temporary Export System',
        emergencyContacts: {
          hospital: {
            name: 'Warri Central Hospital',
            phone: '+234-803-XXX-XXXX',
            lastVerified: '2025-01-20'
          },
          medevac: {
            name: 'Nigeria Air Rescue',
            phone: '+234-805-XXX-XXXX',
            responseTime: '25 minutes'
          },
          marine: {
            name: 'Nigerian Maritime Rescue',
            phone: '+234-807-XXX-XXXX'
          }
        },
        assets: {
          diveVessel: {
            name: 'Dive Support Vessel',
            status: 'OPERATIONAL',
            lastInspection: '2025-01-22',
            nextInspection: '2025-01-29'
          },
          decompressionChamber: {
            name: 'Decompression Chamber',
            status: 'INSPECTION_OVERDUE',
            actionRequired: 'Schedule inspection'
          }
        }
      };
      
      let project;
      try {
        project = await storage.createProject(projectData);
      } catch (error) {
        console.log('Project already exists, skipping...');
        project = await storage.getProjectByNumber('863-01-24');
      }
      
      // Create emergency contacts for HydroDive command structure
      if (project) {
        const emergencyContacts = [
          {
            projectId: project.id,
            contactType: 'GOLD_MANAGER',
            name: 'Frank Ifedi',
            title: 'MD/CEO - Gold Manager',
            role: 'GOLD',
            phone: '+234-803-XXXX-001',
            email: 'f.ifedi@hydrodive.com',
            responsibilities: 'Overall responsibility for incident till final close out at corporate level',
            priority: 'CRITICAL',
          },
          {
            projectId: project.id,
            contactType: 'MARINE_OPERATIONS',
            name: 'Dave Ward',
            title: 'Marine and Diving Operations Director',
            role: 'SILVER',
            phone: '+234-803-XXXX-002',
            email: 'd.ward@hydrodive.com',
            responsibilities: 'Delegated Gold Coordinator or Silver controller, marine operational decisions',
            priority: 'HIGH',
          },
          {
            projectId: project.id,
            contactType: 'LOGISTICS',
            name: 'Latifatu Osagie',
            title: 'Personnel Logistics Manager',
            role: 'SILVER',
            phone: '+234-803-XXXX-003',
            email: 'l.osagie@hydrodive.com',
            responsibilities: 'Logistics control, repatriation, family liaison for expatriate workers',
            priority: 'HIGH',
          },
          {
            projectId: project.id,
            contactType: 'MEDICAL',
            name: 'Modupe Oherein',
            title: 'Human Resources Manager',
            role: 'SILVER',
            phone: '+234-803-XXXX-004',
            email: 'm.oherein@hydrodive.com',
            responsibilities: 'Authorizing and coordination of medical treatment on shore',
            priority: 'CRITICAL',
          },
          {
            projectId: project.id,
            contactType: 'OPERATIONS',
            name: 'Stephan Wessels',
            title: 'Operations Manager',
            role: 'SILVER',
            phone: '+234-803-XXXX-005',
            email: 's.wessels@hydrodive.com',
            responsibilities: 'Logistics and equipment concerns, mobilisation support to Silver EC',
            priority: 'HIGH',
          },
          {
            projectId: project.id,
            contactType: 'MARINE_ADVISOR',
            name: 'Steve Hardy',
            title: 'Marine Manager',
            role: 'SILVER',
            phone: '+234-803-XXXX-006',
            email: 's.hardy@hydrodive.com',
            responsibilities: 'Senior advisor, Silver Controller for marine incidents, marine capacity advisor',
            priority: 'HIGH',
          },
          {
            projectId: project.id,
            contactType: 'PROJECT_MANAGER',
            name: 'Afam Ejidike',
            title: 'Project Manager',
            role: 'GOLD',
            phone: '+234-803-XXXX-007',
            email: 'a.ejidike@hydrodive.com',
            responsibilities: 'Command and control, strategy, media, shareholder reporting, Silver Team chair',
            priority: 'CRITICAL',
          },
          {
            projectId: project.id,
            contactType: 'LEGAL',
            name: 'Tochi Nwogu',
            title: 'Legal Advisor',
            role: 'GOLD',
            phone: '+234-803-XXXX-008',
            email: 't.nwogu@hydrodive.com',
            responsibilities: 'Legal ramifications, company implications, legal responsibilities advice',
            priority: 'HIGH',
          },
        ];
        
        for (const contact of emergencyContacts) {
          try {
            await storage.createEmergencyContact(contact);
          } catch (error) {
            console.log(`Emergency contact ${contact.name} already exists, skipping...`);
          }
        }
      }
      
      res.json({ message: 'Sample data initialized with HydroDive command structure' });
    } catch (error) {
      console.error("Error initializing sample data:", error);
      res.status(500).json({ message: "Failed to initialize sample data" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket setup for real-time communication
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  const clients = new Map<WebSocket, { userId?: number; sessionId?: string }>();
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    clients.set(ws, {});
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle activity tracking messages
        if (message.type === 'ACTIVITY_UPDATE' || message.type === 'HEARTBEAT') {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            clientInfo.sessionId = message.sessionId;
            
            // Update user activity in database
            try {
              await storage.updateUserActivity(1, {
                lastActivity: new Date(),
                isOnline: true,
                activityStatus: 'ONLINE',
                sessionId: message.sessionId
              });
              
              // Broadcast activity update to all clients
              broadcastMessage({
                type: 'USER_STATUS_UPDATE',
                userId: 1,
                status: 'ONLINE',
                timestamp: message.timestamp
              });
            } catch (error) {
              console.error('Error updating user activity:', error);
            }
          }
        } else if (message.type === 'USER_AWAY') {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            try {
              await storage.updateUserActivity(1, {
                lastActivity: new Date(),
                isOnline: true,
                activityStatus: 'IDLE',
                sessionId: message.sessionId
              });
              
              broadcastMessage({
                type: 'USER_STATUS_UPDATE',
                userId: 1,
                status: 'IDLE',
                timestamp: message.timestamp
              });
            } catch (error) {
              console.error('Error updating user away status:', error);
            }
          }
        } else if (message.type === 'USER_OFFLINE') {
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            try {
              await storage.updateUserActivity(1, {
                lastActivity: new Date(),
                isOnline: false,
                activityStatus: 'OFFLINE',
                sessionId: null
              });
              
              broadcastMessage({
                type: 'USER_STATUS_UPDATE',
                userId: 1,
                status: 'OFFLINE',
                timestamp: message.timestamp
              });
            } catch (error) {
              console.error('Error updating user offline status:', error);
            }
          }
        } else {
          // Broadcast other messages to all connected clients
          broadcastMessage(message);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', async () => {
      const clientInfo = clients.get(ws);
      if (clientInfo && clientInfo.sessionId) {
        try {
          await storage.updateUserActivity(1, {
            lastActivity: new Date(),
            isOnline: false,
            activityStatus: 'OFFLINE',
            sessionId: null
          });
          
          broadcastMessage({
            type: 'USER_STATUS_UPDATE',
            userId: 1,
            status: 'OFFLINE',
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error updating user offline status on disconnect:', error);
        }
      }
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  function broadcastMessage(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((clientInfo, client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Background process to update user statuses based on activity timing
  const statusUpdateInterval = setInterval(async () => {
    try {
      const allUsers = await storage.getActiveUsers();
      const now = Date.now();
      
      for (const user of allUsers) {
        if (!user.lastActivity) continue;
        
        const timeSinceActivity = now - new Date(user.lastActivity).getTime();
        const threeMinutes = 3 * 60 * 1000; // 3 minutes
        const oneHourThreeMinutes = 63 * 60 * 1000; // 1 hour 3 minutes
        
        let newStatus = user.activityStatus;
        
        if (timeSinceActivity > oneHourThreeMinutes) {
          // Red: User hasn't been active for over 1 hour 3 minutes
          newStatus = 'OFFLINE';
        } else if (timeSinceActivity > threeMinutes) {
          // Orange: User hasn't been active for over 3 minutes
          newStatus = 'IDLE';
        } else {
          // Green: User is currently active (within 3 minutes)
          newStatus = 'ONLINE';
        }
        
        // Update status if it has changed
        if (newStatus !== user.activityStatus) {
          await storage.updateUserActivity(user.id, {
            lastActivity: user.lastActivity ? user.lastActivity : new Date(),
            isOnline: newStatus === 'ONLINE',
            activityStatus: newStatus,
            sessionId: newStatus === 'OFFLINE' ? null : user.sessionId
          });
          
          // Broadcast status change to all clients
          broadcastMessage({
            type: 'USER_STATUS_UPDATE',
            userId: user.id,
            status: newStatus,
            timestamp: now,
            timeSinceActivity: Math.floor(timeSinceActivity / 1000) // in seconds
          });
        }
      }
    } catch (error) {
      console.error('Error updating user statuses:', error);
    }
  }, 30000); // Check every 30 seconds

  // Cleanup interval on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(statusUpdateInterval);
  });

  process.on('SIGINT', () => {
    clearInterval(statusUpdateInterval);
  });

  return httpServer;
}
