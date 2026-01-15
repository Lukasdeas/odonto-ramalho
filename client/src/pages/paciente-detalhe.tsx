import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Smile,
  Edit,
  Loader2,
  AlertCircle,
  Check,
  X,
  Hash,
  Receipt,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, Anamnesis, DentalRecord, AppointmentWithPatient, Budget, BudgetItem, DentistTreatmentWithDetails } from "@shared/schema";

function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return parseISO(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface BudgetWithItems extends Budget {
  items?: BudgetItem[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  completed: { label: "Concluído", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
};

export default function PacienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: patient, isLoading: patientLoading } = useQuery<Patient>({
    queryKey: ["/api/patients", id],
    enabled: !!id,
  });

  const { data: anamnesis, isLoading: anamnesisLoading } = useQuery<Anamnesis>({
    queryKey: ["/api/patients", id, "anamnesis"],
    enabled: !!id,
  });

  const { data: records } = useQuery<DentalRecord[]>({
    queryKey: ["/api/patients", id, "records"],
    enabled: !!id,
  });

  const { data: appointments } = useQuery<AppointmentWithPatient[]>({
    queryKey: ["/api/patients", id, "appointments"],
    enabled: !!id,
  });

  const { data: patientBudgets = [] } = useQuery<BudgetWithItems[]>({
    queryKey: ["/api/budgets", "patient", id],
    queryFn: async () => {
      if (!id) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/budgets?patientId=${id}&includeItems=true`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao carregar orçamentos");
      return res.json();
    },
    enabled: !!id,
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
      if (!res.ok) throw new Error("Erro ao carregar tratamentos");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const [anamnesisData, setAnamnesisData] = useState<Partial<Anamnesis>>({});

  const getTreatmentName = (treatmentId: string) => {
    return dentistTreatments.find(dt => dt.treatmentId === treatmentId)?.treatment?.name || "Tratamento";
  };

  const getTreatmentColor = (treatmentId: string) => {
    return dentistTreatments.find(dt => dt.treatmentId === treatmentId)?.legendColor || null;
  };

  const approvedBudgets = patientBudgets.filter(b => b.status === "approved" || b.status === "pending");

  const saveAnamnesisMutation = useMutation({
    mutationFn: async (data: Partial<Anamnesis>) => {
      if (anamnesis?.id) {
        return apiRequest("PATCH", `/api/anamnesis/${anamnesis.id}`, data);
      }
      return apiRequest("POST", "/api/anamnesis", { ...data, patientId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients", id, "anamnesis"] });
      toast({ title: "Anamnese salva com sucesso!" });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    },
  });

  if (patientLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <AlertCircle className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-medium">Paciente não encontrado</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/pacientes">Voltar para lista</Link>
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const currentAnamnesis = isEditing ? { ...anamnesis, ...anamnesisData } : anamnesis;

  return (
    <div className="h-full overflow-auto p-6 animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pacientes" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(patient.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-heading">{patient.name}</h1>
                <Badge variant="secondary" className="flex items-center gap-1" data-testid="badge-record-number">
                  <Hash className="h-3 w-3" />
                  {patient.recordNumber}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Cadastrado em {format(parseISO(patient.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/odontograma?patient=${id}`} data-testid="link-odontogram">
                <Smile className="mr-2 h-4 w-4" />
                Odontograma
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/prontuarios?patient=${id}`} data-testid="link-records">
                <FileText className="mr-2 h-4 w-4" />
                Prontuário
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dados" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dados" data-testid="tab-dados">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="anamnese" data-testid="tab-anamnese">Anamnese</TabsTrigger>
            <TabsTrigger value="historico" data-testid="tab-historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Informações Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{patient.cpf || "Não informado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                    <p className="font-medium">
                      {patient.birthDate
                        ? format(parseLocalDate(patient.birthDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : "Não informada"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{patient.phone || "Não informado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{patient.email || "Não informado"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">
                      {patient.address
                        ? `${patient.address}${patient.city ? `, ${patient.city}` : ""}${patient.state ? ` - ${patient.state}` : ""}${patient.zipCode ? ` | CEP: ${patient.zipCode}` : ""}`
                        : "Não informado"}
                    </p>
                  </div>
                </div>
                {patient.notes && (
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">{patient.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anamnese" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-heading">Ficha de Anamnese</CardTitle>
                  <CardDescription>Histórico de saúde do paciente</CardDescription>
                </div>
                {!isEditing ? (
                  <Button variant="outline" onClick={() => {
                    setAnamnesisData(anamnesis || {});
                    setIsEditing(true);
                  }} data-testid="button-edit-anamnesis">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button onClick={() => saveAnamnesisMutation.mutate(anamnesisData)} disabled={saveAnamnesisMutation.isPending} data-testid="button-save-anamnesis">
                      {saveAnamnesisMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {anamnesisLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">Condições de Saúde</Label>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasAllergies"
                            checked={currentAnamnesis?.hasAllergies || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasAllergies: !!checked })}
                            data-testid="checkbox-allergies"
                          />
                          <Label htmlFor="hasAllergies" className="font-normal">Possui alergias</Label>
                        </div>
                        {currentAnamnesis?.hasAllergies && (
                          <Input
                            placeholder="Descreva as alergias..."
                            value={currentAnamnesis?.allergiesDescription || ""}
                            disabled={!isEditing}
                            onChange={(e) => setAnamnesisData({ ...anamnesisData, allergiesDescription: e.target.value })}
                            data-testid="input-allergies-description"
                          />
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasMedications"
                            checked={currentAnamnesis?.hasMedications || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasMedications: !!checked })}
                            data-testid="checkbox-medications"
                          />
                          <Label htmlFor="hasMedications" className="font-normal">Usa medicamentos</Label>
                        </div>
                        {currentAnamnesis?.hasMedications && (
                          <Input
                            placeholder="Quais medicamentos..."
                            value={currentAnamnesis?.medicationsDescription || ""}
                            disabled={!isEditing}
                            onChange={(e) => setAnamnesisData({ ...anamnesisData, medicationsDescription: e.target.value })}
                            data-testid="input-medications-description"
                          />
                        )}

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasChronicDiseases"
                            checked={currentAnamnesis?.hasChronicDiseases || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasChronicDiseases: !!checked })}
                            data-testid="checkbox-chronic-diseases"
                          />
                          <Label htmlFor="hasChronicDiseases" className="font-normal">Doenças crônicas</Label>
                        </div>
                        {currentAnamnesis?.hasChronicDiseases && (
                          <Input
                            placeholder="Quais doenças..."
                            value={currentAnamnesis?.chronicDiseasesDescription || ""}
                            disabled={!isEditing}
                            onChange={(e) => setAnamnesisData({ ...anamnesisData, chronicDiseasesDescription: e.target.value })}
                            data-testid="input-chronic-description"
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <Label className="text-base font-medium">Histórico Médico</Label>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasHeartProblems"
                            checked={currentAnamnesis?.hasHeartProblems || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasHeartProblems: !!checked })}
                            data-testid="checkbox-heart"
                          />
                          <Label htmlFor="hasHeartProblems" className="font-normal">Problemas cardíacos</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasDiabetes"
                            checked={currentAnamnesis?.hasDiabetes || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasDiabetes: !!checked })}
                            data-testid="checkbox-diabetes"
                          />
                          <Label htmlFor="hasDiabetes" className="font-normal">Diabetes</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasHypertension"
                            checked={currentAnamnesis?.hasHypertension || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasHypertension: !!checked })}
                            data-testid="checkbox-hypertension"
                          />
                          <Label htmlFor="hasHypertension" className="font-normal">Hipertensão</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isPregnant"
                            checked={currentAnamnesis?.isPregnant || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, isPregnant: !!checked })}
                            data-testid="checkbox-pregnant"
                          />
                          <Label htmlFor="isPregnant" className="font-normal">Gestante</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isSmoker"
                            checked={currentAnamnesis?.isSmoker || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, isSmoker: !!checked })}
                            data-testid="checkbox-smoker"
                          />
                          <Label htmlFor="isSmoker" className="font-normal">Fumante</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasBleedingDisorder"
                            checked={currentAnamnesis?.hasBleedingDisorder || false}
                            disabled={!isEditing}
                            onCheckedChange={(checked) => setAnamnesisData({ ...anamnesisData, hasBleedingDisorder: !!checked })}
                            data-testid="checkbox-bleeding"
                          />
                          <Label htmlFor="hasBleedingDisorder" className="font-normal">Distúrbio de sangramento</Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="previousTreatments">Tratamentos Odontológicos Anteriores</Label>
                      <Textarea
                        id="previousTreatments"
                        value={currentAnamnesis?.previousDentalTreatments || ""}
                        disabled={!isEditing}
                        onChange={(e) => setAnamnesisData({ ...anamnesisData, previousDentalTreatments: e.target.value })}
                        placeholder="Descreva tratamentos anteriores..."
                        data-testid="input-previous-treatments"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="observations">Observações</Label>
                      <Textarea
                        id="observations"
                        value={currentAnamnesis?.observations || ""}
                        disabled={!isEditing}
                        onChange={(e) => setAnamnesisData({ ...anamnesisData, observations: e.target.value })}
                        placeholder="Outras observações importantes..."
                        data-testid="input-observations"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-heading flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Plano de Tratamento
                  </CardTitle>
                  <CardDescription>Orçamentos e tratamentos programados</CardDescription>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/orcamentos" data-testid="link-new-budget">
                    <Receipt className="mr-2 h-4 w-4" />
                    Ver Orçamentos
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {approvedBudgets.length > 0 ? (
                  <div className="space-y-4">
                    {approvedBudgets.map((budget) => (
                      <div key={budget.id} className="border rounded-md p-4 space-y-3" data-testid={`budget-${budget.id}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Badge className={statusLabels[budget.status]?.color || ""}>
                              {statusLabels[budget.status]?.label || budget.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Criado em {format(parseISO(budget.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <span className="font-bold">
                            R$ {(budget.totalAmount || 0).toFixed(2)}
                          </span>
                        </div>
                        
                        {budget.items && budget.items.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tratamento</TableHead>
                                <TableHead>Dente</TableHead>
                                <TableHead className="text-center">Qtd</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {budget.items.map((item) => {
                                const treatmentColor = getTreatmentColor(item.treatmentId);
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {treatmentColor && (
                                          <div
                                            className="w-3 h-3 rounded-sm border"
                                            style={{ backgroundColor: treatmentColor }}
                                          />
                                        )}
                                        {getTreatmentName(item.treatmentId)}
                                      </div>
                                    </TableCell>
                                    <TableCell>{item.toothNumber || "-"}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">R$ {(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum plano de tratamento ativo</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link href="/orcamentos">Criar Orçamento</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Consultas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {appointments && appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.slice(0, 5).map((apt) => (
                      <div key={apt.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-md">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{apt.type || "Consulta"}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseLocalDate(apt.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })} às {apt.time}
                          </p>
                        </div>
                        <Badge variant={apt.status === "completed" ? "default" : "secondary"}>
                          {apt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhuma consulta registrada</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Últimos Procedimentos</CardTitle>
              </CardHeader>
              <CardContent>
                {records && records.length > 0 ? (
                  <div className="space-y-3">
                    {records.slice(0, 5).map((record) => (
                      <div key={record.id} className="flex items-start gap-4 p-3 bg-muted/30 rounded-md">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{record.procedure}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseLocalDate(record.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          {record.description && (
                            <p className="text-sm mt-1">{record.description}</p>
                          )}
                        </div>
                        {record.teeth && (
                          <Badge variant="outline">Dente {record.teeth}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Nenhum procedimento registrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
