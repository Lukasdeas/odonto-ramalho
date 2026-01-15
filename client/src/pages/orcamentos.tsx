import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { jsPDF } from "jspdf";
import {
  Search,
  Plus,
  FileText,
  Loader2,
  Trash2,
  Eye,
  Calendar,
  User,
  DollarSign,
  Check,
  Clock,
  X,
  Edit,
  Save,
  Download,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import type { Patient, Budget, BudgetItem, DentistTreatmentWithDetails, DentistSettings } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import topoImage from "@assets/topo_1767890454037.png";
import footerImage from "@/assets/footer_1767891482274.png";
import fundoImage from "@assets/fundo_1767890454037.png";

const PRIMARY_COLOR = { r: 114, g: 47, b: 55 };

const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const LEFT_MARGIN = 15;
const RIGHT_MARGIN = 15;
const TOP_MARGIN = 10;
const BOTTOM_MARGIN = 10;
const HEADER_HEIGHT = 22;
const FOOTER_HEIGHT = 14;
const CONTENT_WIDTH = A4_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

let topoBase64: string | null = null;
let footerBase64: string | null = null;
let fundoBase64: string | null = null;

async function loadImageAsBase64(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

async function loadAllBudgetImages(): Promise<{topo: string, footer: string, fundo: string}> {
  if (!topoBase64) topoBase64 = await loadImageAsBase64(topoImage);
  if (!footerBase64) footerBase64 = await loadImageAsBase64(footerImage);
  if (!fundoBase64) fundoBase64 = await loadImageAsBase64(fundoImage);
  return { topo: topoBase64, footer: footerBase64, fundo: fundoBase64 };
}

function createA4PDF(): jsPDF {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });
}

function addBudgetHeader(doc: jsPDF, topoData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.addImage(topoData, "PNG", 0, 0, pageWidth, HEADER_HEIGHT);
  return HEADER_HEIGHT + TOP_MARGIN;
}

function addBudgetFooter(doc: jsPDF, footerData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.addImage(footerData, "PNG", 0, pageHeight - FOOTER_HEIGHT, pageWidth, FOOTER_HEIGHT);
}

function addBudgetWatermark(doc: jsPDF, fundoData: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const watermarkWidth = pageWidth * 0.35;
  const watermarkHeight = watermarkWidth;
  const contentTop = HEADER_HEIGHT;
  const contentBottom = pageHeight - FOOTER_HEIGHT;
  const contentHeight = contentBottom - contentTop;
  const watermarkX = (pageWidth - watermarkWidth) / 2;
  const watermarkY = contentTop + (contentHeight - watermarkHeight) / 2;
  doc.addImage(fundoData, "PNG", watermarkX, watermarkY, watermarkWidth, watermarkHeight);
}

function addBudgetSignatureFields(doc: jsPDF, y: number, patientName: string, dentistName: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const minSignatureY = y + 20;
  const maxSignatureY = pageHeight - FOOTER_HEIGHT - BOTTOM_MARGIN - 25;
  const signatureY = Math.max(minSignatureY, Math.min(y + 30, maxSignatureY));

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const leftX = LEFT_MARGIN + 45;
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(leftX - 35, signatureY, leftX + 35, signatureY);
  doc.text("Paciente", leftX, signatureY + 5, { align: "center" });

  const rightX = pageWidth - RIGHT_MARGIN - 45;
  doc.line(rightX - 35, signatureY, rightX + 35, signatureY);
  doc.text("Profissional", rightX, signatureY + 5, { align: "center" });

  return signatureY + 15;
}

interface BudgetWithDetails extends Budget {
  patient?: Patient;
  items?: BudgetItem[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  completed: { label: "Concluído", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  unpaid: { label: "Não pago", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  partial: { label: "Parcial", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferência" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Outro" },
];

export default function OrcamentosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithDetails | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [budgetItems, setBudgetItems] = useState<{ treatmentId: string; toothNumber?: number; quantity: number; unitPrice: number }[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editDiscountType, setEditDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [editItems, setEditItems] = useState<BudgetItem[]>([]);
  const [newEditItem, setNewEditItem] = useState<{ treatmentId: string; toothNumber?: number; quantity: number; unitPrice: number } | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [paymentDescription, setPaymentDescription] = useState<string>("");

  const { data: patients = [] } = useQuery<Patient[]>({
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

  const { data: budgets = [], isLoading } = useQuery<BudgetWithDetails[]>({
    queryKey: ["/api/budgets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/budgets?dentistId=${user.id}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erro ao carregar orçamentos");
      return res.json();
    },
    enabled: !!user?.id,
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

  const { data: dentistSettings } = useQuery<DentistSettings>({
    queryKey: ["/api/dentist-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/dentist-settings/${user.id}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (params.get("fromOdontogram") === "true") {
      const draftData = localStorage.getItem("odontogramBudgetDraft");
      if (draftData) {
        try {
          const { patientId, items } = JSON.parse(draftData);
          setSelectedPatientId(patientId);
          setBudgetItems(items);
          setIsCreateDialogOpen(true);
          localStorage.removeItem("odontogramBudgetDraft");
          toast({ title: "Rascunho carregado do odontograma" });
        } catch (e) {
          console.error("Erro ao carregar rascunho do odontograma:", e);
        }
      }
      window.history.replaceState({}, "", "/orcamentos");
    }
  }, [searchParams, toast]);

  const createBudgetMutation = useMutation({
    mutationFn: async (data: { patientId: string; dentistId: string; items: typeof budgetItems; discount: number }) => {
      const budget = await apiRequest<Budget>("POST", "/api/budgets", {
        patientId: data.patientId,
        dentistId: data.dentistId,
        status: "draft",
        discount: data.discount,
      });
      
      for (const item of data.items) {
        await apiRequest("POST", "/api/budget-items", {
          budgetId: budget.id,
          treatmentId: item.treatmentId,
          toothNumber: item.toothNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }
      
      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Orçamento criado com sucesso!" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao criar orçamento", description: error.message });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ budgetId, status }: { budgetId: string; status: string }) => {
      return apiRequest("PATCH", `/api/budgets/${budgetId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Status atualizado!" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao atualizar status", description: error.message });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      return apiRequest("DELETE", `/api/budgets/${budgetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Orçamento excluído!" });
      setIsViewDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: { budgetId: string; treatmentId: string; toothNumber?: number; quantity: number; unitPrice: number }) => {
      return apiRequest("POST", "/api/budget-items", data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Item adicionado!" });
      if (selectedBudget) {
        await refreshBudgetItems(selectedBudget.id);
      }
      setNewEditItem(null);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao adicionar item", description: error.message });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("DELETE", `/api/budget-items/${itemId}`);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Item removido!" });
      if (selectedBudget) {
        await refreshBudgetItems(selectedBudget.id);
      }
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao remover item", description: error.message });
    },
  });

  const updateBudgetTotalMutation = useMutation({
    mutationFn: async ({ budgetId, totalAmount }: { budgetId: string; totalAmount: number }) => {
      return apiRequest("PATCH", `/api/budgets/${budgetId}`, { totalAmount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
  });

  const updateBudgetDiscountMutation = useMutation({
    mutationFn: async ({ budgetId, discount }: { budgetId: string; discount: number }) => {
      return apiRequest("PATCH", `/api/budgets/${budgetId}`, { discount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      toast({ title: "Desconto atualizado!" });
      if (selectedBudget) {
        setSelectedBudget(prev => prev ? { ...prev, discount } : null);
      }
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao atualizar desconto", description: error.message });
    },
  });

  const registerPaymentMutation = useMutation({
    mutationFn: async ({ budgetId, amount, paymentMethod, description }: { budgetId: string; amount: number; paymentMethod: string; description?: string }) => {
      return apiRequest("POST", `/api/budgets/${budgetId}/payments`, { amount, paymentMethod, description });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      toast({ title: "Pagamento registrado com sucesso!" });
      setIsPaymentDialogOpen(false);
      setPaymentAmount(0);
      setPaymentMethod("pix");
      setPaymentDescription("");
      // Update selected budget with new payment info
      if (selectedBudget && data.budget) {
        setSelectedBudget(prev => prev ? { ...prev, paidAmount: data.budget.paidAmount, paymentStatus: data.budget.paymentStatus } : null);
      }
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Erro ao registrar pagamento", description: error.message });
    },
  });

  const refreshBudgetItems = async (budgetId: string) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/budgets/${budgetId}/items`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const items = await res.json();
      setSelectedBudget(prev => prev ? { ...prev, items } : null);
      const total = items.reduce((sum: number, item: BudgetItem) => sum + (item.quantity * item.unitPrice), 0);
      updateBudgetTotalMutation.mutate({ budgetId, totalAmount: total });
    }
  };

  const resetForm = () => {
    setSelectedPatientId("");
    setBudgetItems([]);
    setDiscount(0);
    setDiscountType("percentage");
  };

  const addTreatmentItem = (treatmentId: string) => {
    const treatment = dentistTreatments.find(dt => dt.treatmentId === treatmentId);
    if (!treatment) return;
    
    setBudgetItems([...budgetItems, {
      treatmentId,
      quantity: 1,
      unitPrice: treatment.price || 0,
    }]);
  };

  const removeTreatmentItem = (index: number) => {
    setBudgetItems(budgetItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...budgetItems];
    updated[index].quantity = quantity;
    setBudgetItems(updated);
  };

  const updateItemToothNumber = (index: number, toothNumber: number | undefined) => {
    const updated = [...budgetItems];
    updated[index].toothNumber = toothNumber;
    setBudgetItems(updated);
  };

  const calculateSubtotal = () => {
    return budgetItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateDiscountAmount = (subtotal: number, discountValue: number, type: "percentage" | "fixed") => {
    if (type === "percentage") {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount(subtotal, discount, discountType);
    return subtotal - discountAmount;
  };

  const handleCreateBudget = () => {
    if (!selectedPatientId) {
      toast({ variant: "destructive", title: "Selecione um paciente" });
      return;
    }
    if (budgetItems.length === 0) {
      toast({ variant: "destructive", title: "Adicione pelo menos um tratamento ao orçamento" });
      return;
    }
    if (!user?.id) return;
    
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount(subtotal, discount, discountType);
    
    createBudgetMutation.mutate({
      patientId: selectedPatientId,
      dentistId: user.id,
      items: budgetItems,
      discount: discountAmount,
    });
  };

  const viewBudgetDetails = async (budget: BudgetWithDetails) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`/api/budgets/${budget.id}/items`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const items = await res.json();
      setSelectedBudget({ ...budget, items });
      setEditDiscount(budget.discount || 0);
      setEditDiscountType("fixed");
      if (budget.status === "draft") {
        setIsEditMode(true);
      }
      setIsViewDialogOpen(true);
    }
  };

  const filteredBudgets = useMemo(() => {
    const term = searchTerm.trim();
    return budgets.filter(budget => {
      const patient = patients.find(p => p.id === budget.patientId);
      let matchesSearch = true;
      if (term) {
        // Search by name (case insensitive)
        const matchesName = patient?.name.toLowerCase().includes(term.toLowerCase()) || false;
        // Search by record number
        const matchesRecord = patient?.recordNumber != null && String(patient.recordNumber).includes(term);
        matchesSearch = matchesName || matchesRecord;
      }
      const matchesStatus = statusFilter === "all" || budget.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [budgets, patients, searchTerm, statusFilter]);

  const getPatientName = (patientId: string) => {
    return patients.find(p => p.id === patientId)?.name || "Paciente não encontrado";
  };

  const getTreatmentName = (treatmentId: string) => {
    return dentistTreatments.find(dt => dt.treatmentId === treatmentId)?.treatment?.name || "Tratamento";
  };

  const generateBudgetPDF = async () => {
    if (!selectedBudget || !selectedBudget.items) {
      toast({ variant: "destructive", title: "Erro ao gerar PDF", description: "Dados do orçamento não encontrados" });
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const images = await loadAllBudgetImages();
      const doc = createA4PDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      addBudgetWatermark(doc, images.fundo);
      let y = addBudgetHeader(doc, images.topo);

      const patient = patients.find(p => p.id === selectedBudget.patientId);
      const dentistName = dentistSettings?.clinicName || user?.name || "Profissional";

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
      doc.text("ORÇAMENTO ODONTOLÓGICO", pageWidth / 2, y, { align: "center" });
      y += 12;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Data: ${format(new Date(selectedBudget.createdAt), "dd/MM/yyyy", { locale: ptBR })}`, LEFT_MARGIN, y);
      y += 6;
      
      if (selectedBudget.validUntil) {
        doc.text(`Válido até: ${format(new Date(selectedBudget.validUntil), "dd/MM/yyyy", { locale: ptBR })}`, LEFT_MARGIN, y);
        y += 6;
      }
      y += 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
      doc.text("DADOS DO PACIENTE", LEFT_MARGIN, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      doc.text(`Nome: ${patient?.name || "Não informado"}`, LEFT_MARGIN, y);
      y += 5;
      
      if (patient?.cpf) {
        doc.text(`CPF: ${patient.cpf}`, LEFT_MARGIN, y);
        y += 5;
      }
      
      if (patient?.phone) {
        doc.text(`Telefone: ${patient.phone}`, LEFT_MARGIN, y);
        y += 5;
      }
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
      doc.text("PLANO DE TRATAMENTO", LEFT_MARGIN, y);
      y += 8;

      const colWidths = {
        item: 12,
        treatment: 75,
        tooth: 20,
        qty: 15,
        unitPrice: 28,
        total: 30,
      };

      doc.setFillColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
      doc.rect(LEFT_MARGIN, y - 4, CONTENT_WIDTH, 7, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      
      let xPos = LEFT_MARGIN + 2;
      doc.text("Item", xPos, y);
      xPos += colWidths.item;
      doc.text("Tratamento", xPos, y);
      xPos += colWidths.treatment;
      doc.text("Dente", xPos, y);
      xPos += colWidths.tooth;
      doc.text("Qtd", xPos, y);
      xPos += colWidths.qty;
      doc.text("Valor Unit.", xPos, y);
      xPos += colWidths.unitPrice;
      doc.text("Total", xPos, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);

      selectedBudget.items.forEach((item, index) => {
        const treatmentName = getTreatmentName(item.treatmentId);
        const itemTotal = item.quantity * item.unitPrice;
        
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(LEFT_MARGIN, y - 3, CONTENT_WIDTH, 6, "F");
        }

        xPos = LEFT_MARGIN + 2;
        doc.text(String(index + 1), xPos, y);
        xPos += colWidths.item;
        
        const truncatedName = treatmentName.length > 35 ? treatmentName.substring(0, 32) + "..." : treatmentName;
        doc.text(truncatedName, xPos, y);
        xPos += colWidths.treatment;
        
        doc.text(item.toothNumber ? String(item.toothNumber) : "-", xPos, y);
        xPos += colWidths.tooth;
        
        doc.text(String(item.quantity), xPos, y);
        xPos += colWidths.qty;
        
        doc.text(`R$ ${item.unitPrice.toFixed(2)}`, xPos, y);
        xPos += colWidths.unitPrice;
        
        doc.text(`R$ ${itemTotal.toFixed(2)}`, xPos, y);
        y += 6;
      });

      y += 6;

      const subtotal = selectedBudget.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const discountAmount = selectedBudget.discount || 0;
      const total = subtotal - discountAmount;

      const summaryX = pageWidth - RIGHT_MARGIN - 60;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Subtotal:", summaryX, y);
      doc.text(`R$ ${subtotal.toFixed(2)}`, summaryX + 55, y, { align: "right" });
      y += 5;

      if (discountAmount > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text("Desconto:", summaryX, y);
        doc.text(`-R$ ${discountAmount.toFixed(2)}`, summaryX + 55, y, { align: "right" });
        y += 5;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(summaryX, y, summaryX + 55, y);
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
      doc.text("TOTAL:", summaryX, y);
      doc.text(`R$ ${total.toFixed(2)}`, summaryX + 55, y, { align: "right" });
      y += 15;

      if (selectedBudget.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(PRIMARY_COLOR.r, PRIMARY_COLOR.g, PRIMARY_COLOR.b);
        doc.text("OBSERVAÇÕES:", LEFT_MARGIN, y);
        y += 5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(selectedBudget.notes, CONTENT_WIDTH);
        doc.text(splitNotes, LEFT_MARGIN, y);
        y += splitNotes.length * 4 + 10;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const termsText = "Declaro que recebi todas as informações sobre os procedimentos propostos, incluindo riscos, benefícios e alternativas de tratamento. Concordo com os valores apresentados e autorizo a realização dos procedimentos após a aprovação deste orçamento.";
      const splitTerms = doc.splitTextToSize(termsText, CONTENT_WIDTH);
      doc.text(splitTerms, LEFT_MARGIN, y);
      y += splitTerms.length * 4 + 5;

      addBudgetSignatureFields(doc, y, patient?.name || "Paciente", dentistName);
      addBudgetFooter(doc, images.footer);

      const patientNameForFile = (patient?.name || "paciente").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      doc.save(`orcamento_${patientNameForFile}_${format(new Date(), "ddMMyyyy")}.pdf`);
      
      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ variant: "destructive", title: "Erro ao gerar PDF", description: "Tente novamente" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col p-6 animate-fadeIn">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold font-heading">Orçamentos</h1>
              <p className="text-muted-foreground">
                Gerencie orçamentos e planos de tratamento
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-budget">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-heading">Lista de Orçamentos</CardTitle>
                  <CardDescription>
                    {filteredBudgets.length} orçamento(s) encontrado(s)
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por paciente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-60"
                      data-testid="input-search-budget"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Filtrar status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBudgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum orçamento encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgets.map((budget) => {
                      const totalDue = (budget.totalAmount || 0) - (budget.discount || 0);
                      const paidAmount = (budget as any).paidAmount || 0;
                      const paymentStatus = (budget as any).paymentStatus || "unpaid";
                      return (
                      <TableRow key={budget.id} data-testid={`row-budget-${budget.id}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {getPatientName(budget.patientId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(budget.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusLabels[budget.status]?.color || ""}>
                            {statusLabels[budget.status]?.label || budget.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={paymentStatusLabels[paymentStatus]?.color || ""}>
                              {paymentStatusLabels[paymentStatus]?.label || paymentStatus}
                            </Badge>
                            {paidAmount > 0 && paidAmount < totalDue && (
                              <span className="text-xs text-muted-foreground">
                                R$ {paidAmount.toFixed(2)} / {totalDue.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              R$ {totalDue.toFixed(2)}
                            </div>
                            {(budget.discount || 0) > 0 && (
                              <span className="text-xs text-green-600 dark:text-green-400">
                                (-R$ {(budget.discount || 0).toFixed(2)} desc.)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewBudgetDetails(budget)}
                              data-testid={`button-view-budget-${budget.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {budget.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStatusMutation.mutate({ budgetId: budget.id, status: "pending" })}
                                title="Enviar para aprovação"
                                data-testid={`button-send-budget-${budget.id}`}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            )}
                            {budget.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateStatusMutation.mutate({ budgetId: budget.id, status: "approved" })}
                                  title="Aprovar"
                                  data-testid={`button-approve-budget-${budget.id}`}
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateStatusMutation.mutate({ budgetId: budget.id, status: "rejected" })}
                                  title="Rejeitar"
                                  data-testid={`button-reject-budget-${budget.id}`}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
            <DialogDescription>
              Selecione o paciente e adicione os tratamentos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger data-testid="select-patient-budget">
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
                  {filteredPatients.map((patient) => (
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
              <Label>Adicionar Tratamento</Label>
              <Select onValueChange={addTreatmentItem}>
                <SelectTrigger data-testid="select-add-treatment">
                  <SelectValue placeholder="Selecione um tratamento" />
                </SelectTrigger>
                <SelectContent>
                  {dentistTreatments.map((dt) => (
                    <SelectItem key={dt.treatmentId} value={dt.treatmentId}>
                      {dt.treatment.name} - R$ {dt.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {budgetItems.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tratamento</TableHead>
                      <TableHead className="w-20">Dente</TableHead>
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{getTreatmentName(item.treatmentId)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="11"
                            max="48"
                            placeholder="-"
                            value={item.toothNumber || ""}
                            onChange={(e) => updateItemToothNumber(index, e.target.value ? parseInt(e.target.value) : undefined)}
                            className="h-8 w-16"
                            data-testid={`input-tooth-${index}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="h-8 w-16"
                            data-testid={`input-quantity-${index}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          R$ {(item.quantity * item.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTreatmentItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="space-y-2">
              <Label>Desconto</Label>
              <div className="flex gap-2 items-center">
                <Select value={discountType} onValueChange={(value: "percentage" | "fixed") => setDiscountType(value)}>
                  <SelectTrigger className="w-32" data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max={discountType === "percentage" ? 100 : undefined}
                  step={discountType === "percentage" ? 1 : 0.01}
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder={discountType === "percentage" ? "0%" : "R$ 0,00"}
                  className="w-32"
                  data-testid="input-discount-value"
                />
                {discount > 0 && (
                  <span className="text-sm text-muted-foreground">
                    (-R$ {calculateDiscountAmount(calculateSubtotal(), discount, discountType).toFixed(2)})
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 p-4 bg-muted rounded-md">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Subtotal</span>
                <span>R$ {calculateSubtotal().toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <span>Desconto {discountType === "percentage" ? `(${discount}%)` : ""}</span>
                  <span>-R$ {calculateDiscountAmount(calculateSubtotal(), discount, discountType).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total do Orçamento</span>
                <span className="text-xl font-bold">R$ {calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateBudget}
              disabled={!selectedPatientId || budgetItems.length === 0 || createBudgetMutation.isPending}
              data-testid="button-save-budget"
            >
              {createBudgetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={(open) => { setIsViewDialogOpen(open); if (!open) { setIsEditMode(false); setNewEditItem(null); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              {isEditMode ? "Editar Orçamento" : "Detalhes do Orçamento"}
              {selectedBudget?.status === "draft" && !isEditMode && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditMode(true)} data-testid="button-edit-budget">
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedBudget && `Paciente: ${getPatientName(selectedBudget.patientId)}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 max-h-[60vh] overflow-auto p-6">
            {selectedBudget && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                <Badge className={statusLabels[selectedBudget.status]?.color || ""}>
                  {statusLabels[selectedBudget.status]?.label || selectedBudget.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Criado em {format(new Date(selectedBudget.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tratamento</TableHead>
                      <TableHead>Dente</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {isEditMode && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBudget.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{getTreatmentName(item.treatmentId)}</TableCell>
                        <TableCell>{item.toothNumber || "-"}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">R$ {item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                        {isEditMode && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {isEditMode && newEditItem && (
                      <TableRow>
                        <TableCell>
                          <Select value={newEditItem.treatmentId} onValueChange={(value) => {
                            const treatment = dentistTreatments.find(dt => dt.treatmentId === value);
                            setNewEditItem({ ...newEditItem, treatmentId: value, unitPrice: treatment?.price || 0 });
                          }}>
                            <SelectTrigger className="w-full" data-testid="select-new-item-treatment">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {dentistTreatments.map((dt) => (
                                <SelectItem key={dt.treatmentId} value={dt.treatmentId}>
                                  {dt.treatment?.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={11}
                            max={48}
                            placeholder="-"
                            value={newEditItem.toothNumber || ""}
                            onChange={(e) => setNewEditItem({ ...newEditItem, toothNumber: e.target.value ? parseInt(e.target.value) : undefined })}
                            className="w-16"
                            data-testid="input-new-item-tooth"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            value={newEditItem.quantity}
                            onChange={(e) => setNewEditItem({ ...newEditItem, quantity: parseInt(e.target.value) || 1 })}
                            className="w-16 text-center"
                            data-testid="input-new-item-quantity"
                          />
                        </TableCell>
                        <TableCell className="text-right">R$ {newEditItem.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {(newEditItem.quantity * newEditItem.unitPrice).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (newEditItem.treatmentId) {
                                addItemMutation.mutate({
                                  budgetId: selectedBudget.id,
                                  treatmentId: newEditItem.treatmentId,
                                  toothNumber: newEditItem.toothNumber,
                                  quantity: newEditItem.quantity,
                                  unitPrice: newEditItem.unitPrice,
                                });
                              }
                            }}
                            disabled={!newEditItem.treatmentId || addItemMutation.isPending}
                            data-testid="button-confirm-new-item"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {isEditMode && !newEditItem && (
                <Button
                  variant="outline"
                  onClick={() => setNewEditItem({ treatmentId: "", quantity: 1, unitPrice: 0 })}
                  className="w-full"
                  data-testid="button-add-new-item"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tratamento
                </Button>
              )}

              {isEditMode && (
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <div className="flex gap-2 items-center">
                    <Select value={editDiscountType} onValueChange={(value: "percentage" | "fixed") => setEditDiscountType(value)}>
                      <SelectTrigger className="w-32" data-testid="select-edit-discount-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      max={editDiscountType === "percentage" ? 100 : undefined}
                      step={editDiscountType === "percentage" ? 1 : 0.01}
                      value={editDiscount || ""}
                      onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
                      placeholder={editDiscountType === "percentage" ? "0%" : "R$ 0,00"}
                      className="w-32"
                      data-testid="input-edit-discount-value"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const subtotal = selectedBudget.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
                        const discountAmount = calculateDiscountAmount(subtotal, editDiscount, editDiscountType);
                        updateBudgetDiscountMutation.mutate({
                          budgetId: selectedBudget.id,
                          discount: discountAmount,
                        });
                      }}
                      disabled={updateBudgetDiscountMutation.isPending}
                      data-testid="button-apply-discount"
                    >
                      {updateBudgetDiscountMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Aplicar"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2 p-4 bg-muted rounded-md">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {(selectedBudget.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0).toFixed(2)}</span>
                </div>
                {(selectedBudget.discount || 0) > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span>Desconto</span>
                    <span>-R$ {(selectedBudget.discount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Total do Orçamento</span>
                  <span className="text-xl font-bold">
                    R$ {((selectedBudget.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0) - (selectedBudget.discount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {(selectedBudget.status === "approved" || selectedBudget.status === "completed") && (
                <div className="space-y-3 p-4 border rounded-md">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Status do Pagamento</h4>
                    <Badge className={paymentStatusLabels[(selectedBudget as any).paymentStatus || "unpaid"]?.color || ""}>
                      {paymentStatusLabels[(selectedBudget as any).paymentStatus || "unpaid"]?.label || "Não pago"}
                    </Badge>
                  </div>
                  
                  {(() => {
                    const totalDue = (selectedBudget.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0) - (selectedBudget.discount || 0);
                    const paidAmount = (selectedBudget as any).paidAmount || 0;
                    const remainingAmount = totalDue - paidAmount;
                    
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total</span>
                            <p className="font-medium">R$ {totalDue.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pago</span>
                            <p className="font-medium text-green-600 dark:text-green-400">R$ {paidAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Restante</span>
                            <p className="font-medium text-orange-600 dark:text-orange-400">R$ {remainingAmount.toFixed(2)}</p>
                          </div>
                        </div>

                        {remainingAmount > 0 && !isPaymentDialogOpen && (
                          <Button
                            className="w-full"
                            onClick={() => {
                              setPaymentAmount(remainingAmount);
                              setIsPaymentDialogOpen(true);
                            }}
                            data-testid="button-register-payment"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Registrar Pagamento
                          </Button>
                        )}

                        {isPaymentDialogOpen && (
                          <div className="space-y-3 pt-3 border-t">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>Valor</Label>
                                <Input
                                  type="number"
                                  min="0.01"
                                  max={remainingAmount}
                                  step="0.01"
                                  value={paymentAmount || ""}
                                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                  data-testid="input-payment-amount"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>Forma de Pagamento</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                  <SelectTrigger data-testid="select-payment-method">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PAYMENT_METHODS.map((method) => (
                                      <SelectItem key={method.value} value={method.value}>
                                        {method.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Descrição (opcional)</Label>
                              <Input
                                value={paymentDescription}
                                onChange={(e) => setPaymentDescription(e.target.value)}
                                placeholder="Ex: Pagamento parcial"
                                data-testid="input-payment-description"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setIsPaymentDialogOpen(false)}
                                className="flex-1"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => {
                                  registerPaymentMutation.mutate({
                                    budgetId: selectedBudget.id,
                                    amount: paymentAmount,
                                    paymentMethod,
                                    description: paymentDescription || undefined,
                                  });
                                }}
                                disabled={!paymentAmount || paymentAmount <= 0 || registerPaymentMutation.isPending}
                                className="flex-1"
                                data-testid="button-confirm-payment"
                              >
                                {registerPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Confirmar
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

          <DialogFooter className="p-6 pt-2 gap-2">
            {selectedBudget?.status === "draft" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
                      deleteBudgetMutation.mutate(selectedBudget.id);
                    }
                  }}
                  disabled={deleteBudgetMutation.isPending}
                  data-testid="button-delete-budget"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
                {isEditMode && (
                  <Button
                    onClick={() => {
                      setIsEditMode(false);
                      setNewEditItem(null);
                    }}
                    data-testid="button-finish-edit"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Concluir Edição
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              onClick={generateBudgetPDF}
              disabled={isGeneratingPDF || !selectedBudget?.items?.length}
              data-testid="button-generate-pdf"
            >
              {isGeneratingPDF ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>
            <Button variant="outline" onClick={() => { setIsViewDialogOpen(false); setIsEditMode(false); setNewEditItem(null); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
