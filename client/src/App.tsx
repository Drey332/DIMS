import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { PersistentNav } from "@/components/persistent-nav";
import { ProjectHeader } from "@/components/project-header";
import { socket } from './socket.js';

// FIREBASE (match your setup)
import { db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";

import Dashboard from "@/pages/dashboard";
import Incidents from "@/pages/incidents";
import TeamManagement from "@/pages/team-management";
import Reports from "@/pages/reports";
import ProjectSetup from "@/pages/project-setup";
import AssetVerification from "@/pages/asset-verification";
import AssetUpload from "@/pages/asset-upload";
import AssetManage from "@/pages/asset-manage";
import Clients from "@/pages/clients";
import Profile from "@/pages/profile";
import EmergencyProtocols from "@/pages/emergency-protocols";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- Live Project Info State ---
  const [projectInfo, setProjectInfo] = useState(null);

  useEffect(() => {
    // Auth logic
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) setIsAuthenticated(true);
    setIsLoading(false);

    // Socket logic
    if (token) {
      socket.connect();
      const userData = JSON.parse(user || '{}');
      if (userData.id) socket.emit('user-online', userData.id);
    }

    // --- Firestore live subscription for project info ---
    // Replace "1" with your actual PROJECT_ID logic if needed
    const ref = doc(db, "projects", "1");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setProjectInfo({ ...snap.data(), id: snap.id });
    });
    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading HydroSafe...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !['/login', '/register'].includes(location)) {
    return <Login />;
  }

  return (
    <>
      {isAuthenticated && (
        <>
          <PersistentNav />
          <ProjectHeader project={projectInfo} />
        </>
      )}
      <div className="min-h-screen bg-gray-50">
        <main className={isAuthenticated ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" : ""}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            {isAuthenticated && (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/incidents" component={Incidents} />
                <Route path="/team" component={TeamManagement} />
                <Route path="/reports" component={Reports} />
                <Route path="/reports/generate" component={Reports} />
                <Route path="/reports/history" component={Reports} />
                <Route path="/setup">
                  {() => <ProjectSetup project={projectInfo} />}
                </Route>
                <Route path="/asset-verification" component={AssetVerification} />
                <Route path="/assets" component={AssetVerification} />
                <Route path="/assets/upload" component={AssetUpload} />
                <Route path="/assets/manage" component={AssetManage} />
                <Route path="/clients" component={Clients} />
                <Route path="/emergency-protocols" component={EmergencyProtocols} />
                <Route path="/profile" component={Profile} />
              </>
            )}
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;