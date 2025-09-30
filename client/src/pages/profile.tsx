import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Shield, Calendar, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { broadcastAuthStateChange } from '@/lib/auth-events';

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      broadcastAuthStateChange();
      toast({
        title: 'Success',
        description: 'Successfully signed out'
      });
      setLocation('/login');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
              <Button onClick={() => setLocation('/login')}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full border-4 border-blue-100 object-cover" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-100">
                    <span className="text-2xl font-bold text-white">
                      {user.email?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {user.displayName || 'HydroSafe User'}
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Emergency Response Team Member
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </h3>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Email Address</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant={user.emailVerified ? "default" : "secondary"}>
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">Account Created</p>
                      <p className="text-sm text-gray-600">
                        {user.metadata?.creationTime ? 
                          new Date(user.metadata.creationTime).toLocaleDateString() : 
                          'Not available'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">User ID</p>
                      <p className="text-sm text-gray-600 font-mono">{user.uid}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Security Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Authentication Provider</p>
                    <p className="text-sm text-gray-600">
                      {user.providerData?.[0]?.providerId === 'google.com' ? 'Google OAuth' : 'Email/Password'}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {user.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setLocation('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}