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
  // Apply authentication middleware to all API routes
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
        reportedBy: req.user!.id,
      });
      
      const incident = await storage.createIncident(incidentData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user!.id,
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
      // Create HydroDive personnel
      const users = [
        {
          username: 'david.mooney',
          password: 'hydrosafe2025',
          firstName: 'David',
          lastName: 'Mooney',
          email: 'd.mooney@hydrodive.com',
          role: 'GOLD',
          title: 'General Manager',
        },
        {
          username: 'dean.golding',
          password: 'hydrosafe2025',
          firstName: 'Dean',
          lastName: 'Golding Perello',
          email: 'd.golding@hydrodive.com',
          role: 'SILVER',
          title: 'Diving Manager',
        },
        {
          username: 'kene.anyabolu',
          password: 'hydrosafe2025',
          firstName: 'Kene',
          lastName: 'Anyabolu',
          email: 'k.anyabolu@hydrodive.com',
          role: 'SILVER',
          title: 'HSE Manager',
        },
        {
          username: 'nick.roddy',
          password: 'hydrosafe2025',
          firstName: 'Nick',
          lastName: 'Roddy',
          email: 'n.roddy@hydrodive.com',
          role: 'BRONZE',
          title: 'Project Manager',
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
      
      try {
        await storage.createProject(projectData);
      } catch (error) {
        console.log('Project already exists, skipping...');
      }
      
      res.json({ message: 'Sample data initialized successfully' });
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
  
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    clients.add(ws);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Broadcast message to all connected clients
        broadcastMessage(message);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  function broadcastMessage(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  return httpServer;
}
