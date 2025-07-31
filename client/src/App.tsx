import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { PersistentNav } from "@/components/persistent-nav";
import { ProjectHeader } from "@/components/project-header";
import { useEnableOfflineSync } from "@shared/useOfflineSync";
import { socket } from "./socket.js";
import { db } from "@/firebase";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { useOnlineTracking } from "@/lib/onlineTracking";

// --- Emergency alarm hook and modal ---
import { useProjectEmergencyAlarm } from "@/utils/useProjectEmergencyAlarm";
import EmergencyAlarmModal from "@/components/EmergencyAlarmModal";

// Pages...
import Dashboard from "@/pages/dashboard";
import Incidents from "@/pages/incidents";
import TeamManagement from "@/pages/team-management";
import Reports from "@/pages/reports";
import ProjectSetup from "@/pages/project-setup";
import AssetManagement from "@/pages/asset-management";
import AssetUpload from "@/pages/asset-upload";
import AssetManage from "@/pages/asset-manage";
import AssetDetails from "@/pages/asset-details";
import Clients from "@/pages/clients";
import Profile from "@/pages/profile";
import EmergencyProtocols from "@/pages/emergency-protocols";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

// --- Types ---
type ProjectInfo = {
  id: string;
  number: string;
  name: string;
  client: string;
  contractor: string;
  location: string;
  status: string;
  description: string;
};

type UserData = {
  id: string;
  name: string;
  role: string;
};

// --- Offline + Storage Banner ---
function ConnectionBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const onStatusChange = () => setOffline(!navigator.onLine);
    window.addEventListener("online", onStatusChange);
    window.addEventListener("offline", onStatusChange);

    window.addEventListener("hydrosafe:offline-fail", (e: any) => {
      setStorageError(e.detail || "Offline sync is not available in this browser. Try Chrome, Edge, or Safari.");
    });

    return () => {
      window.removeEventListener("online", onStatusChange);
      window.removeEventListener("offline", onStatusChange);
      window.removeEventListener("hydrosafe:offline-fail", () => {});
    };
  }, []);

  if (storageError) {
    return (
      <div className="w-full bg-red-700 text-white text-center p-2 font-bold z-50">
        ⚠️ {storageError}
      </div>
    );
  }
  if (offline) {
    return (
      <div className="w-full bg-yellow-400 text-black text-center p-2 font-semibold z-50">
        ⚠️ You’re offline. All data is read from device storage.<br />
        Changes will sync once you reconnect. <span className="italic">(Keep this tab open.)</span>
      </div>
    );
  }
  return null;
}

// --- Error Boundary Fallback ---
function FatalErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50">
      <h1 className="text-3xl font-bold text-red-700 mb-2">Something went wrong</h1>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="bg-hydro-dark text-white px-6 py-2 rounded font-bold"
      >
        Retry
      </button>
    </div>
  );
}

// --- Main Router ---
function Router() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [userData, setUserData] = useState<UserData | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | undefined>(undefined);

  // Preload ALL critical project data on login
  useEffect(() => {
    if (isAuthenticated) {
      const projectId = "1";
      const unsubs = [
        onSnapshot(doc(db, "projects", projectId), (docSnap) => {
          setProjectInfo(docSnap.data() as ProjectInfo);
        }),
        onSnapshot(collection(db, "projects", projectId, "erpProtocols"), () => {}),
        onSnapshot(collection(db, "projects", projectId, "assets"), () => {}),
        onSnapshot(collection(db, "projects", projectId, "contacts"), () => {}),
      ];
      return () => unsubs.forEach(unsub => unsub());
    }
  }, [isAuthenticated]);

  // Auth, user, socket setup
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsAuthenticated(true);
      setUserData(JSON.parse(user));
    } else {
      setIsAuthenticated(false);
      setUserData(null);
    }
    setIsLoading(false);

    if (token) {
      socket.connect();
      const userObj = JSON.parse(user || '{}');
      if (userObj.id) {
        socket.emit('user-online', userObj.id);
      }
    }
  }, []);

  // --- Emergency Alarm Integration ---
  // Use this custom hook (works for ALL logged-in users, shows live modal, tracks live ack list)
  const {
    emergency,
    isModalOpen,
    ackList,        // <-- List of all acknowledgers (for modal, team map, dashboard, etc.)
    acknowledge,
    ackInProgress,
  } = useProjectEmergencyAlarm({ projectId: "1" });

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
      <ConnectionBanner />

      {/* --- Emergency Alarm Modal for ALL users (if not acknowledged) --- */}
      <EmergencyAlarmModal
        open={isModalOpen}
        onAcknowledge={acknowledge}
        message={emergency?.description}
        incidentId={emergency?.id ?? null}
        ackList={ackList}
        ackInProgress={ackInProgress}
      />

      {/* --- Main UI --- */}
      {isAuthenticated && userData && (
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
            <Route path="/asset/:id" component={AssetDetails} />
            <Route path="/asset-management/:assetId?" component={AssetManagement} />
            {isAuthenticated && (
              <>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/incidents" component={Incidents} />
                <Route path="/team">
                  <TeamManagement currentUser={userData} />
                </Route>
                <Route path="/reports" component={Reports} />
                <Route path="/reports/generate" component={Reports} />
                <Route path="/reports/history" component={Reports} />
                <Route path="/setup" component={ProjectSetup} />
                <Route path="/asset-verification" component={AssetManagement} />
                <Route path="/assets" component={AssetManagement} />
                <Route path="/asset/:id" component={AssetDetails} />
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

// --- Main App Component ---
function App() {
  useEnableOfflineSync();
  useOnlineTracking();

  return (
    <ErrorBoundary fallback={<FatalErrorFallback error={new Error('App crashed')} resetErrorBoundary={() => window.location.reload()} />}>
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