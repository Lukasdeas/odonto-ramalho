import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfWeek, parseISO, isSameDay, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  User,
  Clock,
  X,
  Loader2,
  Ban,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, Appointment, AppointmentWithPatient, DentistSettings, Treatment, DentistTreatmentWithDetails } from "@shared/schema";

function generateTimeSlots(
  startTime: string = "08:00",
  endTime: string = "18:00",
  lunchStart: string = "12:00",
  lunchEnd: string = "13:00",
  duration: number = 30
): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const [lunchStartH, lunchStartM] = lunchStart.split(":").map(Number);
  const [lunchEndH, lunchEndM] = lunchEnd.split(":").map(Number);
  
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const lunchStartMinutes = lunchStartH * 60 + lunchStartM;
  const lunchEndMinutes = lunchEndH * 60 + lunchEndM;
  
  while (currentMinutes < endMinutes) {
    const isLunchTime = currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes;
    
    if (!isLunchTime) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
    
    currentMinutes += duration;
  }
  
  return slots;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/20 text-primary border-primary/30",
  confirmed: "bg-success/20 text-success border-success/30",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
  no_show: "bg-warning/20 text-warning border-warning/30",
};

export default function AgendaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    type: "consulta",
    notes: "",
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const startDate = format(weekDays[0], "yyyy-MM-dd");
  const endDate = format(weekDays[6], "yyyy-MM-dd");

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["/api/appointments", { startDate, endDate }],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const [patientSearchTerm, setPatientSearchTerm] = useState("");

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = patientSearchTerm.trim();
    if (!term) return patients;
    
    return patients.filter((p) => {
      // Search by name (case insensitive)
      if (p.name.toLowerCase().includes(term.toLowerCase())) return true;
      // Search by record number
      if (p.recordNumber != null && String(p.recordNumber).includes(term)) return true;
      return false;
    });
  }, [patients, patientSearchTerm]);

  const { data: settings } = useQuery<DentistSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: dentistTreatments = [] } = useQuery<DentistTreatmentWithDetails[]>({
    queryKey: ["/api/dentist-treatments", user?.id, "details"],
    queryFn: async () => {
      if (!user?.id) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/dentist-treatments/${user.id}/details`, { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  const timeSlots = useMemo(() => {
    return generateTimeSlots(
      settings?.startTime || "08:00",
      settings?.endTime || "18:00",
      settings?.lunchStart || "12:00",
      settings?.lunchEnd || "13:00",
      settings?.appointmentDuration || 30
    );
  }, [settings]);

  const workDays = settings?.workDays || [1, 2, 3, 4, 5];

  const isDayOff = (date: Date): boolean => {
    const dayOfWeek = getDay(date);
    return !workDays.includes(dayOfWeek);
  };

  const appointmentTypes = useMemo(() => {
    return dentistTreatments.map(dt => ({ 
      value: dt.treatmentId, 
      label: dt.treatment.name,
      duration: dt.customDuration ?? dt.treatment.duration 
    }));
  }, [dentistTreatments]);

  const getSelectedTreatmentDuration = (treatmentId: string): number => {
    const treatment = appointmentTypes.find(t => t.value === treatmentId);
    return treatment?.duration || settings?.appointmentDuration || 30;
  };

  const createMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      date: string;
      time: string;
      type: string;
      notes: string;
    }) => {
      const duration = getSelectedTreatmentDuration(data.type);
      return apiRequest("POST", "/api/appointments", {
        ...data,
        dentistId: user?.id,
        duration,
        status: "scheduled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Consulta agendada com sucesso!" });
      setIsDialogOpen(false);
      setSelectedSlot(null);
      setFormData({ patientId: "", type: "consulta", notes: "" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao agendar",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Status atualizado!" });
      setSelectedAppointment(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/appointments/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Consulta cancelada!" });
      setSelectedAppointment(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cancelar",
        description: error.message,
      });
    },
  });

  const slotDuration = settings?.appointmentDuration || 30;

  const appointmentsBySlot = useMemo(() => {
    const map: Record<string, { appointment: AppointmentWithPatient; isStart: boolean }> = {};
    appointments?.forEach((apt) => {
      const aptDuration = apt.duration || slotDuration;
      const slotsNeeded = Math.ceil(aptDuration / slotDuration);
      const [startH, startM] = apt.time.split(":").map(Number);
      let currentMinutes = startH * 60 + startM;
      
      for (let i = 0; i < slotsNeeded; i++) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const slotTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const key = `${apt.date}-${slotTime}`;
        map[key] = { appointment: apt, isStart: i === 0 };
        currentMinutes += slotDuration;
      }
    });
    return map;
  }, [appointments, slotDuration]);

  const isSlotBlocked = (date: string, time: string): boolean => {
    const key = `${date}-${time}`;
    return !!appointmentsBySlot[key];
  };

  const getSlotAppointment = (date: string, time: string): { appointment: AppointmentWithPatient; isStart: boolean } | null => {
    const key = `${date}-${time}`;
    return appointmentsBySlot[key] || null;
  };

  const checkConflict = (date: string, startTime: string, duration: number): boolean => {
    const slotsNeeded = Math.ceil(duration / slotDuration);
    const [startH, startM] = startTime.split(":").map(Number);
    let currentMinutes = startH * 60 + startM;
    
    for (let i = 0; i < slotsNeeded; i++) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const slotTime = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      if (isSlotBlocked(date, slotTime)) {
        return true;
      }
      currentMinutes += slotDuration;
    }
    return false;
  };

  const handleSlotClick = (date: string, time: string) => {
    const slotData = getSlotAppointment(date, time);
    
    if (slotData) {
      setSelectedAppointment(slotData.appointment);
    } else {
      setSelectedSlot({ date, time });
      setIsDialogOpen(true);
    }
  };

  const handleCreateAppointment = () => {
    if (!selectedSlot || !formData.patientId) {
      toast({
        variant: "destructive",
        title: "Selecione um paciente",
      });
      return;
    }

    const duration = getSelectedTreatmentDuration(formData.type);
    if (checkConflict(selectedSlot.date, selectedSlot.time, duration)) {
      toast({
        variant: "destructive",
        title: "Horário indisponível",
        description: "Este tratamento sobrepõe um agendamento existente.",
      });
      return;
    }

    createMutation.mutate({
      patientId: formData.patientId,
      date: selectedSlot.date,
      time: selectedSlot.time,
      type: formData.type,
      notes: formData.notes,
    });
  };

  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="h-full flex flex-col p-6 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie os agendamentos da clínica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Ir para data
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
            Hoje
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevWeek} data-testid="button-prev-week">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextWeek} data-testid="button-next-week">
              <ChevronRight className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg font-heading">
              {format(weekDays[0], "d MMM", { locale: ptBR })} - {format(weekDays[5], "d MMM yyyy", { locale: ptBR })}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto p-0">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-card">
                <tr>
                  <th className="w-20 p-2 text-left text-sm font-medium text-muted-foreground border-b">
                    Horário
                  </th>
                  {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    const dayOff = isDayOff(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={`p-2 text-center text-sm font-medium border-b ${
                          isToday ? "bg-primary/5" : ""
                        } ${dayOff ? "bg-muted/50" : ""}`}
                      >
                        <div className={`${isToday ? "text-primary" : "text-muted-foreground"} ${dayOff ? "opacity-50" : ""}`}>
                          {format(day, "EEEE", { locale: ptBR })}
                        </div>
                        <div className={`text-lg font-semibold ${isToday ? "text-primary" : ""} ${dayOff ? "opacity-50" : ""}`}>
                          {format(day, "d")}
                          {dayOff && <span className="text-xs ml-1">(fechado)</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time) => (
                  <tr key={time} className="hover:bg-muted/30">
                    <td className="p-2 text-sm font-medium text-muted-foreground border-r">
                      {time}
                    </td>
                    {weekDays.map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const key = `${dateStr}-${time}`;
                      const slotData = getSlotAppointment(dateStr, time);
                      const isToday = isSameDay(day, new Date());
                      const dayOff = isDayOff(day);

                      return (
                        <td
                          key={key}
                          className={`p-1 border-r border-b min-h-[48px] h-12 ${
                            isToday && !dayOff ? "bg-primary/5" : ""
                          } ${dayOff ? "bg-muted/50" : ""}`}
                        >
                          {appointmentsLoading ? (
                            <Skeleton className="h-full w-full" />
                          ) : dayOff ? (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                              <Ban className="h-4 w-4" />
                            </div>
                          ) : slotData ? (
                            slotData.isStart ? (
                              <button
                                className={`w-full h-full text-left p-2 rounded-md border text-xs truncate ${
                                  statusColors[slotData.appointment.status]
                                } hover-elevate transition-all`}
                                onClick={() => setSelectedAppointment(slotData.appointment)}
                                data-testid={`appointment-${slotData.appointment.id}`}
                              >
                                <div className="font-medium truncate">
                                  {slotData.appointment.patient?.name || "Paciente"}
                                </div>
                                <div className="text-[10px] opacity-80 truncate">
                                  {slotData.appointment.type || "Consulta"}
                                </div>
                              </button>
                            ) : (
                              <div
                                className={`w-full h-full rounded-md border-l-2 border-dashed ${
                                  statusColors[slotData.appointment.status]
                                } opacity-50 pointer-events-none`}
                                data-testid={`appointment-cont-${slotData.appointment.id}`}
                                aria-hidden="true"
                              />
                            )
                          ) : (
                            <button
                              className="w-full h-full flex items-center justify-center text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground rounded-md transition-colors"
                              onClick={() => handleSlotClick(dateStr, time)}
                              data-testid={`slot-${dateStr}-${time}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Novo Agendamento</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(parseISO(selectedSlot.date), "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedSlot.time}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Paciente *</Label>
              <Select
                value={formData.patientId}
                onValueChange={(value) => setFormData({ ...formData, patientId: value })}
              >
                <SelectTrigger data-testid="select-patient">
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Buscar por nome ou prontuário..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="mb-2"
                      data-testid="input-search-patient"
                    />
                  </div>
                  {filteredPatients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">#{patient.recordNumber}</span>
                        {patient.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Consulta</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label} ({type.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.type && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duração: {getSelectedTreatmentDuration(formData.type)} minutos
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas sobre a consulta..."
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={createMutation.isPending || !formData.patientId}
              data-testid="button-save-appointment"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Agendar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Detalhes da Consulta</DialogTitle>
            <DialogDescription>
              Visualize e gerencie os detalhes desta consulta
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedAppointment.patient?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.patient?.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {format(parseISO(selectedAppointment.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Horário</Label>
                  <p className="font-medium">{selectedAppointment.time}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{selectedAppointment.type || "Consulta"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[selectedAppointment.status]}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Alterar Status</Label>
                <div className="flex flex-wrap gap-2">
                  {["confirmed", "completed", "no_show"].map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: selectedAppointment.id, status })}
                      disabled={updateMutation.isPending || selectedAppointment.status === status}
                      data-testid={`button-status-${status}`}
                    >
                      {status === "confirmed" && "Confirmar"}
                      {status === "completed" && "Concluir"}
                      {status === "no_show" && "Não Compareceu"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => selectedAppointment && deleteMutation.mutate(selectedAppointment.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-cancel-appointment"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Cancelar Consulta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
