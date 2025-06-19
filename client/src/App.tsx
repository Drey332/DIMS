import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";

import Dashboard from "@/pages/dashboard";
import Incidents from "@/pages/incidents";
import TeamManagement from "@/pages/team-management";
import Reports from "@/pages/reports";
import ProjectSetup from "@/pages/project-setup";
import AssetVerification from "@/pages/asset-verification";
import AssetUpload from "@/pages/asset-upload";
import AssetManage from "@/pages/asset-manage";
import Clients from "@/pages/clients";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/incidents" component={Incidents} />
      <Route path="/team" component={TeamManagement} />
      <Route path="/reports" component={Reports} />
      <Route path="/reports/generate" component={Reports} />
      <Route path="/reports/history" component={Reports} />
      <Route path="/setup" component={ProjectSetup} />
      <Route path="/asset-verification" component={AssetVerification} />
      <Route path="/assets" component={AssetVerification} />
      <Route path="/assets/upload" component={AssetUpload} />
      <Route path="/assets/manage" component={AssetManage} />
      <Route path="/clients" component={Clients} />
      <Route component={NotFound} />
    </Switch>
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
