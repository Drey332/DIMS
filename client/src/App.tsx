import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Dashboard from "@/pages/dashboard";
import Incidents from "@/pages/incidents";
import TeamManagement from "@/pages/team-management";
import Reports from "@/pages/reports";
import ProjectSetup from "@/pages/project-setup";
import AssetVerification from "@/pages/asset-verification";
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
      <Route path="/setup" component={ProjectSetup} />
      <Route path="/assets" component={AssetVerification} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
