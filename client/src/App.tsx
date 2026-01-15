import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import AgendaPage from "@/pages/agenda";
import PacientesPage from "@/pages/pacientes";
import PacienteDetalhePage from "@/pages/paciente-detalhe";
import OdontogramaPage from "@/pages/odontograma";
import OrcamentosPage from "@/pages/orcamentos";
import ProntuariosPage from "@/pages/prontuarios";
import DocumentosPage from "@/pages/documentos";
import ConfiguracoesPage from "@/pages/configuracoes";
import DentistasPage from "@/pages/dentistas";
import FinanceiroPage from "@/pages/financeiro";
import NotFound from "@/pages/not-found";

function AuthenticatedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-slow text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Switch>
              <Route path="/dashboard" component={DashboardPage} />
              <Route path="/agenda" component={AgendaPage} />
              <Route path="/pacientes" component={PacientesPage} />
              <Route path="/pacientes/:id" component={PacienteDetalhePage} />
              <Route path="/odontograma" component={OdontogramaPage} />
              <Route path="/orcamentos" component={OrcamentosPage} />
              <Route path="/prontuarios" component={ProntuariosPage} />
              <Route path="/documentos" component={DocumentosPage} />
              <Route path="/financeiro" component={FinanceiroPage} />
              <Route path="/configuracoes" component={ConfiguracoesPage} />
              <Route path="/dentistas" component={DentistasPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/login" component={LoginPage} />
              <Route>
                <AuthenticatedRoutes />
              </Route>
            </Switch>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
