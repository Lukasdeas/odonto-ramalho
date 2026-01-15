import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  CheckCircle,
  Clock,
  ArrowRight,
  Cake,
  Gift,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { DashboardStats, AppointmentWithPatient, BirthdayPatient } from "@shared/schema";

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  isLoading,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  color: "primary" | "success" | "warning" | "secondary";
  isLoading?: boolean;
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    secondary: "bg-secondary/10 text-secondary",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold font-heading">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentItem({ appointment }: { appointment: AppointmentWithPatient }) {
  const statusColors: Record<string, string> = {
    scheduled: "bg-primary/10 text-primary",
    confirmed: "bg-success/10 text-success",
    completed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive",
    no_show: "bg-warning/10 text-warning",
  };

  const statusLabels: Record<string, string> = {
    scheduled: "Agendado",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
    no_show: "Não compareceu",
  };

  return (
    <div className="flex items-center gap-4 rounded-md p-3 hover-elevate active-elevate-2 transition-colors">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Clock className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{appointment.patient?.name || "Paciente"}</p>
        <p className="text-sm text-muted-foreground">
          {appointment.time} - {appointment.type || "Consulta"}
        </p>
      </div>
      <Badge variant="secondary" className={statusColors[appointment.status]}>
        {statusLabels[appointment.status]}
      </Badge>
    </div>
  );
}

function BirthdayItem({ patient }: { patient: BirthdayPatient }) {
  const birthDate = parseISO(patient.birthDate);
  const day = format(birthDate, "d");
  const month = format(birthDate, "MMMM", { locale: ptBR });

  return (
    <div 
      className={`flex items-center gap-4 rounded-md p-3 hover-elevate active-elevate-2 transition-colors ${
        patient.isBirthdayToday ? "bg-warning/10" : ""
      }`}
      data-testid={`birthday-item-${patient.id}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
        patient.isBirthdayToday ? "bg-warning/20" : "bg-primary/10"
      }`}>
        {patient.isBirthdayToday ? (
          <Gift className="h-5 w-5 text-warning" />
        ) : (
          <Cake className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{patient.name}</p>
          {patient.isBirthdayToday && (
            <Badge variant="secondary" className="bg-warning/20 text-warning">
              Hoje
            </Badge>
          )}
          {patient.hasAppointmentToday && (
            <Badge variant="secondary" className="bg-success/20 text-success">
              Consulta hoje
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {day} de {month}
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/pacientes/${patient.id}`} data-testid={`link-patient-${patient.id}`}>
          Ver
        </Link>
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["/api/appointments", { date: today }],
  });

  const { data: birthdayPatients, isLoading: birthdaysLoading } = useQuery<BirthdayPatient[]>({
    queryKey: ["/api/dashboard/birthdays"],
  });

  const currentMonth = format(new Date(), "MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 p-6 animate-fadeIn h-full overflow-y-auto">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button asChild>
          <Link href="/agenda" data-testid="link-view-agenda">
            Ver Agenda Completa
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Pacientes"
          value={stats?.totalPatients || 0}
          description="Pacientes cadastrados"
          icon={Users}
          color="primary"
          isLoading={statsLoading}
        />
        <StatCard
          title="Consultas Hoje"
          value={stats?.todayAppointments || 0}
          description="Agendamentos do dia"
          icon={CalendarCheck}
          color="success"
          isLoading={statsLoading}
        />
        <StatCard
          title="Consultas na Semana"
          value={stats?.weekAppointments || 0}
          description="Próximos 7 dias"
          icon={CalendarDays}
          color="warning"
          isLoading={statsLoading}
        />
        <StatCard
          title="Concluídas Hoje"
          value={stats?.completedToday || 0}
          description="Consultas finalizadas"
          icon={CheckCircle}
          color="secondary"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg font-heading">Consultas de Hoje</CardTitle>
              <CardDescription>
                {format(new Date(), "d 'de' MMMM", { locale: ptBR })}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/agenda" data-testid="link-agenda-today">
                Ver todas
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : todayAppointments && todayAppointments.length > 0 ? (
              <div className="space-y-2">
                {todayAppointments.slice(0, 5).map((appointment) => (
                  <AppointmentItem key={appointment.id} appointment={appointment} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhuma consulta agendada para hoje</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/agenda" data-testid="link-add-appointment">
                    Agendar Consulta
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Cake className="h-5 w-5 text-warning" />
                Aniversariantes de {currentMonth}
              </CardTitle>
              <CardDescription>
                Ofereça uma promoção especial
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {birthdaysLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : birthdayPatients && birthdayPatients.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {birthdayPatients.map((patient) => (
                  <BirthdayItem key={patient.id} patient={patient} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Cake className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum aniversariante este mês</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle className="text-lg font-heading">Acesso Rápido</CardTitle>
            <CardDescription>Ações mais utilizadas</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/pacientes?new=true" data-testid="link-new-patient">
                <Users className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Novo Paciente</p>
                  <p className="text-xs text-muted-foreground">Cadastrar paciente</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/agenda" data-testid="link-schedule">
                <CalendarCheck className="mr-3 h-5 w-5 text-success" />
                <div className="text-left">
                  <p className="font-medium">Agendar</p>
                  <p className="text-xs text-muted-foreground">Nova consulta</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/odontograma" data-testid="link-odontogram">
                <svg className="mr-3 h-5 w-5 text-warning" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 8 8 9 9 10C10 11 11 12 11 14V22H13V14C13 12 14 11 15 10C16 9 16.5 8 16.5 6.5C16.5 4 14.5 2 12 2Z"/>
                </svg>
                <div className="text-left">
                  <p className="font-medium">Odontograma</p>
                  <p className="text-xs text-muted-foreground">Mapear dentes</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/prontuarios" data-testid="link-records">
                <CheckCircle className="mr-3 h-5 w-5 text-secondary" />
                <div className="text-left">
                  <p className="font-medium">Prontuários</p>
                  <p className="text-xs text-muted-foreground">Ver registros</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
