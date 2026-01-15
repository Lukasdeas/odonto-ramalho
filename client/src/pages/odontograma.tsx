import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import {
  Save,
  Loader2,
  Info,
  Stethoscope,
  X,
  Plus,
  FileText,
  ClipboardList,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Patient, ToothConditionWithTreatments, DentistTreatmentWithDetails, Treatment } from "@shared/schema";
import { toothConditionColors } from "@shared/schema";

const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const surfaces = [
  { value: "oclusal", label: "Oclusal" },
  { value: "mesial", label: "Mesial" },
  { value: "distal", label: "Distal" },
  { value: "vestibular", label: "Vestibular" },
  { value: "lingual", label: "Lingual" },
];

interface SelectedTreatment {
  treatmentId: string;
  treatmentName: string;
  surfaces: string[];
  notes: string;
}

function ToothSVG({ 
  number, 
  condition, 
  hasTreatments,
  isSelected, 
  onClick 
}: { 
  number: number; 
  condition?: string;
  hasTreatments?: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const colorInfo = toothConditionColors[condition || "healthy"];
  const isMolar = number % 10 >= 6;
  const isPremolar = number % 10 >= 4 && number % 10 <= 5;
  const isCanine = number % 10 === 3;
  
  let toothShape;
  if (isMolar) {
    toothShape = (
      <path
        d="M8 4C6 4 4 6 4 10C4 14 5 18 8 20C10 22 14 22 16 20C19 18 20 14 20 10C20 6 18 4 16 4C14 4 10 4 8 4Z"
        fill={colorInfo.bg}
        stroke={isSelected ? "hsl(var(--primary))" : condition !== "healthy" ? "currentColor" : "#CBD5E1"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
    );
  } else if (isPremolar) {
    toothShape = (
      <path
        d="M9 4C7 4 5 6 5 10C5 14 6 18 9 20C11 21 13 21 15 20C18 18 19 14 19 10C19 6 17 4 15 4C13 4 11 4 9 4Z"
        fill={colorInfo.bg}
        stroke={isSelected ? "hsl(var(--primary))" : condition !== "healthy" ? "currentColor" : "#CBD5E1"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
    );
  } else if (isCanine) {
    toothShape = (
      <path
        d="M12 4C9 4 7 7 7 12C7 17 9 20 12 22C15 20 17 17 17 12C17 7 15 4 12 4Z"
        fill={colorInfo.bg}
        stroke={isSelected ? "hsl(var(--primary))" : condition !== "healthy" ? "currentColor" : "#CBD5E1"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
    );
  } else {
    toothShape = (
      <path
        d="M10 4C8 4 6 6 6 10C6 15 7 19 10 21C12 22 12 22 14 21C17 19 18 15 18 10C18 6 16 4 14 4C12 4 12 4 10 4Z"
        fill={colorInfo.bg}
        stroke={isSelected ? "hsl(var(--primary))" : condition !== "healthy" ? "currentColor" : "#CBD5E1"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
    );
  }

  return (
    <button
      onClick={onClick}
      className={`tooth relative group ${isSelected ? "selected" : ""}`}
      data-testid={`tooth-${number}`}
    >
      <svg
        viewBox="0 0 24 26"
        className="w-10 h-12 sm:w-12 sm:h-14"
        style={{ color: colorInfo.bg === "#FFFFFF" ? "#94A3B8" : colorInfo.bg }}
      >
        {toothShape}
      </svg>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
        {number}
      </span>
      {condition && condition !== "healthy" && (
        <span 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
          style={{ backgroundColor: colorInfo.bg }}
        />
      )}
      {hasTreatments && (
        <span 
          className="absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-background bg-primary"
        />
      )}
    </button>
  );
}

export default function OdontogramaPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialPatientId = params.get("patient") || "";
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    condition: "healthy",
    surfaces: [] as string[],
    notes: "",
  });
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([]);
  const [showAddTreatment, setShowAddTreatment] = useState(false);
  const [newTreatment, setNewTreatment] = useState({
    treatmentId: "",
    surfaces: [] as string[],
    notes: "",
  });
  const [treatmentPlanNotes, setTreatmentPlanNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: conditions } = useQuery<ToothConditionWithTreatments[]>({
    queryKey: ["/api/odontogram", selectedPatientId, "with-treatments"],
    queryFn: async () => {
      if (!selectedPatientId) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/odontogram/${selectedPatientId}/with-treatments`, { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao carregar odontograma");
      return res.json();
    },
    enabled: !!selectedPatientId,
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

  const treatmentsWithColors = useMemo(() => {
    return dentistTreatments.filter(dt => dt.legendColor);
  }, [dentistTreatments]);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      patientId: string;
      toothNumber: number;
      condition: string;
      surface: string;
      notes: string;
      treatments: { treatmentId: string; surface: string; notes: string }[];
    }) => {
      return apiRequest("POST", "/api/odontogram/save-with-treatments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/odontogram", selectedPatientId, "with-treatments"] });
      toast({ title: "Condição salva com sucesso!" });
      setIsDialogOpen(false);
      setSelectedTooth(null);
      setFormData({ condition: "healthy", surfaces: [], notes: "" });
      setSelectedTreatments([]);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    },
  });

  const conditionsByTooth = useMemo(() => {
    const map: Record<number, ToothConditionWithTreatments> = {};
    conditions?.forEach((c) => {
      map[c.toothNumber] = c;
    });
    return map;
  }, [conditions]);

  const handleToothClick = (toothNumber: number) => {
    if (!selectedPatientId) {
      toast({
        variant: "destructive",
        title: "Selecione um paciente primeiro",
      });
      return;
    }
    
    setSelectedTooth(toothNumber);
    const existing = conditionsByTooth[toothNumber];
    if (existing) {
      const surfaceList = existing.surface ? existing.surface.split(",").map(s => s.trim().toLowerCase()) : [];
      setFormData({
        condition: existing.condition,
        surfaces: surfaceList,
        notes: existing.notes || "",
      });
      const existingTreatments: SelectedTreatment[] = existing.treatments?.map(t => ({
        treatmentId: t.treatmentId,
        treatmentName: t.treatment.name,
        surfaces: t.surface ? t.surface.split(",").map(s => s.trim().toLowerCase()) : [],
        notes: t.notes || "",
      })) || [];
      setSelectedTreatments(existingTreatments);
    } else {
      setFormData({ condition: "healthy", surfaces: [], notes: "" });
      setSelectedTreatments([]);
    }
    setShowAddTreatment(false);
    setNewTreatment({ treatmentId: "", surfaces: [], notes: "" });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedTooth || !selectedPatientId) return;
    
    const treatmentsToSave = selectedTreatments.map(t => ({
      treatmentId: t.treatmentId,
      surface: t.surfaces.join(", "),
      notes: t.notes,
    }));
    
    saveMutation.mutate({
      patientId: selectedPatientId,
      toothNumber: selectedTooth,
      condition: formData.condition,
      surface: formData.surfaces.join(", "),
      notes: formData.notes,
      treatments: treatmentsToSave,
    });
  };

  const handleAddTreatment = () => {
    if (!newTreatment.treatmentId) return;
    
    const treatment = dentistTreatments.find(t => t.treatmentId === newTreatment.treatmentId);
    if (!treatment) return;
    
    setSelectedTreatments([...selectedTreatments, {
      treatmentId: newTreatment.treatmentId,
      treatmentName: treatment.treatment.name,
      surfaces: newTreatment.surfaces,
      notes: newTreatment.notes,
    }]);
    setNewTreatment({ treatmentId: "", surfaces: [], notes: "" });
    setShowAddTreatment(false);
  };

  const handleRemoveTreatment = (index: number) => {
    setSelectedTreatments(selectedTreatments.filter((_, i) => i !== index));
  };

  const toggleSurface = (surface: string, list: string[], setList: (surfaces: string[]) => void) => {
    if (list.includes(surface)) {
      setList(list.filter(s => s !== surface));
    } else {
      setList([...list, surface]);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    const term = searchTerm.trim();
    if (!term) return patients;
    
    return patients.filter((p) => {
      if (p.name.toLowerCase().includes(term.toLowerCase())) return true;
      if (p.recordNumber != null && String(p.recordNumber).includes(term)) return true;
      return false;
    });
  }, [patients, searchTerm]);

  const selectedPatient = patients?.find((p) => p.id === selectedPatientId);

  useEffect(() => {
    if (selectedPatient) {
      setTreatmentPlanNotes(selectedPatient.treatmentPlanNotes || "");
    } else {
      setTreatmentPlanNotes("");
    }
  }, [selectedPatient]);

  const saveTreatmentPlanNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!selectedPatientId) return;
      return apiRequest("PATCH", `/api/patients/${selectedPatientId}`, {
        treatmentPlanNotes: notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "Observações salvas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro ao salvar observações",
        description: error.message,
      });
    },
  });

  const handleSaveTreatmentPlanNotes = async () => {
    if (!selectedPatientId) {
      toast({
        variant: "destructive",
        title: "Selecione um paciente primeiro",
      });
      return;
    }
    setIsSavingNotes(true);
    await saveTreatmentPlanNotesMutation.mutateAsync(treatmentPlanNotes);
    setIsSavingNotes(false);
  };

  const registeredConditions = useMemo(() => {
    if (!conditions) return [];
    return conditions.filter(c => {
      if (c.condition !== "healthy") return true;
      if (c.treatments && c.treatments.length > 0) return true;
      if (c.notes && c.notes.trim()) return true;
      if (c.surface && c.surface.trim()) return true;
      return false;
    });
  }, [conditions]);

  const [, navigate] = useLocation();

  const allTreatmentsFromConditions = useMemo(() => {
    const items: { treatmentId: string; toothNumber: number; treatmentName: string }[] = [];
    registeredConditions.forEach(c => {
      if (c.treatments && c.treatments.length > 0) {
        c.treatments.forEach(t => {
          items.push({
            treatmentId: t.treatmentId,
            toothNumber: c.toothNumber,
            treatmentName: t.treatment.name,
          });
        });
      }
    });
    return items;
  }, [registeredConditions]);

  const handleGenerateBudgetDraft = () => {
    if (!selectedPatientId) {
      toast({
        variant: "destructive",
        title: "Selecione um paciente primeiro",
      });
      return;
    }

    if (allTreatmentsFromConditions.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum tratamento registrado",
        description: "Registre tratamentos nos dentes antes de gerar o orçamento.",
      });
      return;
    }

    const budgetItems = allTreatmentsFromConditions.map(item => {
      const dentistTreatment = dentistTreatments.find(dt => dt.treatmentId === item.treatmentId);
      return {
        treatmentId: item.treatmentId,
        toothNumber: item.toothNumber,
        quantity: 1,
        unitPrice: dentistTreatment?.price || 0,
      };
    });

    localStorage.setItem("odontogramBudgetDraft", JSON.stringify({
      patientId: selectedPatientId,
      items: budgetItems,
    }));

    toast({ title: "Rascunho gerado!", description: "Redirecionando para orçamentos..." });
    navigate("/orcamentos?fromOdontogram=true");
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col p-6 animate-fadeIn">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-heading">Odontograma</h1>
            <p className="text-muted-foreground">
              Mapeie as condições dentárias do paciente
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        <Card className="flex-1">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-heading">Mapa Dental</CardTitle>
                <CardDescription>
                  {selectedPatient
                    ? `Paciente: ${selectedPatient.name}`
                    : "Selecione um paciente para começar"}
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger data-testid="select-patient">
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2" onKeyDown={(e) => e.stopPropagation()}>
                      <Input
                        placeholder="Buscar por nome ou prontuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3 text-center">Arcada Superior</p>
                <div className="flex justify-center gap-1 flex-wrap">
                  {upperTeeth.map((tooth) => (
                    <ToothSVG
                      key={tooth}
                      number={tooth}
                      condition={conditionsByTooth[tooth]?.condition}
                      hasTreatments={(conditionsByTooth[tooth]?.treatments?.length || 0) > 0}
                      isSelected={selectedTooth === tooth}
                      onClick={() => handleToothClick(tooth)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="border-t border-dashed" />
              
              <div>
                <div className="flex justify-center gap-1 flex-wrap">
                  {lowerTeeth.map((tooth) => (
                    <ToothSVG
                      key={tooth}
                      number={tooth}
                      condition={conditionsByTooth[tooth]?.condition}
                      hasTreatments={(conditionsByTooth[tooth]?.treatments?.length || 0) > 0}
                      isSelected={selectedTooth === tooth}
                      onClick={() => handleToothClick(tooth)}
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-muted-foreground mt-3 text-center">Arcada Inferior</p>
              </div>

              {selectedPatientId && (
                <div className="border-t pt-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Observações do Plano de Tratamento
                    </Label>
                    <Button
                      size="sm"
                      onClick={handleSaveTreatmentPlanNotes}
                      disabled={isSavingNotes}
                      data-testid="button-save-treatment-notes"
                    >
                      {isSavingNotes ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                  <Textarea
                    value={treatmentPlanNotes}
                    onChange={(e) => setTreatmentPlanNotes(e.target.value)}
                    placeholder="Adicione observações detalhadas sobre o plano de tratamento do paciente..."
                    className="min-h-[120px] resize-y"
                    data-testid="textarea-treatment-plan-notes"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Info className="h-5 w-5" />
                Legenda de Condições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(toothConditionColors).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: value.bg }}
                    />
                    <span className="text-sm">{value.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {treatmentsWithColors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Tratamentos
                </CardTitle>
                <CardDescription>
                  Tratamentos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {treatmentsWithColors.map((dt) => (
                    <div 
                      key={dt.id} 
                      className="flex items-center gap-3"
                      data-testid={`legend-treatment-${dt.treatmentId}`}
                    >
                      <div
                        className="w-4 h-4 rounded-md border"
                        style={{ backgroundColor: dt.legendColor || undefined }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{dt.treatment.name}</span>
                        {dt.price > 0 && (
                          <span className="text-xs text-muted-foreground">
                            R$ {dt.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedPatientId && registeredConditions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Condições Registradas
                    </CardTitle>
                    <CardDescription>
                      {registeredConditions.length} dente(s) com registro
                    </CardDescription>
                  </div>
                  {allTreatmentsFromConditions.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleGenerateBudgetDraft}
                      data-testid="button-generate-budget"
                    >
                      <Receipt className="h-4 w-4 mr-1" />
                      Gerar Orçamento
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-80">
                  <div className="p-4 space-y-3">
                    {registeredConditions.map((c) => (
                      <button
                        key={c.id}
                        className="w-full p-3 rounded-lg border bg-card hover-elevate text-left transition-all"
                        onClick={() => handleToothClick(c.toothNumber)}
                        data-testid={`condition-card-${c.toothNumber}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: toothConditionColors[c.condition]?.bg }}
                            />
                            <span className="font-semibold">Dente {c.toothNumber}</span>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {toothConditionColors[c.condition]?.label}
                          </Badge>
                        </div>
                        
                        {c.surface && (
                          <div className="flex items-center gap-1 mb-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Faces:</span>
                            {c.surface.split(",").map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs capitalize">
                                {s.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {c.treatments && c.treatments.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                              <Stethoscope className="h-3 w-3" />
                              Tratamentos:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {c.treatments.map((t, i) => (
                                <Badge key={i} className="text-xs bg-primary/10 text-primary hover:bg-primary/20">
                                  {t.treatment.name}
                                  {t.surface && (
                                    <span className="ml-1 opacity-70">({t.surface})</span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {c.notes && (
                          <div className="flex items-start gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-2">{c.notes}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
        </div>
      </ScrollArea>

    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Dente {selectedTooth}
            </DialogTitle>
            <DialogDescription>
              Registre a condição e tratamentos deste dente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Condição</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger data-testid="select-condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(toothConditionColors).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: value.bg }}
                        />
                        {value.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Faces Afetadas</Label>
              <div className="flex flex-wrap gap-2">
                {surfaces.map((surface) => (
                  <label
                    key={surface.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={formData.surfaces.includes(surface.value)}
                      onCheckedChange={() => toggleSurface(
                        surface.value,
                        formData.surfaces,
                        (surfaces) => setFormData({ ...formData, surfaces })
                      )}
                      data-testid={`checkbox-surface-${surface.value}`}
                    />
                    <span className="text-sm">{surface.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas sobre este dente..."
                data-testid="input-tooth-notes"
              />
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Tratamentos</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddTreatment(true)}
                  data-testid="button-add-treatment"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>

              {selectedTreatments.length > 0 && (
                <div className="space-y-2">
                  {selectedTreatments.map((t, index) => (
                    <div
                      key={index}
                      className="flex items-start justify-between gap-2 p-3 rounded-lg bg-muted/50 border"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{t.treatmentName}</p>
                        {t.surfaces.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Faces: {t.surfaces.map(s => surfaces.find(sf => sf.value === s)?.label || s).join(", ")}
                          </p>
                        )}
                        {t.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveTreatment(index)}
                        data-testid={`button-remove-treatment-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {showAddTreatment && (
                <div className="p-3 rounded-lg bg-muted/30 border space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Tratamento</Label>
                    <Select
                      value={newTreatment.treatmentId}
                      onValueChange={(value) => setNewTreatment({ ...newTreatment, treatmentId: value })}
                    >
                      <SelectTrigger data-testid="select-new-treatment">
                        <SelectValue placeholder="Selecione um tratamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {dentistTreatments.map((dt) => (
                          <SelectItem key={dt.treatmentId} value={dt.treatmentId}>
                            <div className="flex items-center justify-between gap-4 w-full">
                              <span>{dt.treatment.name}</span>
                              {dt.price > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  R$ {dt.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Faces (opcional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {surfaces.map((surface) => (
                        <label
                          key={surface.value}
                          className="flex items-center gap-1 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={newTreatment.surfaces.includes(surface.value)}
                            onCheckedChange={() => toggleSurface(
                              surface.value,
                              newTreatment.surfaces,
                              (surfaces) => setNewTreatment({ ...newTreatment, surfaces })
                            )}
                          />
                          {surface.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Observação (opcional)</Label>
                    <Input
                      value={newTreatment.notes}
                      onChange={(e) => setNewTreatment({ ...newTreatment, notes: e.target.value })}
                      placeholder="Observação do tratamento..."
                      data-testid="input-treatment-notes"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddTreatment(false);
                        setNewTreatment({ treatmentId: "", surfaces: [], notes: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddTreatment}
                      disabled={!newTreatment.treatmentId}
                      data-testid="button-confirm-add-treatment"
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}

              {selectedTreatments.length === 0 && !showAddTreatment && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum tratamento adicionado
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-tooth">
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
