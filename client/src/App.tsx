import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import Tours from "@/pages/tours";
import Documentation from "@/pages/documentation";
import { ModernRoster } from "@/components/scheduling/modern-roster";
import Billing from "@/pages/billing";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/patients" component={Patients} />
      <ProtectedRoute path="/tours" component={Tours} />
      <ProtectedRoute path="/documentation" component={Documentation} />
      <ProtectedRoute path="/schedule" component={ModernRoster} />
      <ProtectedRoute path="/billing" component={Billing} />
      <ProtectedRoute path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;