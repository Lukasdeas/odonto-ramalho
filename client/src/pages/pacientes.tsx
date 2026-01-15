import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  ChevronRight,
  Loader2,
  FileText,
  Smile,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Stethoscope,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, InsertPatient, User as UserType } from "@shared/schema";

type DentistUser = Omit<UserType, "password">;

const estadosBrasileiros = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export default function PacientesPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDentistId, setSelectedDentistId] = useState<string>("");
  const [formData, setFormData] = useState<InsertPatient>({
    name: "",
    cpf: "",
    birthDate: "",
    gender: undefined,
    phone: "",
    email: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("new") === "true") {
      setIsDialogOpen(true);
    }
  }, [search]);

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: dentists } = useQuery<DentistUser[]>({
    queryKey: ["/api/dentists"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      return apiRequest("POST", "/api/patients", data) as Promise<Patient>;
    },
    onSuccess: (patient: Patient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Paciente cadastrado com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
      navigate(`/pacientes/${patient.id}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: error.message,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPatient> }) => {
      return apiRequest("PATCH", `/api/patients/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Paciente atualizado com sucesso!" });
      setEditDialogOpen(false);
      setSelectedPatient(null);
      resetForm();
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
      return apiRequest("DELETE", `/api/patients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Paciente excluído com sucesso!" });
      setDeleteDialogOpen(false);
      setSelectedPatient(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async ({ patientId, newDentistId }: { patientId: string; newDentistId: string }) => {
      return apiRequest("POST", `/api/patients/${patientId}/transfer`, { newDentistId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Paciente transferido com sucesso!" });
      setTransferDialogOpen(false);
      setSelectedPatient(null);
      setSelectedDentistId("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao transferir",
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      cpf: "",
      birthDate: "",
      gender: undefined,
      phone: "",
      email: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      notes: "",
    });
  };

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = searchTerm.trim();
    if (!term) return patients;
    
    return patients.filter((p) => {
      // Search by name (case insensitive)
      if (p.name.toLowerCase().includes(term.toLowerCase())) return true;
      // Search by record number
      if (p.recordNumber != null && String(p.recordNumber).includes(term)) return true;
      return false;
    });
  }, [patients, searchTerm]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({
        variant: "destructive",
        title: "Nome é obrigatório",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !formData.name) {
      toast({
        variant: "destructive",
        title: "Nome é obrigatório",
      });
      return;
    }
    updateMutation.mutate({ id: selectedPatient.id, data: formData });
  };

  const openEditDialog = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setFormData({
      name: patient.name,
      cpf: patient.cpf || "",
      birthDate: patient.birthDate || "",
      gender: patient.gender as "male" | "female" | "other" | undefined,
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      neighborhood: patient.neighborhood || "",
      city: patient.city || "",
      state: patient.state || "",
      zipCode: patient.zipCode || "",
      notes: patient.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setDeleteDialogOpen(true);
  };

  const openTransferDialog = (patient: Patient, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setSelectedDentistId("");
    setTransferDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPatient) {
      deleteMutation.mutate(selectedPatient.id);
    }
  };

  const confirmTransfer = () => {
    if (selectedPatient && selectedDentistId) {
      transferMutation.mutate({ patientId: selectedPatient.id, newDentistId: selectedDentistId });
    }
  };

  const getDentistName = (dentistId: string | null) => {
    if (!dentistId) return null;
    const dentist = dentists?.find(d => d.id === dentistId);
    return dentist?.name || null;
  };

  const availableDentists = dentists?.filter(d => d.id !== selectedPatient?.dentistId) || [];

  return (
    <div className="h-full flex flex-col p-6 animate-fadeIn overflow-y-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">Pacientes</h1>
          <p className="text-muted-foreground">
            Gerencie os cadastros de pacientes
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-patient">
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF, telefone ou prontuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-patients"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-lg font-heading">
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              `${filteredPatients?.length || 0} pacientes`
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto h-[calc(100%-60px)]">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-md">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPatients && filteredPatients.length > 0 ? (
            <div className="divide-y">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center gap-4 p-4 text-left hover-elevate active-elevate-2 transition-colors cursor-pointer"
                  onClick={() => navigate(`/pacientes/${patient.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/pacientes/${patient.id}`)}
                  data-testid={`patient-row-${patient.id}`}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs" data-testid={`badge-record-${patient.id}`}>
                        <Hash className="h-3 w-3" />
                        {patient.recordNumber}
                      </Badge>
                      <p className="font-medium truncate">{patient.name}</p>
                      {isAdmin && patient.dentistId && (
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          <Stethoscope className="h-3 w-3" />
                          {getDentistName(patient.dentistId) || "Dentista"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {patient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </span>
                      )}
                      {patient.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {patient.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                      <a href={`/odontograma?patient=${patient.id}`} data-testid={`link-odontogram-${patient.id}`}>
                        <Smile className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" asChild onClick={(e) => e.stopPropagation()}>
                      <a href={`/prontuarios?patient=${patient.id}`} data-testid={`link-records-${patient.id}`}>
                        <FileText className="h-4 w-4" />
                      </a>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" data-testid={`button-patient-menu-${patient.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => openEditDialog(patient, e)} data-testid={`button-edit-patient-${patient.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem onClick={(e) => openTransferDialog(patient, e)} data-testid={`button-transfer-patient-${patient.id}`}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            Transferir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => openDeleteDialog(patient, e)} 
                          className="text-destructive"
                          data-testid={`button-delete-patient-${patient.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <User className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">Nenhum paciente encontrado</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Tente uma busca diferente"
                  : "Cadastre seu primeiro paciente"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Paciente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          navigate("/pacientes", { replace: true });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Novo Paciente</DialogTitle>
            <DialogDescription>
              Preencha os dados do paciente. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do paciente"
                  required
                  data-testid="input-patient-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  data-testid="input-patient-cpf"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  data-testid="input-patient-birthdate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Sexo</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: "male" | "female" | "other") => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger data-testid="select-patient-gender">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  data-testid="input-patient-phone"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-patient-email"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, complemento"
                  data-testid="input-patient-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Bairro"
                  data-testid="input-patient-neighborhood"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                  data-testid="input-patient-city"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger data-testid="select-patient-state">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBrasileiros.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                    data-testid="input-patient-zipcode"
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações gerais sobre o paciente..."
                  data-testid="input-patient-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-patient">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Paciente"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar Paciente</DialogTitle>
            <DialogDescription>
              Atualize os dados do paciente. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-name">Nome Completo *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do paciente"
                  required
                  data-testid="input-edit-patient-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cpf">CPF</Label>
                <Input
                  id="edit-cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  data-testid="input-edit-patient-cpf"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  data-testid="input-edit-patient-birthdate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gender">Sexo</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: "male" | "female" | "other") => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger data-testid="select-edit-patient-gender">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  data-testid="input-edit-patient-phone"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  data-testid="input-edit-patient-email"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-address">Endereço</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua, número, complemento"
                  data-testid="input-edit-patient-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-neighborhood">Bairro</Label>
                <Input
                  id="edit-neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Bairro"
                  data-testid="input-edit-patient-neighborhood"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city">Cidade</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Cidade"
                  data-testid="input-edit-patient-city"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-state">Estado</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger data-testid="select-edit-patient-state">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosBrasileiros.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-zipCode">CEP</Label>
                  <Input
                    id="edit-zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: formatCEP(e.target.value) })}
                    placeholder="00000-000"
                    maxLength={9}
                    data-testid="input-edit-patient-zipcode"
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações gerais sobre o paciente..."
                  data-testid="input-edit-patient-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-patient">
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Patient Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedPatient?.name}</strong>? 
              Esta ação não pode ser desfeita e todos os dados do paciente serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-patient"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Patient Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Transferir Paciente</DialogTitle>
            <DialogDescription>
              Selecione o dentista para qual deseja transferir o paciente <strong>{selectedPatient?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Dentista de Destino</Label>
              <Select value={selectedDentistId} onValueChange={setSelectedDentistId}>
                <SelectTrigger data-testid="select-transfer-dentist">
                  <SelectValue placeholder="Selecione um dentista" />
                </SelectTrigger>
                <SelectContent>
                  {availableDentists.map((dentist) => (
                    <SelectItem key={dentist.id} value={dentist.id}>
                      {dentist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmTransfer} 
              disabled={!selectedDentistId || transferMutation.isPending}
              data-testid="button-confirm-transfer-patient"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferindo...
                </>
              ) : (
                "Transferir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
