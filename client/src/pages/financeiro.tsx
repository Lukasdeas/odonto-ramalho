import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  Users,
  Download,
  Plus,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  PiggyBank,
  BarChart3,
  Filter,
  Receipt,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  FinancialSummary,
  MonthlyFinancialData,
  TreatmentFinancialReport,
  PatientFinancialReport,
  FinancialTransactionWithDetails,
  Patient,
  BudgetWithItems,
} from "@shared/schema";
import { Eye } from "lucide-react";
import jsPDF from "jspdf";

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "pix", label: "PIX" },
  { value: "transfer", label: "Transferência" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Outro" },
];

const CHART_COLORS = ["#2E86AB", "#A23B72", "#10B981", "#F59E0B", "#6366F1", "#EC4899"];

export default function FinanceiroPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBudgetDetailsOpen, setIsBudgetDetailsOpen] = useState(false);
  const [budgetFilterStatus, setBudgetFilterStatus] = useState<"pending" | "approved">("pending");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense",
    amount: "",
    paymentMethod: "pix",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    patientId: "",
  });

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useQuery<FinancialSummary>({
    queryKey: ["/api/financial/summary", { startDate: dateRange.start, endDate: dateRange.end }],
  });

  const { data: monthlyData } = useQuery<MonthlyFinancialData[]>({
    queryKey: ["/api/financial/monthly", { year: selectedYear }],
  });

  const { data: transactions } = useQuery<FinancialTransactionWithDetails[]>({
    queryKey: ["/api/financial/transactions", { startDate: dateRange.start, endDate: dateRange.end }],
  });

  const { data: treatmentsReport } = useQuery<TreatmentFinancialReport[]>({
    queryKey: ["/api/financial/treatments-report", { startDate: dateRange.start, endDate: dateRange.end }],
  });

  const { data: patientsReport } = useQuery<PatientFinancialReport[]>({
    queryKey: ["/api/financial/patients-report"],
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: budgetsData } = useQuery<BudgetWithItems[]>({
    queryKey: ["/api/budgets", { includeItems: "false" }],
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/financial/transactions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/financial/monthly"] });
      setIsAddDialogOpen(false);
      setNewTransaction({
        type: "income",
        amount: "",
        paymentMethod: "pix",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        patientId: "",
      });
      toast({ title: "Transação registrada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao registrar transação", variant: "destructive" });
    },
  });

  const handleAddTransaction = () => {
    if (!newTransaction.amount || parseFloat(newTransaction.amount) <= 0) {
      toast({ title: "Informe um valor válido", variant: "destructive" });
      return;
    }
    createTransactionMutation.mutate({
      ...newTransaction,
      amount: parseFloat(newTransaction.amount),
      patientId: newTransaction.patientId && newTransaction.patientId !== "none" ? newTransaction.patientId : undefined,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPaymentMethodLabel = (method: string | null) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method || "-";
  };

  const monthNames = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];

  const chartData = monthlyData?.map((m, idx) => ({
    name: monthNames[idx],
    receitas: m.income,
    despesas: m.expenses,
    lucro: m.profit,
  })) || [];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, 22);
    doc.setFontSize(12);
    doc.text(`Período: ${format(new Date(dateRange.start), "dd/MM/yyyy")} a ${format(new Date(dateRange.end), "dd/MM/yyyy")}`, 14, 32);
    
    if (summary) {
      doc.setFontSize(14);
      doc.text("Resumo", 14, 45);
      doc.setFontSize(11);
      doc.text(`Receitas: ${formatCurrency(summary.totalIncome)}`, 14, 55);
      doc.text(`Despesas: ${formatCurrency(summary.totalExpenses)}`, 14, 62);
      doc.text(`Lucro Líquido: ${formatCurrency(summary.netProfit)}`, 14, 69);
      doc.text(`Pagamentos Pendentes: ${formatCurrency(summary.pendingPayments)}`, 14, 76);
    }

    if (transactions && transactions.length > 0) {
      doc.setFontSize(14);
      doc.text("Transações", 14, 92);
      doc.setFontSize(10);
      let y = 102;
      transactions.slice(0, 20).forEach((t) => {
        const typeLabel = t.type === "income" ? "Receita" : "Despesa";
        doc.text(`${format(new Date(t.date), "dd/MM/yyyy")} - ${typeLabel} - ${formatCurrency(t.amount)} - ${t.description || "-"}`, 14, y);
        y += 7;
      });
    }

    doc.save(`relatorio-financeiro-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "Relatório exportado com sucesso!" });
  };

  const setQuickDateRange = (months: number) => {
    const end = new Date();
    const start = subMonths(startOfMonth(end), months - 1);
    setDateRange({
      start: format(startOfMonth(start), "yyyy-MM-dd"),
      end: format(endOfMonth(end), "yyyy-MM-dd"),
    });
  };

  if (summaryLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando dados financeiros...</div>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-destructive">Erro ao carregar dados financeiros. Tente novamente.</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Controle Financeiro</h1>
            <p className="text-muted-foreground">Acompanhe receitas, despesas e relatórios da clínica</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(1)} data-testid="btn-range-1m">
              Este Mês
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(3)} data-testid="btn-range-3m">
              3 Meses
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(12)} data-testid="btn-range-12m">
              12 Meses
            </Button>
            <Button variant="outline" onClick={exportPDF} data-testid="btn-export-pdf">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="btn-add-transaction">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Transação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={newTransaction.type === "income" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setNewTransaction({ ...newTransaction, type: "income" })}
                      data-testid="btn-type-income"
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Receita
                    </Button>
                    <Button
                      variant={newTransaction.type === "expense" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setNewTransaction({ ...newTransaction, type: "expense" })}
                      data-testid="btn-type-expense"
                    >
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Despesa
                    </Button>
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                      data-testid="input-amount"
                    />
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      data-testid="input-date"
                    />
                  </div>
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={newTransaction.paymentMethod}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, paymentMethod: v })}
                    >
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Paciente (opcional)</Label>
                    <Select
                      value={newTransaction.patientId}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, patientId: v })}
                    >
                      <SelectTrigger data-testid="select-patient">
                        <SelectValue placeholder="Selecione um paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {patients?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      placeholder="Descrição da transação..."
                      value={newTransaction.description}
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      data-testid="input-description"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleAddTransaction}
                    disabled={createTransactionMutation.isPending}
                    data-testid="btn-save-transaction"
                  >
                    {createTransactionMutation.isPending ? "Salvando..." : "Salvar Transação"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-income">
                {formatCurrency(summary?.totalIncome || 0)}
              </div>
              <p className="text-xs text-muted-foreground">No período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-expenses">
                {formatCurrency(summary?.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">No período selecionado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${(summary?.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                data-testid="text-profit"
              >
                {formatCurrency(summary?.netProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Receitas - Despesas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <PiggyBank className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600" data-testid="text-pending">
                {formatCurrency(summary?.pendingPayments || 0)}
              </div>
              <p className="text-xs text-muted-foreground">De orçamentos pendentes e aprovados</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Evolução Mensal</CardTitle>
                <CardDescription>Receitas e despesas ao longo do ano</CardDescription>
              </div>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-24" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Orçamentos</CardTitle>
              <CardDescription>Integrado com valores a receber</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pendentes</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-600">{summary?.pendingBudgetsCount || 0}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => {
                        setBudgetFilterStatus("pending");
                        setIsBudgetDetailsOpen(true);
                      }}
                      data-testid="button-view-pending-budgets"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Aprovados</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{summary?.approvedBudgets || 0}</Badge>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => {
                        setBudgetFilterStatus("approved");
                        setIsBudgetDetailsOpen(true);
                      }}
                      data-testid="button-view-approved-budgets"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Concluídos</span>
                  <Badge className="bg-green-500 text-white">{summary?.completedBudgets || 0}</Badge>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">A Receber</span>
                    <span className="font-semibold text-amber-600">{formatCurrency(summary?.pendingPayments || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Valor Total</span>
                    <span className="font-semibold">{formatCurrency(summary?.totalBudgetValue || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isBudgetDetailsOpen} onOpenChange={setIsBudgetDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Orçamentos {budgetFilterStatus === "pending" ? "Pendentes" : "Aprovados"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={budgetFilterStatus === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBudgetFilterStatus("pending")}
                  data-testid="button-filter-pending"
                >
                  Pendentes
                </Button>
                <Button
                  variant={budgetFilterStatus === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBudgetFilterStatus("approved")}
                  data-testid="button-filter-approved"
                >
                  Aprovados
                </Button>
              </div>
              <ScrollArea className="max-h-[400px]">
                {(() => {
                  const filteredBudgets = budgetsData?.filter(b => b.status === budgetFilterStatus) || [];
                  const totalValue = filteredBudgets.reduce((sum, b) => sum + (b.totalAmount - b.discount - b.paidAmount), 0);
                  
                  if (filteredBudgets.length === 0) {
                    return (
                      <div className="py-8 text-center text-muted-foreground">
                        Nenhum orçamento {budgetFilterStatus === "pending" ? "pendente" : "aprovado"} encontrado
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Paciente</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right">Desconto</TableHead>
                            <TableHead className="text-right">Pago</TableHead>
                            <TableHead className="text-right">A Receber</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBudgets.map((budget) => (
                            <TableRow key={budget.id} data-testid={`row-budget-${budget.id}`}>
                              <TableCell className="font-medium">{budget.patient?.name || "Paciente não encontrado"}</TableCell>
                              <TableCell className="text-right">{formatCurrency(budget.totalAmount)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(budget.discount)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(budget.paidAmount)}</TableCell>
                              <TableCell className="text-right text-amber-600 font-medium">
                                {formatCurrency(budget.totalAmount - budget.discount - budget.paidAmount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="border-t mt-4 pt-4 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Total de {filteredBudgets.length} orçamento(s)
                        </span>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground">Total a Receber: </span>
                          <span className="font-semibold text-amber-600">{formatCurrency(totalValue)}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <Receipt className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="treatments" data-testid="tab-treatments">
              <BarChart3 className="h-4 w-4 mr-2" />
              Por Tratamento
            </TabsTrigger>
            <TabsTrigger value="patients" data-testid="tab-patients">
              <Users className="h-4 w-4 mr-2" />
              Por Paciente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Histórico de Transações</CardTitle>
                    <CardDescription>
                      {format(new Date(dateRange.start), "dd/MM/yyyy", { locale: ptBR })} a{" "}
                      {format(new Date(dateRange.end), "dd/MM/yyyy", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar transações..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-transactions"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredTransactions = transactions?.filter((t) => {
                    const searchLower = transactionSearch.toLowerCase();
                    return (
                      (t.description?.toLowerCase().includes(searchLower) || false) ||
                      (t.patient?.name?.toLowerCase().includes(searchLower) || false) ||
                      (getPaymentMethodLabel(t.paymentMethod).toLowerCase().includes(searchLower))
                    );
                  }) || [];
                  
                  if (filteredTransactions.length > 0) {
                    return (
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Paciente</TableHead>
                              <TableHead>Pagamento</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTransactions.map((t) => (
                              <TableRow key={t.id} data-testid={`row-transaction-${t.id}`}>
                                <TableCell>{format(new Date(t.date), "dd/MM/yyyy")}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={t.type === "income" ? "default" : "destructive"}
                                    className={t.type === "income" ? "bg-green-500" : ""}
                                  >
                                    {t.type === "income" ? "Receita" : "Despesa"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{t.description || "-"}</TableCell>
                                <TableCell>{t.patient?.name || "-"}</TableCell>
                                <TableCell>{getPaymentMethodLabel(t.paymentMethod)}</TableCell>
                                <TableCell
                                  className={`text-right font-medium ${t.type === "income" ? "text-green-600" : "text-red-600"}`}
                                >
                                  {t.type === "income" ? "+" : "-"}
                                  {formatCurrency(t.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    );
                  }
                  return (
                    <div className="py-8 text-center text-muted-foreground">
                      {transactionSearch ? "Nenhuma transação encontrada com esse filtro" : "Nenhuma transação encontrada no período"}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treatments">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Receita por Tratamento</CardTitle>
                    <CardDescription>Performance financeira dos tratamentos realizados</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tratamentos..."
                      value={treatmentSearch}
                      onChange={(e) => setTreatmentSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-treatments"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredTreatments = treatmentsReport?.filter((t) =>
                    t.treatmentName.toLowerCase().includes(treatmentSearch.toLowerCase())
                  ) || [];
                  
                  const totalRevenue = filteredTreatments.reduce((sum, t) => sum + t.totalRevenue, 0);
                  const totalCount = filteredTreatments.reduce((sum, t) => sum + t.count, 0);
                  
                  if (filteredTreatments.length > 0) {
                    return (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div>
                          <ScrollArea className="h-[300px]">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Tratamento</TableHead>
                                  <TableHead className="text-center">Qtd</TableHead>
                                  <TableHead className="text-right">Média</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredTreatments.map((t) => (
                                  <TableRow key={t.treatmentId} data-testid={`row-treatment-${t.treatmentId}`}>
                                    <TableCell className="font-medium">{t.treatmentName}</TableCell>
                                    <TableCell className="text-center">{t.count}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(t.averagePrice)}</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">
                                      {formatCurrency(t.totalRevenue)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                          <div className="border-t mt-4 pt-4 flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              Total: {totalCount} tratamento(s)
                            </span>
                            <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                          </div>
                        </div>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={filteredTreatments.slice(0, 6)}
                                dataKey="totalRevenue"
                                nameKey="treatmentName"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }) => `${name.slice(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                              >
                                {filteredTreatments.slice(0, 6).map((_, idx) => (
                                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="py-8 text-center text-muted-foreground">
                      {treatmentSearch ? "Nenhum tratamento encontrado com esse filtro" : "Nenhum tratamento concluído no período"}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Relatório por Paciente</CardTitle>
                    <CardDescription>Histórico financeiro dos pacientes</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pacientes..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-patients"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredPatients = patientsReport?.filter((p) =>
                    p.patientName.toLowerCase().includes(patientSearch.toLowerCase())
                  ) || [];
                  
                  const totalPaid = filteredPatients.reduce((sum, p) => sum + p.totalPaid, 0);
                  const totalPending = filteredPatients.reduce((sum, p) => sum + p.totalPending, 0);
                  
                  if (filteredPatients.length > 0) {
                    return (
                      <>
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead className="text-center">Orçamentos</TableHead>
                                <TableHead className="text-right">Pago</TableHead>
                                <TableHead className="text-right">Pendente</TableHead>
                                <TableHead>Último Pgto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredPatients.map((p) => (
                                <TableRow key={p.patientId} data-testid={`row-patient-${p.patientId}`}>
                                  <TableCell className="font-medium">{p.patientName}</TableCell>
                                  <TableCell className="text-center">{p.budgetsCount}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(p.totalPaid)}</TableCell>
                                  <TableCell className="text-right text-amber-600">{formatCurrency(p.totalPending)}</TableCell>
                                  <TableCell>
                                    {p.lastPaymentDate ? format(new Date(p.lastPaymentDate), "dd/MM/yyyy") : "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                        <div className="border-t mt-4 pt-4 flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Total: {filteredPatients.length} paciente(s)
                          </span>
                          <div className="flex gap-4">
                            <span className="text-sm">
                              <span className="text-muted-foreground">Pago: </span>
                              <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
                            </span>
                            <span className="text-sm">
                              <span className="text-muted-foreground">Pendente: </span>
                              <span className="font-semibold text-amber-600">{formatCurrency(totalPending)}</span>
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  }
                  return (
                    <div className="py-8 text-center text-muted-foreground">
                      {patientSearch ? "Nenhum paciente encontrado com esse filtro" : "Nenhum dado de paciente encontrado"}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
