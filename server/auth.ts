import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
  sessionRole?: 'BRONZE' | 'SILVER' | 'GOLD' | null;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('[Auth] Token decoded, userId:', decoded.userId);
    
    const user = await storage.getUser(decoded.userId);
    
    if (!user) {
      console.log('[Auth] User not found for userId:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    
    console.log('[Auth] Authentication successful for user:', user.email);
    next();
  } catch (error: any) {
    console.log('[Auth] Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token', error: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Update last login activity
    await storage.updateUser(user.id, { lastActivity: new Date() });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        title: user.title,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;

    if (!email || !password || !firstName || !lastName || !username) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'BRONZE', // Default role
      title: 'Team Member',
      isActive: true,
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        title: newUser.title,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      title: user.title,
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      sessionRole: user.sessionRole,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user's current session role from database
export const getUserRole = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      role: user.sessionRole || null
    });
  } catch (error) {
    console.error('Get user role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// OAuth placeholder functions for Google and Apple
export const initiateGoogleAuth = (req: Request, res: Response) => {
  // Redirect to Google OAuth
  const googleAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile`;
  res.redirect(googleAuthUrl);
};

export const initiateAppleAuth = (req: Request, res: Response) => {
  // Redirect to Apple Sign-In
  const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${process.env.APPLE_CLIENT_ID}&redirect_uri=${process.env.APPLE_REDIRECT_URI}&response_type=code&scope=email name`;
  res.redirect(appleAuthUrl);
};

export const handleGoogleCallback = async (req: Request, res: Response) => {
  // Handle Google OAuth callback
  try {
    const { code } = req.query;
    
    // Exchange code for token and get user info
    // Implementation would go here
    
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect('/login?error=auth_failed');
  }
};

export const handleAppleCallback = async (req: Request, res: Response) => {
  // Handle Apple Sign-In callback
  try {
    const { code } = req.body;
    
    // Exchange code for token and get user info
    // Implementation would go here
    
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Apple auth error:', error);
    res.redirect('/login?error=auth_failed');
  }
};

// Firebase OAuth endpoint for Google/Apple authentication
export const handleFirebaseOAuth = async (req: Request, res: Response) => {
  try {
    const { email, displayName, provider, uid } = req.body;

    if (!email || !provider) {
      return res.status(400).json({ error: 'Email and provider are required' });
    }

    // Check if user exists
    const existingUser = await storage.getUserByEmail(email);

    let user;
    if (!existingUser) {
      // Create new user from OAuth data
      const [firstName, ...lastNameParts] = (displayName || '').split(' ');
      const lastName = lastNameParts.join(' ') || '';

      user = await storage.createUser({
        email,
        username: email.split('@')[0],
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'BRONZE', // Default role for OAuth users
        password: 'oauth_user', // OAuth users don't need passwords
        isActive: true
      });

      // Log user registration
      await storage.createAuditLog({
        userId: user.id,
        actionType: 'USER_REGISTRATION',
        description: `New user registered via ${provider} OAuth`,
        newData: { email, provider }
      });
    } else {
      user = existingUser;
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'hydrosafe_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        authProvider: provider
      }
    });

  } catch (error) {
    console.error('Firebase OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Secure role codes (server-side only - MUST be set via environment variables)
const ROLE_CODES: { BRONZE: string; SILVER: string; GOLD: string } = {
  BRONZE: process.env.BRONZE_CODE || '',
  SILVER: process.env.SILVER_CODE || '',
  GOLD: process.env.GOLD_CODE || '',
};

// Validate that role codes are configured
if (!ROLE_CODES.BRONZE || !ROLE_CODES.SILVER || !ROLE_CODES.GOLD) {
  console.error('CRITICAL: Role access codes not configured! Set BRONZE_CODE, SILVER_CODE, and GOLD_CODE environment variables.');
  console.error('Using fallback codes for development only - DO NOT USE IN PRODUCTION');
  // Only use fallbacks in development
  if (process.env.NODE_ENV === 'development') {
    ROLE_CODES.BRONZE = ROLE_CODES.BRONZE || '000';
    ROLE_CODES.SILVER = ROLE_CODES.SILVER || '001';
    ROLE_CODES.GOLD = ROLE_CODES.GOLD || '100';
  } else {
    throw new Error('Role access codes must be configured in production via environment variables');
  }
}

// Validate role access code and save to database
export const validateRoleAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { role, code } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!role || !code) {
      return res.status(400).json({ message: 'Role and code are required' });
    }

    // Validate role
    const validRoles = ['BRONZE', 'SILVER', 'GOLD'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Verify code
    const expectedCode = ROLE_CODES[role as keyof typeof ROLE_CODES];
    if (code !== expectedCode) {
      // Log failed attempt
      await storage.createAuditLog({
        userId: req.user.id,
        actionType: 'ROLE_ACCESS_DENIED',
        description: `Failed attempt to access ${role} role with incorrect code`,
        oldData: { currentRole: req.user.role },
        newData: { attemptedRole: role, success: false }
      });

      return res.status(403).json({ message: 'Invalid access code' });
    }

    // Update user's session role in database
    await storage.updateUser(req.user.id, {
      sessionRole: role as 'BRONZE' | 'SILVER' | 'GOLD'
    });

    // Log successful role escalation
    await storage.createAuditLog({
      userId: req.user.id,
      actionType: 'ROLE_ESCALATION',
      description: `User escalated to ${role} command level`,
      oldData: { baseRole: req.user.role },
      newData: { sessionRole: role, success: true }
    });

    res.json({
      success: true,
      role,
      grantedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Role validation error:', error);
    res.status(500).json({ message: 'Role validation failed' });
  }
};

// Middleware to verify role token and attach session role to request
export const verifyRoleToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const roleTokenHeader = req.headers['x-role-token'] as string;

  if (!roleTokenHeader) {
    // No role token provided - continue without session role
    req.sessionRole = null;
    return next();
  }

  try {
    const decoded = jwt.verify(roleTokenHeader, JWT_SECRET) as any;
    
    // CRITICAL SECURITY CHECK: Verify token belongs to current authenticated user
    if (!req.user || decoded.userId !== req.user.id) {
      // Log potential privilege escalation attempt
      await storage.createAuditLog({
        userId: req.user?.id || 0,
        actionType: 'SECURITY_VIOLATION',
        description: 'Attempted to use role token from different user',
        oldData: { 
          authenticatedUser: req.user?.id,
          tokenUserId: decoded.userId,
          tokenRole: decoded.sessionRole 
        },
        newData: { blocked: true }
      });
      
      req.sessionRole = null;
      return next();
    }
    
    req.sessionRole = decoded.sessionRole;
    next();
  } catch (error) {
    // Invalid or expired role token
    req.sessionRole = null;
    next();
  }
};

// Middleware to require specific role for protected routes
export const requireRole = (requiredRole: 'BRONZE' | 'SILVER' | 'GOLD') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.sessionRole) {
      return res.status(403).json({ message: 'Role selection required' });
    }

    const roleHierarchy = { BRONZE: 1, SILVER: 2, GOLD: 3 };
    const userLevel = roleHierarchy[req.sessionRole];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        message: `${requiredRole} role required for this action`,
        currentRole: req.sessionRole,
        requiredRole
      });
    }

    next();
  };
};