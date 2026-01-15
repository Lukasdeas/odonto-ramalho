import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Save,
  Clock,
  Calendar,
  Building2,
  Loader2,
  User,
  Stethoscope,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Palette,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { DentistSettings, Treatment, DentistTreatmentWithDetails } from "@shared/schema";

const weekDays = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const durationOptions = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1 hora e 30 minutos" },
  { value: 120, label: "2 horas" },
];

const legendColors = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#f97316", label: "Laranja" },
  { value: "#84cc16", label: "Lima" },
  { value: "#6366f1", label: "Indigo" },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<DentistSettings>>({
    workDays: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    appointmentDuration: 30,
    clinicName: "Odonto Ramalho",
    clinicAddress: "",
    clinicPhone: "",
    clinicEmail: "",
    clinicCep: "",
  });

  const { data: settings, isLoading } = useQuery<DentistSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: allTreatments = [] } = useQuery<Treatment[]>({
    queryKey: ["/api/treatments"],
  });

  const { data: dentistTreatments = [], isLoading: loadingDentistTreatments } = useQuery<DentistTreatmentWithDetails[]>({
    queryKey: ["/api/dentist-treatments", user?.id, "details"],
    queryFn: async () => {
      if (!user?.id) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/dentist-treatments/${user.id}/details`, { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao carregar tratamentos");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [treatmentDialogOpen, setTreatmentDialogOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [treatmentForm, setTreatmentForm] = useState({
    name: "",
    description: "",
    duration: 30,
  });
  
  const getPriceForTreatment = (treatmentId: string): number => {
    if (localPrices[treatmentId] !== undefined) {
      return localPrices[treatmentId];
    }
    const dt = dentistTreatments.find(dt => dt.treatmentId === treatmentId);
    return dt?.price || 0;
  };

  const enabledTreatmentIds = dentistTreatments.map(dt => dt.treatmentId);

  useEffect(() => {
    if (settings) {
      setFormData({
        workDays: settings.workDays,
        startTime: settings.startTime,
        endTime: settings.endTime,
        lunchStart: settings.lunchStart,
        lunchEnd: settings.lunchEnd,
        appointmentDuration: settings.appointmentDuration,
        clinicName: settings.clinicName || "",
        clinicAddress: settings.clinicAddress || "",
        clinicPhone: settings.clinicPhone || "",
        clinicEmail: settings.clinicEmail || "",
        clinicCep: settings.clinicCep || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DentistSettings>) => {
      if (settings?.id) {
        return apiRequest("PATCH", `/api/settings/${settings.id}`, data);
      }
      return apiRequest("POST", "/api/settings", { ...data, userId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    },
  });

  const addTreatmentMutation = useMutation({
    mutationFn: async ({ treatmentId, price }: { treatmentId: string; price: number }) => {
      return apiRequest("POST", "/api/dentist-treatments", {
        dentistId: user?.id,
        treatmentId,
        price,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dentist-treatments", user?.id, "details"] });
      toast({ title: "Tratamento adicionado!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const removeTreatmentMutation = useMutation({
    mutationFn: async (treatmentId: string) => {
      return apiRequest("DELETE", `/api/dentist-treatments/${user?.id}/${treatmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dentist-treatments", user?.id, "details"] });
      toast({ title: "Tratamento removido!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const updateTreatmentPriceMutation = useMutation({
    mutationFn: async ({ treatmentId, price }: { treatmentId: string; price: number }) => {
      return apiRequest("PATCH", `/api/dentist-treatments/${user?.id}/${treatmentId}`, { price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dentist-treatments", user?.id, "details"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao atualizar preço", description: error.message });
    },
  });

  const updateLegendColorMutation = useMutation({
    mutationFn: async ({ treatmentId, legendColor }: { treatmentId: string; legendColor: string | null }) => {
      return apiRequest("PATCH", `/api/dentist-treatments/${user?.id}/${treatmentId}`, { legendColor });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dentist-treatments", user?.id, "details"] });
      toast({ title: "Cor de legenda atualizada!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao atualizar cor", description: error.message });
    },
  });

  const getLegendColorForTreatment = (treatmentId: string): string | null => {
    const dt = dentistTreatments.find(dt => dt.treatmentId === treatmentId);
    return dt?.legendColor || null;
  };

  const createTreatmentMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; duration: number }) => {
      return apiRequest("POST", "/api/treatments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      toast({ title: "Tratamento criado com sucesso!" });
      setTreatmentDialogOpen(false);
      setTreatmentForm({ name: "", description: "", duration: 30 });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao criar tratamento", description: error.message });
    },
  });

  const updateTreatmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string; duration?: number } }) => {
      return apiRequest("PATCH", `/api/treatments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dentist-treatments", user?.id, "details"] });
      toast({ title: "Tratamento atualizado!" });
      setTreatmentDialogOpen(false);
      setEditingTreatment(null);
      setTreatmentForm({ name: "", description: "", duration: 30 });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao atualizar tratamento", description: error.message });
    },
  });

  const deleteTreatmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/treatments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dentist-treatments", user?.id, "details"] });
      toast({ title: "Tratamento excluído!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao excluir tratamento", description: error.message });
    },
  });

  const openNewTreatmentDialog = () => {
    setEditingTreatment(null);
    setTreatmentForm({ name: "", description: "", duration: 30 });
    setTreatmentDialogOpen(true);
  };

  const openEditTreatmentDialog = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setTreatmentForm({
      name: treatment.name,
      description: treatment.description || "",
      duration: treatment.duration,
    });
    setTreatmentDialogOpen(true);
  };

  const handleSaveTreatment = () => {
    if (!treatmentForm.name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }
    if (editingTreatment) {
      updateTreatmentMutation.mutate({
        id: editingTreatment.id,
        data: treatmentForm,
      });
    } else {
      createTreatmentMutation.mutate(treatmentForm);
    }
  };

  const handleTreatmentToggle = (treatmentId: string, enabled: boolean) => {
    if (enabled) {
      addTreatmentMutation.mutate({ treatmentId, price: getPriceForTreatment(treatmentId) });
    } else {
      removeTreatmentMutation.mutate(treatmentId);
    }
  };

  const handlePriceChange = (treatmentId: string, priceStr: string) => {
    const price = parseFloat(priceStr) || 0;
    setLocalPrices(prev => ({ ...prev, [treatmentId]: price }));
  };

  const handlePriceBlur = (treatmentId: string) => {
    const isEnabled = enabledTreatmentIds.includes(treatmentId);
    if (isEnabled) {
      const price = getPriceForTreatment(treatmentId);
      updateTreatmentPriceMutation.mutate({ treatmentId, price });
    }
    setLocalPrices(prev => {
      const next = { ...prev };
      delete next[treatmentId];
      return next;
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleWorkDayToggle = (day: number) => {
    const currentDays = formData.workDays || [];
    if (currentDays.includes(day)) {
      setFormData({ ...formData, workDays: currentDays.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, workDays: [...currentDays, day].sort() });
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 animate-fadeIn">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading">Configurações</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações da clínica e horários
            </p>
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-settings">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {user?.name ? getInitials(user.name) : "DR"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Perfil do Dentista
                </CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="font-medium">{user?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Username</Label>
                <p className="font-medium">{user?.username}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Clínica
            </CardTitle>
            <CardDescription>Informações da clínica odontológica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                value={formData.clinicName || ""}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                placeholder="Nome da clínica"
                data-testid="input-clinic-name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinicPhone">Telefone</Label>
                <Input
                  id="clinicPhone"
                  value={formData.clinicPhone || ""}
                  onChange={(e) => setFormData({ ...formData, clinicPhone: e.target.value })}
                  placeholder="(00) 0000-0000"
                  data-testid="input-clinic-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicEmail">Email</Label>
                <Input
                  id="clinicEmail"
                  type="email"
                  value={formData.clinicEmail || ""}
                  onChange={(e) => setFormData({ ...formData, clinicEmail: e.target.value })}
                  placeholder="email@clinica.com.br"
                  data-testid="input-clinic-email"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinicAddress">Endereço</Label>
                <Input
                  id="clinicAddress"
                  value={formData.clinicAddress || ""}
                  onChange={(e) => setFormData({ ...formData, clinicAddress: e.target.value })}
                  placeholder="Endereço completo"
                  data-testid="input-clinic-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicCep">CEP</Label>
                <Input
                  id="clinicCep"
                  value={formData.clinicCep || ""}
                  onChange={(e) => setFormData({ ...formData, clinicCep: e.target.value })}
                  placeholder="00000-000"
                  data-testid="input-clinic-cep"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dias de Atendimento
            </CardTitle>
            <CardDescription>Selecione os dias em que a clínica funciona</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {weekDays.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={formData.workDays?.includes(day.value)}
                    onCheckedChange={() => handleWorkDayToggle(day.value)}
                    data-testid={`checkbox-day-${day.value}`}
                  />
                  <Label htmlFor={`day-${day.value}`} className="font-normal text-sm">
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Atendimento
            </CardTitle>
            <CardDescription>Configure os horários de funcionamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Início do Expediente</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  data-testid="input-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Fim do Expediente</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  data-testid="input-end-time"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lunchStart">Início do Almoço</Label>
                <Input
                  id="lunchStart"
                  type="time"
                  value={formData.lunchStart}
                  onChange={(e) => setFormData({ ...formData, lunchStart: e.target.value })}
                  data-testid="input-lunch-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lunchEnd">Fim do Almoço</Label>
                <Input
                  id="lunchEnd"
                  type="time"
                  value={formData.lunchEnd}
                  onChange={(e) => setFormData({ ...formData, lunchEnd: e.target.value })}
                  data-testid="input-lunch-end"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duração Padrão da Consulta</Label>
              <Select
                value={formData.appointmentDuration?.toString()}
                onValueChange={(value) => setFormData({ ...formData, appointmentDuration: parseInt(value) })}
              >
                <SelectTrigger data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Tratamentos Oferecidos
                </CardTitle>
                <CardDescription>
                  Selecione os tratamentos que você oferece e defina seus preços.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openNewTreatmentDialog}
                data-testid="button-new-treatment"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Tratamento
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDentistTreatments ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {allTreatments.map((treatment) => {
                  const isEnabled = enabledTreatmentIds.includes(treatment.id);
                  const price = getPriceForTreatment(treatment.id);
                  
                  return (
                    <div
                      key={treatment.id}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-md border ${
                        isEnabled ? "bg-accent/30 border-accent" : "bg-muted/30"
                      }`}
                      data-testid={`treatment-row-${treatment.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleTreatmentToggle(treatment.id, checked)}
                          data-testid={`switch-treatment-${treatment.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{treatment.name}</span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {treatment.duration} min
                            </Badge>
                          </div>
                          {treatment.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {treatment.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:w-36">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={price || ""}
                          onChange={(e) => handlePriceChange(treatment.id, e.target.value)}
                          onBlur={() => handlePriceBlur(treatment.id)}
                          placeholder="0,00"
                          disabled={!isEnabled}
                          className="h-8"
                          data-testid={`input-price-${treatment.id}`}
                        />
                      </div>

                      {isEnabled && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-legend-color-${treatment.id}`}
                            >
                              {getLegendColorForTreatment(treatment.id) ? (
                                <div 
                                  className="h-5 w-5 rounded-md border"
                                  style={{ backgroundColor: getLegendColorForTreatment(treatment.id) || undefined }}
                                />
                              ) : (
                                <Palette className="h-4 w-4" />
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="end">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Cor de Legenda</p>
                              <p className="text-xs text-muted-foreground">
                                Selecione uma cor para o odontograma
                              </p>
                              <div className="grid grid-cols-5 gap-2">
                                {legendColors.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    className={`h-8 w-8 rounded-md border-2 transition-all ${
                                      getLegendColorForTreatment(treatment.id) === color.value 
                                        ? "border-foreground ring-2 ring-offset-2 ring-foreground" 
                                        : "border-transparent"
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => updateLegendColorMutation.mutate({ 
                                      treatmentId: treatment.id, 
                                      legendColor: color.value 
                                    })}
                                    title={color.label}
                                    data-testid={`button-color-${treatment.id}-${color.label.toLowerCase()}`}
                                  />
                                ))}
                              </div>
                              {getLegendColorForTreatment(treatment.id) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full mt-2"
                                  onClick={() => updateLegendColorMutation.mutate({ 
                                    treatmentId: treatment.id, 
                                    legendColor: null 
                                  })}
                                  data-testid={`button-remove-color-${treatment.id}`}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Remover cor
                                </Button>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditTreatmentDialog(treatment)}
                          data-testid={`button-edit-treatment-${treatment.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir o tratamento "${treatment.name}"?`)) {
                              deleteTreatmentMutation.mutate(treatment.id);
                            }
                          }}
                          disabled={deleteTreatmentMutation.isPending}
                          data-testid={`button-delete-treatment-${treatment.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        {isEnabled && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {allTreatments.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum tratamento cadastrado. Clique em "Novo Tratamento" para adicionar.
                  </p>
                )}
              </div>
            )}
            
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Resumo:</strong> {enabledTreatmentIds.length} tratamento(s) ativo(s) de {allTreatments.length} disponíveis
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={treatmentDialogOpen} onOpenChange={setTreatmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editingTreatment ? "Editar Tratamento" : "Novo Tratamento"}
            </DialogTitle>
            <DialogDescription>
              {editingTreatment 
                ? "Atualize as informações do tratamento."
                : "Preencha os dados para criar um novo tratamento."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="treatment-name">Nome *</Label>
              <Input
                id="treatment-name"
                value={treatmentForm.name}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                placeholder="Ex: Limpeza Dental"
                data-testid="input-treatment-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="treatment-description">Descrição</Label>
              <Input
                id="treatment-description"
                value={treatmentForm.description}
                onChange={(e) => setTreatmentForm({ ...treatmentForm, description: e.target.value })}
                placeholder="Descrição do tratamento"
                data-testid="input-treatment-description"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="treatment-duration">Duração (minutos)</Label>
              <Select
                value={treatmentForm.duration.toString()}
                onValueChange={(value) => setTreatmentForm({ ...treatmentForm, duration: parseInt(value) })}
              >
                <SelectTrigger data-testid="select-treatment-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTreatmentDialogOpen(false)}
              data-testid="button-cancel-treatment"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveTreatment}
              disabled={createTreatmentMutation.isPending || updateTreatmentMutation.isPending}
              data-testid="button-save-treatment"
            >
              {(createTreatmentMutation.isPending || updateTreatmentMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingTreatment ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
