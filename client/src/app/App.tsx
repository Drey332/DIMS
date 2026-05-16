import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/app/error-boundary";
import { PersistentNav } from "@/app/persistent-nav";
import { ProjectHeader } from "@/features/projects/project-header";
import { useEnableOfflineSync, useLowResourceConnection } from "@shared/useOfflineSync";
import { socket } from "@/socket";
import { AUTH_STATE_EVENT } from "@/lib/auth-events";
import { db } from "@/firebase";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { useOnlineTracking } from "@/lib/onlineTracking";
import { useOfflineQueueReplay } from "@/lib/offlineQueue";

// --- Emergency alarm hook and modal ---
import { useProjectEmergencyAlarm } from "@/features/emergency/useProjectEmergencyAlarm";
import EmergencyAlarmModal from "@/features/emergency/EmergencyAlarmModal";
import PostAcknowledgmentERPModal from "@/features/emergency/PostAcknowledgmentERPModal";

// Pages...
import Dashboard from "@/features/emergency/DashboardPage";
import Incidents from "@/features/incidents/IncidentsPage";
import TeamManagement from "@/features/team/TeamManagementPage";
import Reports from "@/features/reports/ReportsPage";
import ProjectSetup from "@/features/projects/ProjectSetupPage";
import AssetManagement from "@/features/assets/AssetManagementPage";
import AssetUpload from "@/features/assets/AssetUploadPage";
import AssetManage from "@/features/assets/AssetManagePage";
import AssetDetails from "@/features/assets/AssetDetailsPage";
import Clients from "@/features/clients/ClientsPage";
import Profile from "@/features/auth/ProfilePage";
import EmergencyProtocols from "@/features/erp/EmergencyProtocolsPage";
import FireGuard from "@/features/environment/FireGuardPage";
import Login from "@/features/auth/LoginPage";
import Register from "@/features/auth/RegisterPage";
import NotFound from "@/app/not-found";

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
  const connection = useLowResourceConnection();
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageError = (e: any) => {
      setStorageError(e.detail || "Offline sync is not available in this browser. Try Chrome, Edge, or Safari.");
    };

    window.addEventListener("hydrosafe:offline-fail", handleStorageError);

    return () => {
      window.removeEventListener("hydrosafe:offline-fail", handleStorageError);
    };
  }, []);

  if (!storageError && connection.mode === "normal") return null;

  const isCritical = connection.mode === "offline-critical" || Boolean(storageError);
  const queuedCopy = connection.queuedRecords > 0
    ? `${connection.queuedRecords} queued field record${connection.queuedRecords === 1 ? "" : "s"}`
    : "No queued field records";
  const replayCopy = connection.replaying ? " Replay in progress." : "";

  return (
    <div
      className={`w-full text-center p-2 font-semibold z-50 ${
        isCritical ? "bg-red-700 text-white" : "bg-yellow-300 text-slate-950"
      }`}
    >
      <div>
        Field mode: {connection.mode.replace("-", " ")}. {queuedCopy}. Storage: {connection.storageStatus}.{replayCopy}
      </div>
      {storageError && <div className="text-xs font-medium opacity-90">{storageError}</div>}
      {connection.lastQueueError && <div className="text-xs font-medium opacity-90">Last queue error: {connection.lastQueueError}</div>}
    </div>
  );
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
    let lastAnnouncedUser: { id?: string | number } | null = null;

    const syncAuthState = () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserData(parsedUser);

        if (!socket.connected) {
          socket.connect();
        }

        if (parsedUser?.id) {
          socket.emit('user-online', parsedUser.id);
          lastAnnouncedUser = { id: parsedUser.id };
        }
      } else {
        if (lastAnnouncedUser?.id) {
          socket.emit('user-offline', lastAnnouncedUser.id);
        }
        if (socket.connected) {
          socket.disconnect();
        }
        lastAnnouncedUser = null;
        setIsAuthenticated(false);
        setUserData(null);
      }

      setIsLoading(false);
    };

    syncAuthState();

    window.addEventListener('storage', syncAuthState);
    window.addEventListener(AUTH_STATE_EVENT, syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener(AUTH_STATE_EVENT, syncAuthState);
    };
  }, []);

  // Post-acknowledgment ERP modal state
  const [showERPModal, setShowERPModal] = useState(false);
  const [acknowledgedEmergency, setAcknowledgedEmergency] = useState<any>(null);

  // --- GLOBAL EMERGENCY ALARM SYSTEM ---
  // This ensures ALL devices/browsers get emergency notifications instantly
  const {
    emergency,
    isModalOpen,
    ackList,        // <-- List of all acknowledgers (for modal, team map, dashboard, etc.)
    acknowledge,
    ackInProgress,
    clearEmergency,
  } = useProjectEmergencyAlarm({ 
    projectId: "1",
    onAlarm: (emergency) => {
      // Play alarm sound immediately
      const audio = new Audio("/siren.mp3");
      audio.play().catch(console.warn);
      
      // Browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`🚨 EMERGENCY: ${emergency.description}`, {
          body: `Priority: ${emergency.priority} - Acknowledge immediately`,
          icon: "/alert-icon.png",
          requireInteraction: true
        });
      } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(`🚨 EMERGENCY: ${emergency.description}`, {
              body: `Priority: ${emergency.priority} - Acknowledge immediately`,
              icon: "/alert-icon.png",
              requireInteraction: true
            });
          }
        });
      }
      
      // Vibration on mobile devices
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      
      console.log("🚨 GLOBAL EMERGENCY ALARM TRIGGERED:", emergency);
    }
  });

  // Enhanced acknowledgment function that shows ERP modal
  const handleEmergencyAcknowledge = async () => {
    try {
      await acknowledge();
      // After successful acknowledgment, show ERP modal
      if (emergency) {
        setAcknowledgedEmergency(emergency);
        setShowERPModal(true);
      }
    } catch (error) {
      console.error("Failed to acknowledge emergency:", error);
    }
  };

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
        onAcknowledge={handleEmergencyAcknowledge}
        message={emergency?.description}
        incidentId={emergency?.id ?? null}
        ackList={ackList}
        ackInProgress={ackInProgress}
      />

      {/* --- Post-Acknowledgment ERP Modal --- */}
      <PostAcknowledgmentERPModal
        open={showERPModal}
        onClose={() => {
          setShowERPModal(false);
          setAcknowledgedEmergency(null);
          // Clear the emergency data completely after ERP modal is closed
          if (clearEmergency) clearEmergency();
        }}
        emergencyId={acknowledgedEmergency?.id || ""}
        emergencyTitle={acknowledgedEmergency?.title || acknowledgedEmergency?.description || ""}
        emergencyLocation={acknowledgedEmergency?.location}
        emergencyType={acknowledgedEmergency?.type}
        notifiedContacts={acknowledgedEmergency?.notifiedContacts || []}
        projectId="hydrosafe-5d245"
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
                <Route path="/fire-guard" component={FireGuard} />
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
  useOfflineQueueReplay();

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
