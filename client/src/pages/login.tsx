import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { broadcastAuthStateChange } from '@/lib/auth-events';
import { Shield, Anchor, Chrome, Mail, Lock, User as UserIcon, UserPlus, LogOut } from 'lucide-react';
import { RolePicker } from '@/components/RolePicker';
import { RoleCodeModal } from '@/components/RoleCodeModal';
import { useRole, UserRole } from '@/hooks/useRole';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { role, setRole, validateCode, hasRole } = useRole();
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: ''
  });

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is signed in, sync with backend
        syncWithBackend(user);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Firebase user with backend
  const syncWithBackend = async (user: User) => {
    try {
      const providerId = user.providerData?.[0]?.providerId ?? 'password';
      const response = await fetch('/api/auth/firebase-oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName,
          provider: providerId,
          uid: user.uid
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        broadcastAuthStateChange();
        toast({
          title: 'Success',
          description: 'Successfully authenticated'
        });
        // Don't redirect yet - let user select role first
        return;
      }

      const rawMessage = await response.text();
      let parsedMessage = rawMessage;
      try {
        const parsed = JSON.parse(rawMessage);
        parsedMessage = parsed?.message || parsed?.error || rawMessage;
      } catch {
        // ignore JSON parsing errors
      }

      setError(parsedMessage || 'Unable to complete authentication.');
      toast({
        title: 'Authentication error',
        description: parsedMessage || 'Please try again.',
        variant: 'destructive'
      });
    } catch (error: any) {
      console.error('Backend sync error:', error);
      toast({
        title: 'Sync Error',
        description: 'Authentication succeeded but sync failed',
        variant: 'destructive'
      });
    }
  };

  // Google OAuth handler
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Google Login Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password login
  const handleEmailLogin = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Login Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Registration handler
  const handleRegister = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!registerForm.email || !registerForm.password || !registerForm.firstName || !registerForm.lastName || !registerForm.username) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
      // onAuthStateChanged will handle the rest
    } catch (error: any) {
      setError(error.message);
      toast({
        title: 'Registration Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('selectedRole');
      broadcastAuthStateChange();
      setFirebaseUser(null);
      setSelectedRole(null);
      toast({
        title: 'Success',
        description: 'Successfully logged out'
      });
    } catch (error: any) {
      toast({
        title: 'Logout Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Role selection handlers
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setShowCodeModal(true);
  };

  const handleCodeSuccess = () => {
    if (selectedRole) {
      setRole(selectedRole);
      setShowCodeModal(false);
      toast({
        title: 'Role Activated',
        description: `${selectedRole} command level activated`,
      });
      setLocation('/dashboard');
    }
  };

  const handleCodeCancel = () => {
    setShowCodeModal(false);
    setSelectedRole(null);
  };

  // If user is logged in, show role selection
  if (firebaseUser) {
    return (
      <>
        <RolePicker onSelectRole={handleRoleSelect} />
        <RoleCodeModal
          open={showCodeModal}
          role={selectedRole}
          onClose={handleCodeCancel}
          onSuccess={handleCodeSuccess}
          validateCode={validateCode}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="p-2 bg-orange-500 rounded-lg">
              <Anchor className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HydroSafe</h1>
            <p className="text-gray-600 dark:text-gray-400">AI Emergency Response Co-Pilot</p>
          </div>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your offshore emergency response dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                {error}
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4" />
                  <span>Login</span>
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center space-x-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="john@example.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a secure password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* OAuth Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              {isLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Secure offshore emergency response platform</p>
          <p className="mt-1">Powered by HydroDive Safety Systems</p>
        </div>
      </div>
    </div>
  );
}