import { z } from "zod";

// ============================================
// USER / AUTHENTICATION
// ============================================
export const users = {
  id: "TEXT PRIMARY KEY",
  username: "TEXT NOT NULL UNIQUE",
  email: "TEXT NOT NULL UNIQUE",
  password: "TEXT NOT NULL",
  name: "TEXT NOT NULL",
  role: "TEXT DEFAULT 'dentist'",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.enum(["dentist", "admin", "receptionist"]).default("dentist"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = {
  id: string;
  username: string;
  email: string;
  password: string;
  name: string;
  role: string;
  createdAt: string;
};

// ============================================
// PATIENTS
// ============================================
export const patients = {
  id: "TEXT PRIMARY KEY",
  recordNumber: "INTEGER NOT NULL UNIQUE",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  name: "TEXT NOT NULL",
  cpf: "TEXT UNIQUE",
  birthDate: "TEXT",
  gender: "TEXT",
  phone: "TEXT",
  email: "TEXT",
  address: "TEXT",
  neighborhood: "TEXT",
  city: "TEXT",
  state: "TEXT",
  zipCode: "TEXT",
  notes: "TEXT",
  treatmentPlanNotes: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP",
  updatedAt: "TEXT"
};

export const insertPatientSchema = z.object({
  dentistId: z.string().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().nullish(),
  birthDate: z.string().nullish(),
  gender: z.enum(["male", "female", "other"]).nullish(),
  phone: z.string().nullish(),
  email: z.string().email("Email inválido").nullish().or(z.literal("")),
  address: z.string().nullish(),
  neighborhood: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  zipCode: z.string().nullish(),
  notes: z.string().nullish(),
  treatmentPlanNotes: z.string().nullish(),
});

export const transferPatientSchema = z.object({
  newDentistId: z.string().min(1, "Dentista é obrigatório"),
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type TransferPatient = z.infer<typeof transferPatientSchema>;
export type Patient = {
  id: string;
  recordNumber: number;
  dentistId: string;
  name: string;
  cpf: string | null;
  birthDate: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  treatmentPlanNotes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// ============================================
// ANAMNESIS (Health History)
// ============================================
export const anamnesis = {
  id: "TEXT PRIMARY KEY",
  patientId: "TEXT NOT NULL REFERENCES patients(id)",
  hasAllergies: "INTEGER DEFAULT 0",
  allergiesDescription: "TEXT",
  hasMedications: "INTEGER DEFAULT 0",
  medicationsDescription: "TEXT",
  hasChronicDiseases: "INTEGER DEFAULT 0",
  chronicDiseasesDescription: "TEXT",
  hasHeartProblems: "INTEGER DEFAULT 0",
  hasDiabetes: "INTEGER DEFAULT 0",
  hasHypertension: "INTEGER DEFAULT 0",
  isPregnant: "INTEGER DEFAULT 0",
  isSmoker: "INTEGER DEFAULT 0",
  hasBleedingDisorder: "INTEGER DEFAULT 0",
  previousDentalTreatments: "TEXT",
  observations: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP",
  updatedAt: "TEXT"
};

export const insertAnamnesisSchema = z.object({
  patientId: z.string(),
  hasAllergies: z.boolean().default(false),
  allergiesDescription: z.string().nullish(),
  hasMedications: z.boolean().default(false),
  medicationsDescription: z.string().nullish(),
  hasChronicDiseases: z.boolean().default(false),
  chronicDiseasesDescription: z.string().nullish(),
  hasHeartProblems: z.boolean().default(false),
  hasDiabetes: z.boolean().default(false),
  hasHypertension: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  isSmoker: z.boolean().default(false),
  hasBleedingDisorder: z.boolean().default(false),
  previousDentalTreatments: z.string().nullish(),
  observations: z.string().nullish(),
});

export type InsertAnamnesis = z.infer<typeof insertAnamnesisSchema>;
export type Anamnesis = {
  id: string;
  patientId: string;
  hasAllergies: boolean;
  allergiesDescription: string | null;
  hasMedications: boolean;
  medicationsDescription: string | null;
  hasChronicDiseases: boolean;
  chronicDiseasesDescription: string | null;
  hasHeartProblems: boolean;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  isPregnant: boolean;
  isSmoker: boolean;
  hasBleedingDisorder: boolean;
  previousDentalTreatments: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// ============================================
// APPOINTMENTS
// ============================================
export const appointments = {
  id: "TEXT PRIMARY KEY",
  patientId: "TEXT NOT NULL REFERENCES patients(id)",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  date: "TEXT NOT NULL",
  time: "TEXT NOT NULL",
  duration: "INTEGER DEFAULT 30",
  status: "TEXT DEFAULT 'scheduled'",
  type: "TEXT",
  notes: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertAppointmentSchema = z.object({
  patientId: z.string(),
  dentistId: z.string(),
  date: z.string(),
  time: z.string(),
  duration: z.number().default(30),
  status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"]).default("scheduled"),
  type: z.string().optional(),
  notes: z.string().optional(),
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = {
  id: string;
  patientId: string;
  dentistId: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  type: string | null;
  notes: string | null;
  createdAt: string;
};

export type AppointmentWithPatient = Appointment & {
  patient: Patient;
};

// ============================================
// DENTAL RECORDS (Prontuário)
// ============================================
export const dentalRecords = {
  id: "TEXT PRIMARY KEY",
  patientId: "TEXT NOT NULL REFERENCES patients(id)",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  appointmentId: "TEXT REFERENCES appointments(id)",
  date: "TEXT NOT NULL",
  procedure: "TEXT NOT NULL",
  teeth: "TEXT",
  description: "TEXT",
  observations: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertDentalRecordSchema = z.object({
  patientId: z.string(),
  dentistId: z.string(),
  appointmentId: z.string().optional(),
  date: z.string(),
  procedure: z.string().min(1, "Procedimento é obrigatório"),
  teeth: z.string().optional(),
  description: z.string().optional(),
  observations: z.string().optional(),
});

export type InsertDentalRecord = z.infer<typeof insertDentalRecordSchema>;
export type DentalRecord = {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId: string | null;
  date: string;
  procedure: string;
  teeth: string | null;
  description: string | null;
  observations: string | null;
  createdAt: string;
};

// ============================================
// ODONTOGRAM (Tooth conditions)
// ============================================
export const toothConditions = {
  id: "TEXT PRIMARY KEY",
  patientId: "TEXT NOT NULL REFERENCES patients(id)",
  toothNumber: "INTEGER NOT NULL",
  condition: "TEXT NOT NULL",
  surface: "TEXT",
  notes: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP",
  updatedAt: "TEXT"
};

export const insertToothConditionSchema = z.object({
  patientId: z.string(),
  toothNumber: z.number().min(11).max(48),
  condition: z.enum([
    "healthy",
    "cavity",
    "filling",
    "crown",
    "extraction",
    "root_canal",
    "implant",
    "bridge",
    "veneer",
    "fracture",
    "absent"
  ]),
  surface: z.string().optional(),
  notes: z.string().optional(),
});

export type InsertToothCondition = z.infer<typeof insertToothConditionSchema>;
export type ToothCondition = {
  id: string;
  patientId: string;
  toothNumber: number;
  condition: string;
  surface: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// Tooth condition colors for odontogram
export const toothConditionColors: Record<string, { bg: string; label: string }> = {
  healthy: { bg: "#FFFFFF", label: "Saudável" },
  cavity: { bg: "#EF4444", label: "Cárie" },
  filling: { bg: "#3B82F6", label: "Restauração" },
  crown: { bg: "#F59E0B", label: "Coroa" },
  extraction: { bg: "#6B7280", label: "Extração" },
  root_canal: { bg: "#8B5CF6", label: "Canal" },
  implant: { bg: "#10B981", label: "Implante" },
  bridge: { bg: "#EC4899", label: "Ponte" },
  veneer: { bg: "#06B6D4", label: "Faceta" },
  fracture: { bg: "#F97316", label: "Fratura" },
  absent: { bg: "#1F2937", label: "Ausente" },
};

// ============================================
// TOOTH CONDITION TREATMENTS (Treatments linked to tooth conditions)
// ============================================
export const toothConditionTreatments = {
  id: "TEXT PRIMARY KEY",
  toothConditionId: "TEXT NOT NULL REFERENCES tooth_conditions(id)",
  treatmentId: "TEXT NOT NULL REFERENCES treatments(id)",
  surface: "TEXT",
  notes: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertToothConditionTreatmentSchema = z.object({
  toothConditionId: z.string(),
  treatmentId: z.string(),
  surface: z.string().optional(),
  notes: z.string().optional(),
});

export type InsertToothConditionTreatment = z.infer<typeof insertToothConditionTreatmentSchema>;
export type ToothConditionTreatment = {
  id: string;
  toothConditionId: string;
  treatmentId: string;
  surface: string | null;
  notes: string | null;
  createdAt: string;
};

export type ToothConditionTreatmentWithDetails = ToothConditionTreatment & {
  treatment: Treatment;
};

export type ToothConditionWithTreatments = ToothCondition & {
  treatments: ToothConditionTreatmentWithDetails[];
};

// ============================================
// DENTIST SETTINGS
// ============================================
export const dentistSettings = {
  id: "TEXT PRIMARY KEY",
  userId: "TEXT NOT NULL UNIQUE REFERENCES users(id)",
  workDays: "TEXT DEFAULT '[1,2,3,4,5]'",
  startTime: "TEXT DEFAULT '08:00'",
  endTime: "TEXT DEFAULT '18:00'",
  lunchStart: "TEXT DEFAULT '12:00'",
  lunchEnd: "TEXT DEFAULT '13:00'",
  appointmentDuration: "INTEGER DEFAULT 30",
  clinicName: "TEXT DEFAULT 'Odonto Ramalho'",
  clinicAddress: "TEXT",
  clinicPhone: "TEXT",
  clinicEmail: "TEXT",
  clinicCep: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP",
  updatedAt: "TEXT"
};

export const insertDentistSettingsSchema = z.object({
  userId: z.string(),
  workDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  startTime: z.string().default("08:00"),
  endTime: z.string().default("18:00"),
  lunchStart: z.string().default("12:00"),
  lunchEnd: z.string().default("13:00"),
  appointmentDuration: z.number().min(15).max(120).default(30),
  clinicName: z.string().optional(),
  clinicAddress: z.string().optional(),
  clinicPhone: z.string().optional(),
  clinicEmail: z.string().optional(),
  clinicCep: z.string().optional(),
});

export type InsertDentistSettings = z.infer<typeof insertDentistSettingsSchema>;
export type DentistSettings = {
  id: string;
  userId: string;
  workDays: number[];
  startTime: string;
  endTime: string;
  lunchStart: string;
  lunchEnd: string;
  appointmentDuration: number;
  clinicName: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
  clinicEmail: string | null;
  clinicCep: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// ============================================
// TREATMENTS (Available treatments)
// ============================================
export const treatments = {
  id: "TEXT PRIMARY KEY",
  name: "TEXT NOT NULL",
  description: "TEXT",
  duration: "INTEGER DEFAULT 30",
  isActive: "INTEGER DEFAULT 1",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertTreatmentSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  duration: z.number().min(15).max(240).default(30),
  isActive: z.boolean().default(true),
});

export type InsertTreatment = z.infer<typeof insertTreatmentSchema>;
export type Treatment = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  isActive: boolean;
  createdAt: string;
};

// ============================================
// DENTIST TREATMENTS (Treatments each dentist offers with pricing)
// ============================================
export const dentistTreatments = {
  id: "TEXT PRIMARY KEY",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  treatmentId: "TEXT NOT NULL REFERENCES treatments(id)",
  price: "REAL DEFAULT 0",
  customDuration: "INTEGER",
  legendColor: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertDentistTreatmentSchema = z.object({
  dentistId: z.string(),
  treatmentId: z.string(),
  price: z.number().min(0).default(0),
  customDuration: z.number().min(15).max(240).optional(),
  legendColor: z.string().optional(),
});

export type InsertDentistTreatment = z.infer<typeof insertDentistTreatmentSchema>;
export type DentistTreatment = {
  id: string;
  dentistId: string;
  treatmentId: string;
  price: number;
  customDuration: number | null;
  legendColor: string | null;
  createdAt: string;
};

// Dentist treatment with full treatment details
export type DentistTreatmentWithDetails = DentistTreatment & {
  treatment: Treatment;
};

// ============================================
// BUDGETS (Orçamentos)
// ============================================
export const budgets = {
  id: "TEXT PRIMARY KEY",
  patientId: "TEXT NOT NULL REFERENCES patients(id)",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  status: "TEXT DEFAULT 'pending'",
  totalAmount: "REAL DEFAULT 0",
  discount: "REAL DEFAULT 0",
  paidAmount: "REAL DEFAULT 0",
  paymentStatus: "TEXT DEFAULT 'unpaid'",
  notes: "TEXT",
  validUntil: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP",
  updatedAt: "TEXT"
};

export const insertBudgetSchema = z.object({
  patientId: z.string(),
  dentistId: z.string(),
  status: z.enum(["draft", "pending", "approved", "rejected", "completed"]).default("pending"),
  totalAmount: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = {
  id: string;
  patientId: string;
  dentistId: string;
  status: string;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  paymentStatus: string;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
};

// ============================================
// BUDGET ITEMS (Itens do Orçamento / Plano de Tratamento)
// ============================================
export const budgetItems = {
  id: "TEXT PRIMARY KEY",
  budgetId: "TEXT NOT NULL REFERENCES budgets(id)",
  treatmentId: "TEXT NOT NULL REFERENCES treatments(id)",
  toothNumber: "INTEGER",
  quantity: "INTEGER DEFAULT 1",
  unitPrice: "REAL NOT NULL",
  status: "TEXT DEFAULT 'pending'",
  notes: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertBudgetItemSchema = z.object({
  budgetId: z.string(),
  treatmentId: z.string(),
  toothNumber: z.number().min(11).max(48).optional(),
  quantity: z.number().min(1).default(1),
  unitPrice: z.number().min(0),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});

export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = {
  id: string;
  budgetId: string;
  treatmentId: string;
  toothNumber: number | null;
  quantity: number;
  unitPrice: number;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type BudgetItemWithTreatment = BudgetItem & {
  treatment: Treatment;
};

export type BudgetWithItems = Budget & {
  items: BudgetItemWithTreatment[];
  patient?: Patient;
};

// ============================================
// APPOINTMENT REQUESTS (Public scheduling requests)
// ============================================
export const appointmentRequests = {
  id: "TEXT PRIMARY KEY",
  patientName: "TEXT NOT NULL",
  patientPhone: "TEXT NOT NULL",
  patientEmail: "TEXT",
  treatmentId: "TEXT NOT NULL REFERENCES treatments(id)",
  dentistId: "TEXT REFERENCES users(id)",
  preferredDate: "TEXT",
  notes: "TEXT",
  status: "TEXT DEFAULT 'pending'",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertAppointmentRequestSchema = z.object({
  patientName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  patientPhone: z.string().min(10, "Telefone inválido"),
  patientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  treatmentId: z.string().min(1, "Selecione um tratamento"),
  dentistId: z.string().optional().or(z.literal("")),
  preferredDate: z.string().optional(),
  notes: z.string().optional(),
});

export type InsertAppointmentRequest = z.infer<typeof insertAppointmentRequestSchema>;

export const insertContactMessageSchema = z.object({
  patientName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  patientPhone: z.string().min(10, "Telefone inválido"),
  patientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  message: z.string().optional(),
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type AppointmentRequest = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  treatmentId: string;
  dentistId: string | null;
  preferredDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export type AppointmentRequestWithDetails = AppointmentRequest & {
  treatment: Treatment;
  dentist?: Omit<User, "password">;
};

// ============================================
// CLINIC SETTINGS
// ============================================
export const clinicSettings = {
  id: "TEXT PRIMARY KEY",
  clinicName: "TEXT DEFAULT 'Odonto Ramalho'",
  clinicPhone: "TEXT",
  clinicWhatsApp: "TEXT",
  clinicEmail: "TEXT",
  clinicAddress: "TEXT",
  clinicDescription: "TEXT",
  updatedAt: "TEXT"
};

export const insertClinicSettingsSchema = z.object({
  clinicName: z.string().optional(),
  clinicPhone: z.string().optional(),
  clinicWhatsApp: z.string().optional(),
  clinicEmail: z.string().optional(),
  clinicAddress: z.string().optional(),
  clinicDescription: z.string().optional(),
});

export type InsertClinicSettings = z.infer<typeof insertClinicSettingsSchema>;
export type ClinicSettings = {
  id: string;
  clinicName: string | null;
  clinicPhone: string | null;
  clinicWhatsApp: string | null;
  clinicEmail: string | null;
  clinicAddress: string | null;
  clinicDescription: string | null;
  updatedAt: string | null;
};

// ============================================
// API Response Types
// ============================================
export type AuthResponse = {
  token: string;
  user: Omit<User, "password">;
};

export type DashboardStats = {
  totalPatients: number;
  todayAppointments: number;
  weekAppointments: number;
  completedToday: number;
};

export type BirthdayPatient = {
  id: string;
  name: string;
  birthDate: string;
  phone: string | null;
  isBirthdayToday: boolean;
  hasAppointmentToday: boolean;
};

export type PublicDentist = {
  id: string;
  name: string;
  treatments: (Treatment & { price: number; customDuration: number | null })[];
};

// ============================================
// FINANCIAL TRANSACTIONS (Pagamentos/Recebimentos)
// ============================================
export const financialTransactions = {
  id: "TEXT PRIMARY KEY",
  budgetId: "TEXT REFERENCES budgets(id)",
  patientId: "TEXT REFERENCES patients(id)",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  type: "TEXT NOT NULL",
  amount: "REAL NOT NULL",
  paymentMethod: "TEXT",
  description: "TEXT",
  date: "TEXT NOT NULL",
  status: "TEXT DEFAULT 'completed'",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertFinancialTransactionSchema = z.object({
  budgetId: z.string().optional(),
  patientId: z.string().optional(),
  dentistId: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number().min(0),
  paymentMethod: z.enum(["cash", "credit_card", "debit_card", "pix", "transfer", "check", "other"]).optional(),
  description: z.string().optional(),
  date: z.string(),
  status: z.enum(["pending", "completed", "cancelled"]).default("completed"),
});

export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = {
  id: string;
  budgetId: string | null;
  patientId: string | null;
  dentistId: string;
  type: "income" | "expense";
  amount: number;
  paymentMethod: string | null;
  description: string | null;
  date: string;
  status: string;
  createdAt: string;
};

export type FinancialTransactionWithDetails = FinancialTransaction & {
  patient?: Patient;
  budget?: Budget;
};

// ============================================
// TREATMENT COSTS (Custos por Tratamento)
// ============================================
export const treatmentCosts = {
  id: "TEXT PRIMARY KEY",
  treatmentId: "TEXT NOT NULL REFERENCES treatments(id)",
  dentistId: "TEXT NOT NULL REFERENCES users(id)",
  materialCost: "REAL DEFAULT 0",
  laborCost: "REAL DEFAULT 0",
  overheadCost: "REAL DEFAULT 0",
  notes: "TEXT",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP",
  updatedAt: "TEXT"
};

export const insertTreatmentCostSchema = z.object({
  treatmentId: z.string(),
  dentistId: z.string(),
  materialCost: z.number().min(0).default(0),
  laborCost: z.number().min(0).default(0),
  overheadCost: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export type InsertTreatmentCost = z.infer<typeof insertTreatmentCostSchema>;
export type TreatmentCost = {
  id: string;
  treatmentId: string;
  dentistId: string;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type TreatmentCostWithDetails = TreatmentCost & {
  treatment: Treatment;
  price?: number;
  profit?: number;
  profitMargin?: number;
};

// ============================================
// FINANCIAL REPORTS (Tipos de Relatórios)
// ============================================
export type FinancialSummary = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  completedBudgets: number;
  approvedBudgets: number;
  pendingBudgetsCount?: number;
  totalBudgetValue: number;
};

export type MonthlyFinancialData = {
  month: string;
  year: number;
  income: number;
  expenses: number;
  profit: number;
};

export type TreatmentFinancialReport = {
  treatmentId: string;
  treatmentName: string;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  count: number;
  averagePrice: number;
};

export type PatientFinancialReport = {
  patientId: string;
  patientName: string;
  totalPaid: number;
  totalPending: number;
  budgetsCount: number;
  lastPaymentDate: string | null;
};

// ============================================
// RECORD IMAGES (Imagens do Prontuário)
// ============================================
export const recordImages = {
  id: "TEXT PRIMARY KEY",
  recordId: "TEXT NOT NULL REFERENCES dental_records(id)",
  filename: "TEXT NOT NULL",
  originalName: "TEXT NOT NULL",
  mimeType: "TEXT NOT NULL",
  size: "INTEGER NOT NULL",
  description: "TEXT",
  imageType: "TEXT DEFAULT 'exam'",
  createdAt: "TEXT DEFAULT CURRENT_TIMESTAMP"
};

export const insertRecordImageSchema = z.object({
  recordId: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  description: z.string().optional(),
  imageType: z.enum(["xray", "photo", "exam", "before", "after", "other"]).default("exam"),
});

export type InsertRecordImage = z.infer<typeof insertRecordImageSchema>;
export type RecordImage = {
  id: string;
  recordId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  description: string | null;
  imageType: string;
  createdAt: string;
};

export type DentalRecordWithImages = DentalRecord & {
  images: RecordImage[];
};
