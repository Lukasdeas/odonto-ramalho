import { randomUUID } from "crypto";
import db from "./db";
import type {
  User,
  InsertUser,
  Patient,
  InsertPatient,
  Anamnesis,
  InsertAnamnesis,
  Appointment,
  InsertAppointment,
  AppointmentWithPatient,
  DentalRecord,
  InsertDentalRecord,
  ToothCondition,
  InsertToothCondition,
  ToothConditionTreatment,
  InsertToothConditionTreatment,
  ToothConditionTreatmentWithDetails,
  ToothConditionWithTreatments,
  DentistSettings,
  InsertDentistSettings,
  DashboardStats,
  Treatment,
  InsertTreatment,
  DentistTreatment,
  InsertDentistTreatment,
  DentistTreatmentWithDetails,
  AppointmentRequest,
  InsertAppointmentRequest,
  AppointmentRequestWithDetails,
  ClinicSettings,
  InsertClinicSettings,
  PublicDentist,
  Budget,
  InsertBudget,
  BudgetItem,
  InsertBudgetItem,
  BudgetWithItems,
  BudgetItemWithTreatment,
  FinancialTransaction,
  InsertFinancialTransaction,
  FinancialTransactionWithDetails,
  TreatmentCost,
  InsertTreatmentCost,
  TreatmentCostWithDetails,
  FinancialSummary,
  MonthlyFinancialData,
  TreatmentFinancialReport,
  PatientFinancialReport,
  RecordImage,
  InsertRecordImage,
  DentalRecordWithImages,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllDentists(): Promise<Omit<User, "password">[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Patients
  getPatients(dentistId?: string, isAdmin?: boolean): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient & { dentistId: string }): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;
  hasPatientTransactions(patientId: string): Promise<boolean>;
  transferPatient(patientId: string, newDentistId: string): Promise<Patient | undefined>;

  // Anamnesis
  getAnamnesis(id: string): Promise<Anamnesis | undefined>;
  getAnamnesisByPatient(patientId: string): Promise<Anamnesis | undefined>;
  createAnamnesis(anamnesis: InsertAnamnesis): Promise<Anamnesis>;
  updateAnamnesis(id: string, data: Partial<InsertAnamnesis>): Promise<Anamnesis | undefined>;

  // Appointments
  getAppointments(startDate?: string, endDate?: string, dentistId?: string, isAdmin?: boolean): Promise<AppointmentWithPatient[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<AppointmentWithPatient[]>;
  getAppointmentsByDate(date: string, dentistId?: string, isAdmin?: boolean): Promise<AppointmentWithPatient[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Dental Records
  getRecord(id: string): Promise<DentalRecord | undefined>;
  getRecordsByPatient(patientId: string): Promise<DentalRecord[]>;
  getRecordsWithImagesByPatient(patientId: string): Promise<DentalRecordWithImages[]>;
  createRecord(record: InsertDentalRecord): Promise<DentalRecord>;
  updateRecord(id: string, data: Partial<InsertDentalRecord>): Promise<DentalRecord | undefined>;

  // Record Images
  getRecordImages(recordId: string): Promise<RecordImage[]>;
  createRecordImage(image: InsertRecordImage): Promise<RecordImage>;
  deleteRecordImage(id: string): Promise<boolean>;
  getRecordImage(id: string): Promise<RecordImage | undefined>;

  // Tooth Conditions (Odontogram)
  getToothCondition(id: string): Promise<ToothCondition | undefined>;
  getToothConditionsByPatient(patientId: string): Promise<ToothCondition[]>;
  getToothConditionsWithTreatmentsByPatient(patientId: string): Promise<ToothConditionWithTreatments[]>;
  createOrUpdateToothCondition(condition: InsertToothCondition): Promise<ToothCondition>;
  updateToothCondition(id: string, data: Partial<InsertToothCondition>): Promise<ToothCondition | undefined>;
  
  // Tooth Condition Treatments
  getToothConditionTreatments(toothConditionId: string): Promise<ToothConditionTreatmentWithDetails[]>;
  addToothConditionTreatment(data: InsertToothConditionTreatment): Promise<ToothConditionTreatment>;
  removeToothConditionTreatment(id: string): Promise<boolean>;
  clearToothConditionTreatments(toothConditionId: string): Promise<void>;

  // Settings
  getSettingsByUser(userId: string): Promise<DentistSettings | undefined>;
  createSettings(settings: InsertDentistSettings): Promise<DentistSettings>;
  updateSettings(id: string, data: Partial<InsertDentistSettings>): Promise<DentistSettings | undefined>;

  // Dashboard
  getDashboardStats(dentistId: string, isAdmin?: boolean): Promise<DashboardStats>;
  getBirthdayPatients(dentistId: string, isAdmin?: boolean): Promise<{ id: string; name: string; birthDate: string; phone: string | null; isBirthdayToday: boolean; hasAppointmentToday: boolean }[]>;

  // Treatments
  getAllTreatments(): Promise<Treatment[]>;
  getActiveTreatments(): Promise<Treatment[]>;
  createTreatment(treatment: InsertTreatment): Promise<Treatment>;
  updateTreatment(id: string, data: Partial<InsertTreatment>): Promise<Treatment | undefined>;
  deleteTreatment(id: string): Promise<boolean>;

  // Dentist Treatments
  getDentistTreatments(dentistId: string): Promise<Treatment[]>;
  getDentistTreatmentsWithDetails(dentistId: string): Promise<DentistTreatmentWithDetails[]>;
  addDentistTreatment(data: InsertDentistTreatment): Promise<DentistTreatment>;
  updateDentistTreatment(dentistId: string, treatmentId: string, data: { price?: number; customDuration?: number | null; legendColor?: string | null }): Promise<DentistTreatment | undefined>;
  removeDentistTreatment(dentistId: string, treatmentId: string): Promise<boolean>;

  // Budgets
  getBudgets(dentistId?: string): Promise<BudgetWithItems[]>;
  getBudgetsByPatient(patientId: string): Promise<BudgetWithItems[]>;
  getBudget(id: string): Promise<BudgetWithItems | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, data: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: string): Promise<boolean>;
  registerBudgetPayment(budgetId: string, amount: number, paymentMethod: string, description?: string): Promise<{ budget: Budget; transaction: FinancialTransaction }>;
  
  // Budget Items
  getBudgetItems(budgetId: string): Promise<BudgetItemWithTreatment[]>;
  addBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  updateBudgetItem(id: string, data: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined>;
  deleteBudgetItem(id: string): Promise<boolean>;

  // Appointment Requests
  getAppointmentRequests(): Promise<AppointmentRequestWithDetails[]>;
  createAppointmentRequest(request: InsertAppointmentRequest): Promise<AppointmentRequest>;
  updateAppointmentRequestStatus(id: string, status: string): Promise<AppointmentRequest | undefined>;

  // Clinic Settings
  getClinicSettings(): Promise<ClinicSettings | undefined>;
  updateClinicSettings(data: Partial<InsertClinicSettings>): Promise<ClinicSettings>;

  // Public APIs
  getPublicDentists(): Promise<PublicDentist[]>;

  // Financial Transactions
  getFinancialTransactions(dentistId: string, startDate?: string, endDate?: string, isAdmin?: boolean): Promise<FinancialTransactionWithDetails[]>;
  getFinancialTransaction(id: string): Promise<FinancialTransaction | undefined>;
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  updateFinancialTransaction(id: string, data: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction | undefined>;
  deleteFinancialTransaction(id: string): Promise<boolean>;

  // Treatment Costs
  getTreatmentCosts(dentistId: string): Promise<TreatmentCostWithDetails[]>;
  getTreatmentCost(treatmentId: string, dentistId: string): Promise<TreatmentCost | undefined>;
  createOrUpdateTreatmentCost(data: InsertTreatmentCost): Promise<TreatmentCost>;

  // Financial Reports
  getFinancialSummary(dentistId: string, startDate?: string, endDate?: string, isAdmin?: boolean): Promise<FinancialSummary>;
  getMonthlyFinancialData(dentistId: string, year: number, isAdmin?: boolean): Promise<MonthlyFinancialData[]>;
  getTreatmentFinancialReport(dentistId: string, startDate?: string, endDate?: string, isAdmin?: boolean): Promise<TreatmentFinancialReport[]>;
  getPatientFinancialReport(dentistId: string, isAdmin?: boolean): Promise<PatientFinancialReport[]>;
}

export class SQLiteStorage implements IStorage {
  // ========== USERS ==========
  async getUser(id: string): Promise<User | undefined> {
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
    return row;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
    return row;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
    return row;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO users (id, username, email, password, name, role, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, user.username, user.email, user.password, user.name, user.role || "dentist", createdAt);

    return { id, ...user, role: user.role || "dentist", createdAt };
  }

  async getAllDentists(): Promise<Omit<User, "password">[]> {
    const rows = db.prepare(`
      SELECT id, username, email, name, role, createdAt 
      FROM users 
      WHERE role IN ('dentist', 'admin') 
      ORDER BY name ASC
    `).all() as Omit<User, "password">[];
    return rows;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE users SET ${fields} WHERE id = ?`).run(...values, id);
    }

    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ========== PATIENTS ==========
  async getPatients(dentistId?: string, isAdmin?: boolean): Promise<Patient[]> {
    // Admin can see ALL patients
    if (isAdmin) {
      const rows = db.prepare("SELECT * FROM patients ORDER BY name ASC").all() as Patient[];
      return rows;
    }
    // Dentist can ONLY see patients assigned to them (dentistId matches their ID)
    if (dentistId) {
      const rows = db.prepare("SELECT * FROM patients WHERE dentistId = ? ORDER BY name ASC").all(dentistId) as Patient[];
      return rows;
    }
    // No dentistId provided and not admin - return empty
    return [];
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const row = db.prepare("SELECT * FROM patients WHERE id = ?").get(id) as Patient | undefined;
    return row;
  }

  async createPatient(patient: InsertPatient & { dentistId: string }): Promise<Patient> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const insertPatient = db.transaction(() => {
      const result = db.prepare("SELECT COALESCE(MAX(recordNumber), 0) + 1 as nextNum FROM patients").get() as { nextNum: number };
      const recordNumber = result.nextNum;

      db.prepare(`
        INSERT INTO patients (id, recordNumber, dentistId, name, cpf, birthDate, gender, phone, email, address, neighborhood, city, state, zipCode, notes, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        recordNumber,
        patient.dentistId,
        patient.name,
        patient.cpf || null,
        patient.birthDate || null,
        patient.gender || null,
        patient.phone || null,
        patient.email || null,
        patient.address || null,
        patient.neighborhood || null,
        patient.city || null,
        patient.state || null,
        patient.zipCode || null,
        patient.notes || null,
        createdAt
      );

      return recordNumber;
    });

    const recordNumber = insertPatient();

    return {
      id,
      recordNumber,
      dentistId: patient.dentistId,
      name: patient.name,
      cpf: patient.cpf || null,
      birthDate: patient.birthDate || null,
      gender: patient.gender || null,
      phone: patient.phone || null,
      email: patient.email || null,
      address: patient.address || null,
      neighborhood: patient.neighborhood || null,
      city: patient.city || null,
      state: patient.state || null,
      zipCode: patient.zipCode || null,
      notes: patient.notes || null,
      createdAt,
      updatedAt: null,
    };
  }

  async transferPatient(patientId: string, newDentistId: string): Promise<Patient | undefined> {
    const updatedAt = new Date().toISOString();
    db.prepare(`UPDATE patients SET dentistId = ?, updatedAt = ? WHERE id = ?`).run(newDentistId, updatedAt, patientId);
    return this.getPatient(patientId);
  }

  async updatePatient(id: string, data: Partial<InsertPatient>): Promise<Patient | undefined> {
    const updatedAt = new Date().toISOString();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE patients SET ${fields}, updatedAt = ? WHERE id = ?`).run(...values, updatedAt, id);
    }

    return this.getPatient(id);
  }

  async hasPatientTransactions(patientId: string): Promise<boolean> {
    const row = db.prepare("SELECT COUNT(*) as count FROM financial_transactions WHERE patientId = ?").get(patientId) as { count: number };
    return row.count > 0;
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM patients WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ========== ANAMNESIS ==========
  async getAnamnesis(id: string): Promise<Anamnesis | undefined> {
    const row = db.prepare("SELECT * FROM anamnesis WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    
    return {
      ...row,
      hasAllergies: !!row.hasAllergies,
      hasMedications: !!row.hasMedications,
      hasChronicDiseases: !!row.hasChronicDiseases,
      hasHeartProblems: !!row.hasHeartProblems,
      hasDiabetes: !!row.hasDiabetes,
      hasHypertension: !!row.hasHypertension,
      isPregnant: !!row.isPregnant,
      isSmoker: !!row.isSmoker,
      hasBleedingDisorder: !!row.hasBleedingDisorder,
    };
  }

  async getAnamnesisByPatient(patientId: string): Promise<Anamnesis | undefined> {
    const row = db.prepare("SELECT * FROM anamnesis WHERE patientId = ?").get(patientId) as any;
    if (!row) return undefined;
    
    return {
      ...row,
      hasAllergies: !!row.hasAllergies,
      hasMedications: !!row.hasMedications,
      hasChronicDiseases: !!row.hasChronicDiseases,
      hasHeartProblems: !!row.hasHeartProblems,
      hasDiabetes: !!row.hasDiabetes,
      hasHypertension: !!row.hasHypertension,
      isPregnant: !!row.isPregnant,
      isSmoker: !!row.isSmoker,
      hasBleedingDisorder: !!row.hasBleedingDisorder,
    };
  }

  async createAnamnesis(data: InsertAnamnesis): Promise<Anamnesis> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO anamnesis (id, patientId, hasAllergies, allergiesDescription, hasMedications, medicationsDescription,
        hasChronicDiseases, chronicDiseasesDescription, hasHeartProblems, hasDiabetes, hasHypertension,
        isPregnant, isSmoker, hasBleedingDisorder, previousDentalTreatments, observations, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.patientId,
      data.hasAllergies ? 1 : 0,
      data.allergiesDescription || null,
      data.hasMedications ? 1 : 0,
      data.medicationsDescription || null,
      data.hasChronicDiseases ? 1 : 0,
      data.chronicDiseasesDescription || null,
      data.hasHeartProblems ? 1 : 0,
      data.hasDiabetes ? 1 : 0,
      data.hasHypertension ? 1 : 0,
      data.isPregnant ? 1 : 0,
      data.isSmoker ? 1 : 0,
      data.hasBleedingDisorder ? 1 : 0,
      data.previousDentalTreatments || null,
      data.observations || null,
      createdAt
    );

    return (await this.getAnamnesisByPatient(data.patientId))!;
  }

  async updateAnamnesis(id: string, data: Partial<InsertAnamnesis>): Promise<Anamnesis | undefined> {
    const updatedAt = new Date().toISOString();
    const convertedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "boolean") {
        convertedData[key] = value ? 1 : 0;
      } else {
        convertedData[key] = value;
      }
    }

    const fields = Object.keys(convertedData).map(k => `${k} = ?`).join(", ");
    const values = Object.values(convertedData);

    if (fields) {
      db.prepare(`UPDATE anamnesis SET ${fields}, updatedAt = ? WHERE id = ?`).run(...values, updatedAt, id);
    }

    const row = db.prepare("SELECT * FROM anamnesis WHERE id = ?").get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      hasAllergies: !!row.hasAllergies,
      hasMedications: !!row.hasMedications,
      hasChronicDiseases: !!row.hasChronicDiseases,
      hasHeartProblems: !!row.hasHeartProblems,
      hasDiabetes: !!row.hasDiabetes,
      hasHypertension: !!row.hasHypertension,
      isPregnant: !!row.isPregnant,
      isSmoker: !!row.isSmoker,
      hasBleedingDisorder: !!row.hasBleedingDisorder,
    };
  }

  // ========== APPOINTMENTS ==========
  async getAppointments(startDate?: string, endDate?: string, dentistId?: string, isAdmin?: boolean): Promise<AppointmentWithPatient[]> {
    let query = `
      SELECT a.*, 
             p.id as patient_id, p.name as patient_name, p.cpf as patient_cpf, 
             p.birthDate as patient_birthDate, p.gender as patient_gender, 
             p.phone as patient_phone, p.email as patient_email, 
             p.address as patient_address, p.neighborhood as patient_neighborhood,
             p.city as patient_city, p.state as patient_state, p.zipCode as patient_zipCode, 
             p.notes as patient_notes, p.createdAt as patient_createdAt, 
             p.updatedAt as patient_updatedAt
      FROM appointments a
      LEFT JOIN patients p ON a.patientId = p.id
    `;
    const params: (string | undefined)[] = [];
    const conditions: string[] = [];

    if (!isAdmin && dentistId) {
      conditions.push("a.dentistId = ?");
      params.push(dentistId);
    }

    if (startDate && endDate) {
      conditions.push("a.date >= ? AND a.date <= ?");
      params.push(startDate, endDate);
    } else if (startDate) {
      conditions.push("a.date >= ?");
      params.push(startDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.date ASC, a.time ASC";

    const rows = db.prepare(query).all(...params.filter(p => p !== undefined)) as any[];

    return rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      dentistId: row.dentistId,
      date: row.date,
      time: row.time,
      duration: row.duration,
      status: row.status,
      type: row.type,
      notes: row.notes,
      createdAt: row.createdAt,
      patient: {
        id: row.patient_id,
        name: row.patient_name,
        cpf: row.patient_cpf,
        birthDate: row.patient_birthDate,
        gender: row.patient_gender,
        phone: row.patient_phone,
        email: row.patient_email,
        address: row.patient_address,
        neighborhood: row.patient_neighborhood,
        city: row.patient_city,
        state: row.patient_state,
        zipCode: row.patient_zipCode,
        notes: row.patient_notes,
        createdAt: row.patient_createdAt,
        updatedAt: row.patient_updatedAt,
      } as Patient,
    }));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const row = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as Appointment | undefined;
    return row;
  }

  async getAppointmentsByPatient(patientId: string): Promise<AppointmentWithPatient[]> {
    const rows = db.prepare(`
      SELECT a.*, 
             p.id as patient_id, p.name as patient_name, p.cpf as patient_cpf, 
             p.birthDate as patient_birthDate, p.gender as patient_gender, 
             p.phone as patient_phone, p.email as patient_email, 
             p.address as patient_address, p.neighborhood as patient_neighborhood,
             p.city as patient_city, p.state as patient_state, p.zipCode as patient_zipCode, 
             p.notes as patient_notes, p.createdAt as patient_createdAt, 
             p.updatedAt as patient_updatedAt
      FROM appointments a
      LEFT JOIN patients p ON a.patientId = p.id
      WHERE a.patientId = ?
      ORDER BY a.date DESC, a.time DESC
    `).all(patientId) as any[];

    return rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      dentistId: row.dentistId,
      date: row.date,
      time: row.time,
      duration: row.duration,
      status: row.status,
      type: row.type,
      notes: row.notes,
      createdAt: row.createdAt,
      patient: {
        id: row.patient_id,
        name: row.patient_name,
        cpf: row.patient_cpf,
        birthDate: row.patient_birthDate,
        gender: row.patient_gender,
        phone: row.patient_phone,
        email: row.patient_email,
        address: row.patient_address,
        neighborhood: row.patient_neighborhood,
        city: row.patient_city,
        state: row.patient_state,
        zipCode: row.patient_zipCode,
        notes: row.patient_notes,
        createdAt: row.patient_createdAt,
        updatedAt: row.patient_updatedAt,
      } as Patient,
    }));
  }

  async getAppointmentsByDate(date: string, dentistId?: string, isAdmin?: boolean): Promise<AppointmentWithPatient[]> {
    let query = `
      SELECT a.*, 
             p.id as patient_id, p.name as patient_name, p.cpf as patient_cpf, 
             p.birthDate as patient_birthDate, p.gender as patient_gender, 
             p.phone as patient_phone, p.email as patient_email, 
             p.address as patient_address, p.neighborhood as patient_neighborhood,
             p.city as patient_city, p.state as patient_state, p.zipCode as patient_zipCode, 
             p.notes as patient_notes, p.createdAt as patient_createdAt, 
             p.updatedAt as patient_updatedAt
      FROM appointments a
      LEFT JOIN patients p ON a.patientId = p.id
      WHERE a.date = ?
    `;
    const params: string[] = [date];

    if (!isAdmin && dentistId) {
      query += " AND a.dentistId = ?";
      params.push(dentistId);
    }

    query += " ORDER BY a.time ASC";

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      patientId: row.patientId,
      dentistId: row.dentistId,
      date: row.date,
      time: row.time,
      duration: row.duration,
      status: row.status,
      type: row.type,
      notes: row.notes,
      createdAt: row.createdAt,
      patient: {
        id: row.patient_id,
        name: row.patient_name,
        cpf: row.patient_cpf,
        birthDate: row.patient_birthDate,
        gender: row.patient_gender,
        phone: row.patient_phone,
        email: row.patient_email,
        address: row.patient_address,
        neighborhood: row.patient_neighborhood,
        city: row.patient_city,
        state: row.patient_state,
        zipCode: row.patient_zipCode,
        notes: row.patient_notes,
        createdAt: row.patient_createdAt,
        updatedAt: row.patient_updatedAt,
      } as Patient,
    }));
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO appointments (id, patientId, dentistId, date, time, duration, status, type, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      appointment.patientId,
      appointment.dentistId,
      appointment.date,
      appointment.time,
      appointment.duration || 30,
      appointment.status || "scheduled",
      appointment.type || null,
      appointment.notes || null,
      createdAt
    );

    return {
      id,
      patientId: appointment.patientId,
      dentistId: appointment.dentistId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration || 30,
      status: appointment.status || "scheduled",
      type: appointment.type || null,
      notes: appointment.notes || null,
      createdAt,
    };
  }

  async updateAppointment(id: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE appointments SET ${fields} WHERE id = ?`).run(...values, id);
    }

    const row = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id) as Appointment | undefined;
    return row;
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM appointments WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ========== DENTAL RECORDS ==========
  async getRecord(id: string): Promise<DentalRecord | undefined> {
    const row = db.prepare("SELECT * FROM dental_records WHERE id = ?").get(id) as DentalRecord | undefined;
    return row;
  }

  async getRecordsByPatient(patientId: string): Promise<DentalRecord[]> {
    const rows = db.prepare(`
      SELECT * FROM dental_records WHERE patientId = ? ORDER BY date DESC, createdAt DESC
    `).all(patientId) as DentalRecord[];
    return rows;
  }

  async createRecord(record: InsertDentalRecord): Promise<DentalRecord> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO dental_records (id, patientId, dentistId, appointmentId, date, procedure, teeth, description, observations, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      record.patientId,
      record.dentistId,
      record.appointmentId || null,
      record.date,
      record.procedure,
      record.teeth || null,
      record.description || null,
      record.observations || null,
      createdAt
    );

    return {
      id,
      patientId: record.patientId,
      dentistId: record.dentistId,
      appointmentId: record.appointmentId || null,
      date: record.date,
      procedure: record.procedure,
      teeth: record.teeth || null,
      description: record.description || null,
      observations: record.observations || null,
      createdAt,
    };
  }

  async updateRecord(id: string, data: Partial<InsertDentalRecord>): Promise<DentalRecord | undefined> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE dental_records SET ${fields} WHERE id = ?`).run(...values, id);
    }

    const row = db.prepare("SELECT * FROM dental_records WHERE id = ?").get(id) as DentalRecord | undefined;
    return row;
  }

  async getRecordsWithImagesByPatient(patientId: string): Promise<DentalRecordWithImages[]> {
    const records = db.prepare(`
      SELECT * FROM dental_records WHERE patientId = ? ORDER BY date DESC, createdAt DESC
    `).all(patientId) as DentalRecord[];
    
    return records.map(record => {
      const images = db.prepare(`
        SELECT * FROM record_images WHERE recordId = ? ORDER BY createdAt DESC
      `).all(record.id) as RecordImage[];
      
      return { ...record, images };
    });
  }

  // ========== RECORD IMAGES ==========
  async getRecordImages(recordId: string): Promise<RecordImage[]> {
    const rows = db.prepare(`
      SELECT * FROM record_images WHERE recordId = ? ORDER BY createdAt DESC
    `).all(recordId) as RecordImage[];
    return rows;
  }

  async getRecordImage(id: string): Promise<RecordImage | undefined> {
    const row = db.prepare("SELECT * FROM record_images WHERE id = ?").get(id) as RecordImage | undefined;
    return row;
  }

  async createRecordImage(image: InsertRecordImage): Promise<RecordImage> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO record_images (id, recordId, filename, originalName, mimeType, size, description, imageType, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      image.recordId,
      image.filename,
      image.originalName,
      image.mimeType,
      image.size,
      image.description || null,
      image.imageType || "exam",
      createdAt
    );

    return {
      id,
      recordId: image.recordId,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      description: image.description || null,
      imageType: image.imageType || "exam",
      createdAt,
    };
  }

  async deleteRecordImage(id: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM record_images WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ========== TOOTH CONDITIONS (ODONTOGRAM) ==========
  async getToothCondition(id: string): Promise<ToothCondition | undefined> {
    const row = db.prepare("SELECT * FROM tooth_conditions WHERE id = ?").get(id) as ToothCondition | undefined;
    return row;
  }

  async getToothConditionsByPatient(patientId: string): Promise<ToothCondition[]> {
    const rows = db.prepare(`
      SELECT * FROM tooth_conditions WHERE patientId = ? ORDER BY toothNumber ASC
    `).all(patientId) as ToothCondition[];
    return rows;
  }

  async createOrUpdateToothCondition(condition: InsertToothCondition): Promise<ToothCondition> {
    const existing = db.prepare(`
      SELECT * FROM tooth_conditions WHERE patientId = ? AND toothNumber = ?
    `).get(condition.patientId, condition.toothNumber) as ToothCondition | undefined;

    if (existing) {
      return (await this.updateToothCondition(existing.id, condition))!;
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO tooth_conditions (id, patientId, toothNumber, condition, surface, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      condition.patientId,
      condition.toothNumber,
      condition.condition,
      condition.surface || null,
      condition.notes || null,
      createdAt
    );

    return {
      id,
      patientId: condition.patientId,
      toothNumber: condition.toothNumber,
      condition: condition.condition,
      surface: condition.surface || null,
      notes: condition.notes || null,
      createdAt,
      updatedAt: null,
    };
  }

  async updateToothCondition(id: string, data: Partial<InsertToothCondition>): Promise<ToothCondition | undefined> {
    const updatedAt = new Date().toISOString();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE tooth_conditions SET ${fields}, updatedAt = ? WHERE id = ?`).run(...values, updatedAt, id);
    }

    const row = db.prepare("SELECT * FROM tooth_conditions WHERE id = ?").get(id) as ToothCondition | undefined;
    return row;
  }

  async getToothConditionsWithTreatmentsByPatient(patientId: string): Promise<ToothConditionWithTreatments[]> {
    const conditions = await this.getToothConditionsByPatient(patientId);
    const result: ToothConditionWithTreatments[] = [];

    for (const condition of conditions) {
      const treatments = await this.getToothConditionTreatments(condition.id);
      result.push({
        ...condition,
        treatments,
      });
    }

    return result;
  }

  // ========== TOOTH CONDITION TREATMENTS ==========
  async getToothConditionTreatments(toothConditionId: string): Promise<ToothConditionTreatmentWithDetails[]> {
    const rows = db.prepare(`
      SELECT tct.*, t.name, t.description, t.duration, t.isActive, t.createdAt as treatmentCreatedAt
      FROM tooth_condition_treatments tct
      INNER JOIN treatments t ON tct.treatmentId = t.id
      WHERE tct.toothConditionId = ?
      ORDER BY tct.createdAt ASC
    `).all(toothConditionId) as any[];

    return rows.map(row => ({
      id: row.id,
      toothConditionId: row.toothConditionId,
      treatmentId: row.treatmentId,
      surface: row.surface,
      notes: row.notes,
      createdAt: row.createdAt,
      treatment: {
        id: row.treatmentId,
        name: row.name,
        description: row.description,
        duration: row.duration,
        isActive: !!row.isActive,
        createdAt: row.treatmentCreatedAt,
      },
    }));
  }

  async addToothConditionTreatment(data: InsertToothConditionTreatment): Promise<ToothConditionTreatment> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO tooth_condition_treatments (id, toothConditionId, treatmentId, surface, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.toothConditionId, data.treatmentId, data.surface || null, data.notes || null, createdAt);

    return {
      id,
      toothConditionId: data.toothConditionId,
      treatmentId: data.treatmentId,
      surface: data.surface || null,
      notes: data.notes || null,
      createdAt,
    };
  }

  async removeToothConditionTreatment(id: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM tooth_condition_treatments WHERE id = ?").run(id);
    return result.changes > 0;
  }

  async clearToothConditionTreatments(toothConditionId: string): Promise<void> {
    db.prepare("DELETE FROM tooth_condition_treatments WHERE toothConditionId = ?").run(toothConditionId);
  }

  // ========== SETTINGS ==========
  async getSettingsByUser(userId: string): Promise<DentistSettings | undefined> {
    const row = db.prepare("SELECT * FROM dentist_settings WHERE userId = ?").get(userId) as any;
    if (!row) return undefined;

    return {
      ...row,
      workDays: JSON.parse(row.workDays || "[1,2,3,4,5]"),
    };
  }

  async createSettings(settings: InsertDentistSettings): Promise<DentistSettings> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO dentist_settings (id, userId, workDays, startTime, endTime, lunchStart, lunchEnd, appointmentDuration, clinicName, clinicAddress, clinicPhone, clinicEmail, clinicCep, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      settings.userId,
      JSON.stringify(settings.workDays || [1, 2, 3, 4, 5]),
      settings.startTime || "08:00",
      settings.endTime || "18:00",
      settings.lunchStart || "12:00",
      settings.lunchEnd || "13:00",
      settings.appointmentDuration || 30,
      settings.clinicName || "Odonto Ramalho",
      settings.clinicAddress || null,
      settings.clinicPhone || null,
      settings.clinicEmail || null,
      settings.clinicCep || null,
      createdAt
    );

    return (await this.getSettingsByUser(settings.userId))!;
  }

  async updateSettings(id: string, data: Partial<InsertDentistSettings>): Promise<DentistSettings | undefined> {
    const updatedAt = new Date().toISOString();
    const convertedData: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (key === "workDays" && Array.isArray(value)) {
        convertedData[key] = JSON.stringify(value);
      } else {
        convertedData[key] = value;
      }
    }

    const fields = Object.keys(convertedData).map(k => `${k} = ?`).join(", ");
    const values = Object.values(convertedData);

    if (fields) {
      db.prepare(`UPDATE dentist_settings SET ${fields}, updatedAt = ? WHERE id = ?`).run(...values, updatedAt, id);
    }

    const row = db.prepare("SELECT * FROM dentist_settings WHERE id = ?").get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      workDays: JSON.parse(row.workDays || "[1,2,3,4,5]"),
    };
  }

  // ========== DASHBOARD ==========
  async getDashboardStats(dentistId: string, isAdmin?: boolean): Promise<DashboardStats> {
    const today = new Date().toISOString().split("T")[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    let totalPatients: number;
    let todayAppointments: number;
    let weekAppointments: number;
    let completedToday: number;

    if (isAdmin) {
      totalPatients = (db.prepare("SELECT COUNT(*) as count FROM patients").get() as any).count;
      todayAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments WHERE date = ?
      `).get(today) as any).count;
      weekAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments WHERE date >= ? AND date <= ?
      `).get(today, weekEndStr) as any).count;
      completedToday = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments WHERE date = ? AND status = 'completed'
      `).get(today) as any).count;
    } else {
      totalPatients = (db.prepare("SELECT COUNT(*) as count FROM patients WHERE dentistId = ?").get(dentistId) as any).count;
      todayAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments WHERE date = ? AND dentistId = ?
      `).get(today, dentistId) as any).count;
      weekAppointments = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments WHERE date >= ? AND date <= ? AND dentistId = ?
      `).get(today, weekEndStr, dentistId) as any).count;
      completedToday = (db.prepare(`
        SELECT COUNT(*) as count FROM appointments WHERE date = ? AND status = 'completed' AND dentistId = ?
      `).get(today, dentistId) as any).count;
    }

    return {
      totalPatients,
      todayAppointments,
      weekAppointments,
      completedToday,
    };
  }

  async getBirthdayPatients(dentistId: string, isAdmin?: boolean): Promise<{ id: string; name: string; birthDate: string; phone: string | null; isBirthdayToday: boolean; hasAppointmentToday: boolean }[]> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
    const currentDay = String(today.getDate()).padStart(2, "0");
    const todayDate = `${currentYear}-${currentMonth}-${currentDay}`;

    let query = `
      SELECT id, name, birthDate, phone
      FROM patients
      WHERE birthDate IS NOT NULL
        AND substr(birthDate, 6, 2) = ?
    `;
    const params: string[] = [currentMonth];

    if (!isAdmin) {
      query += " AND dentistId = ?";
      params.push(dentistId);
    }

    query += " ORDER BY substr(birthDate, 9, 2) ASC, name ASC";

    const rows = db.prepare(query).all(...params) as { id: string; name: string; birthDate: string; phone: string | null }[];

    const result = rows.map(patient => {
      const birthDay = patient.birthDate.substring(8, 10);
      const isBirthdayToday = birthDay === currentDay;
      
      const appointmentCheck = isAdmin
        ? db.prepare("SELECT COUNT(*) as count FROM appointments WHERE patientId = ? AND date = ?").get(patient.id, todayDate) as { count: number }
        : db.prepare("SELECT COUNT(*) as count FROM appointments WHERE patientId = ? AND date = ? AND dentistId = ?").get(patient.id, todayDate, dentistId) as { count: number };
      
      return {
        ...patient,
        isBirthdayToday,
        hasAppointmentToday: appointmentCheck.count > 0,
      };
    });

    result.sort((a, b) => {
      if (a.isBirthdayToday && !b.isBirthdayToday) return -1;
      if (!a.isBirthdayToday && b.isBirthdayToday) return 1;
      if (a.hasAppointmentToday && !b.hasAppointmentToday) return -1;
      if (!a.hasAppointmentToday && b.hasAppointmentToday) return 1;
      return 0;
    });

    return result;
  }

  // ========== TREATMENTS ==========
  async getAllTreatments(): Promise<Treatment[]> {
    const rows = db.prepare("SELECT * FROM treatments ORDER BY name ASC").all() as any[];
    return rows.map(row => ({ ...row, isActive: !!row.isActive }));
  }

  async getActiveTreatments(): Promise<Treatment[]> {
    const rows = db.prepare("SELECT * FROM treatments WHERE isActive = 1 ORDER BY name ASC").all() as any[];
    return rows.map(row => ({ ...row, isActive: true }));
  }

  async createTreatment(treatment: InsertTreatment): Promise<Treatment> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO treatments (id, name, description, duration, isActive, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, treatment.name, treatment.description || null, treatment.duration || 30, treatment.isActive ? 1 : 0, createdAt);

    return {
      id,
      name: treatment.name,
      description: treatment.description || null,
      duration: treatment.duration || 30,
      isActive: treatment.isActive !== false,
      createdAt,
    };
  }

  async updateTreatment(id: string, data: Partial<InsertTreatment>): Promise<Treatment | undefined> {
    const convertedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "isActive") {
        convertedData[key] = value ? 1 : 0;
      } else {
        convertedData[key] = value;
      }
    }

    const fields = Object.keys(convertedData).map(k => `${k} = ?`).join(", ");
    const values = Object.values(convertedData);

    if (fields) {
      db.prepare(`UPDATE treatments SET ${fields} WHERE id = ?`).run(...values, id);
    }

    const row = db.prepare("SELECT * FROM treatments WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return { ...row, isActive: !!row.isActive };
  }

  async deleteTreatment(id: string): Promise<boolean> {
    // First remove from dentist_treatments
    db.prepare("DELETE FROM dentist_treatments WHERE treatmentId = ?").run(id);
    // Then delete the treatment
    const result = db.prepare("DELETE FROM treatments WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ========== DENTIST TREATMENTS ==========
  async getDentistTreatments(dentistId: string): Promise<Treatment[]> {
    const rows = db.prepare(`
      SELECT t.* FROM treatments t
      INNER JOIN dentist_treatments dt ON t.id = dt.treatmentId
      WHERE dt.dentistId = ? AND t.isActive = 1
      ORDER BY t.name ASC
    `).all(dentistId) as any[];
    return rows.map(row => ({ ...row, isActive: true }));
  }

  async getDentistTreatmentsWithDetails(dentistId: string): Promise<DentistTreatmentWithDetails[]> {
    const rows = db.prepare(`
      SELECT dt.*, t.name, t.description, t.duration, t.isActive, t.createdAt as treatmentCreatedAt
      FROM dentist_treatments dt
      INNER JOIN treatments t ON dt.treatmentId = t.id
      WHERE dt.dentistId = ? AND t.isActive = 1
      ORDER BY t.name ASC
    `).all(dentistId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      dentistId: row.dentistId,
      treatmentId: row.treatmentId,
      price: row.price || 0,
      customDuration: row.customDuration || null,
      legendColor: row.legendColor || null,
      createdAt: row.createdAt,
      treatment: {
        id: row.treatmentId,
        name: row.name,
        description: row.description,
        duration: row.duration,
        isActive: !!row.isActive,
        createdAt: row.treatmentCreatedAt,
      }
    }));
  }

  async addDentistTreatment(data: InsertDentistTreatment): Promise<DentistTreatment> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT OR IGNORE INTO dentist_treatments (id, dentistId, treatmentId, price, customDuration, legendColor, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.dentistId, data.treatmentId, data.price || 0, data.customDuration || null, data.legendColor || null, createdAt);

    return { 
      id, 
      dentistId: data.dentistId, 
      treatmentId: data.treatmentId, 
      price: data.price || 0,
      customDuration: data.customDuration || null,
      legendColor: data.legendColor || null,
      createdAt 
    };
  }

  async updateDentistTreatment(dentistId: string, treatmentId: string, data: { price?: number; customDuration?: number | null; legendColor?: string | null }): Promise<DentistTreatment | undefined> {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.price !== undefined) {
      updates.push("price = ?");
      values.push(data.price);
    }
    if (data.customDuration !== undefined) {
      updates.push("customDuration = ?");
      values.push(data.customDuration);
    }
    if (data.legendColor !== undefined) {
      updates.push("legendColor = ?");
      values.push(data.legendColor);
    }
    
    if (updates.length > 0) {
      db.prepare(`UPDATE dentist_treatments SET ${updates.join(", ")} WHERE dentistId = ? AND treatmentId = ?`)
        .run(...values, dentistId, treatmentId);
    }
    
    const row = db.prepare("SELECT * FROM dentist_treatments WHERE dentistId = ? AND treatmentId = ?")
      .get(dentistId, treatmentId) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      dentistId: row.dentistId,
      treatmentId: row.treatmentId,
      price: row.price || 0,
      customDuration: row.customDuration || null,
      legendColor: row.legendColor || null,
      createdAt: row.createdAt,
    };
  }

  async removeDentistTreatment(dentistId: string, treatmentId: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM dentist_treatments WHERE dentistId = ? AND treatmentId = ?").run(dentistId, treatmentId);
    return result.changes > 0;
  }

  // ========== BUDGETS ==========
  async getBudgetItems(budgetId: string): Promise<BudgetItemWithTreatment[]> {
    const rows = db.prepare(`
      SELECT bi.*, t.name, t.description, t.duration, t.isActive, t.createdAt as treatmentCreatedAt
      FROM budget_items bi
      INNER JOIN treatments t ON bi.treatmentId = t.id
      WHERE bi.budgetId = ?
      ORDER BY bi.createdAt ASC
    `).all(budgetId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      budgetId: row.budgetId,
      treatmentId: row.treatmentId,
      toothNumber: row.toothNumber,
      quantity: row.quantity || 1,
      unitPrice: row.unitPrice,
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      treatment: {
        id: row.treatmentId,
        name: row.name,
        description: row.description,
        duration: row.duration,
        isActive: !!row.isActive,
        createdAt: row.treatmentCreatedAt,
      }
    }));
  }

  async getBudgets(dentistId?: string): Promise<BudgetWithItems[]> {
    let query = `
      SELECT b.*, p.name as patient_name, p.cpf as patient_cpf, p.phone as patient_phone
      FROM budgets b
      LEFT JOIN patients p ON b.patientId = p.id
    `;
    const params: string[] = [];
    
    if (dentistId) {
      query += " WHERE b.dentistId = ?";
      params.push(dentistId);
    }
    
    query += " ORDER BY b.createdAt DESC";
    
    const rows = db.prepare(query).all(...params) as any[];
    
    const result: BudgetWithItems[] = [];
    for (const row of rows) {
      const items = await this.getBudgetItems(row.id);
      result.push({
        id: row.id,
        patientId: row.patientId,
        dentistId: row.dentistId,
        status: row.status,
        totalAmount: row.totalAmount || 0,
        discount: row.discount || 0,
        paidAmount: row.paidAmount || 0,
        paymentStatus: row.paymentStatus || "unpaid",
        notes: row.notes,
        validUntil: row.validUntil,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        items,
        patient: {
          id: row.patientId,
          recordNumber: 0,
          dentistId: row.dentistId,
          name: row.patient_name,
          cpf: row.patient_cpf,
          birthDate: null,
          gender: null,
          phone: row.patient_phone,
          email: null,
          address: null,
          neighborhood: null,
          city: null,
          state: null,
          zipCode: null,
          notes: null,
          createdAt: "",
          updatedAt: null,
        }
      });
    }
    
    return result;
  }

  async getBudgetsByPatient(patientId: string): Promise<BudgetWithItems[]> {
    const rows = db.prepare(`
      SELECT b.* FROM budgets b WHERE b.patientId = ? ORDER BY b.createdAt DESC
    `).all(patientId) as any[];
    
    const result: BudgetWithItems[] = [];
    for (const row of rows) {
      const items = await this.getBudgetItems(row.id);
      result.push({
        id: row.id,
        patientId: row.patientId,
        dentistId: row.dentistId,
        status: row.status,
        totalAmount: row.totalAmount || 0,
        discount: row.discount || 0,
        paidAmount: row.paidAmount || 0,
        paymentStatus: row.paymentStatus || "unpaid",
        notes: row.notes,
        validUntil: row.validUntil,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        items,
      });
    }
    
    return result;
  }

  async getBudget(id: string): Promise<BudgetWithItems | undefined> {
    const row = db.prepare(`
      SELECT b.*, p.name as patient_name, p.cpf as patient_cpf, p.phone as patient_phone,
             p.recordNumber as patient_recordNumber
      FROM budgets b
      LEFT JOIN patients p ON b.patientId = p.id
      WHERE b.id = ?
    `).get(id) as any;
    
    if (!row) return undefined;
    
    const items = await this.getBudgetItems(row.id);
    
    return {
      id: row.id,
      patientId: row.patientId,
      dentistId: row.dentistId,
      status: row.status,
      totalAmount: row.totalAmount || 0,
      discount: row.discount || 0,
      paidAmount: row.paidAmount || 0,
      paymentStatus: row.paymentStatus || "unpaid",
      notes: row.notes,
      validUntil: row.validUntil,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items,
      patient: {
        id: row.patientId,
        recordNumber: row.patient_recordNumber || 0,
        dentistId: row.dentistId,
        name: row.patient_name,
        cpf: row.patient_cpf,
        birthDate: null,
        gender: null,
        phone: row.patient_phone,
        email: null,
        address: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
        notes: null,
        createdAt: "",
        updatedAt: null,
      }
    };
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO budgets (id, patientId, dentistId, status, totalAmount, discount, notes, validUntil, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      budget.patientId,
      budget.dentistId,
      budget.status || "pending",
      budget.totalAmount || 0,
      budget.discount || 0,
      budget.notes || null,
      budget.validUntil || null,
      createdAt
    );

    return {
      id,
      patientId: budget.patientId,
      dentistId: budget.dentistId,
      status: budget.status || "pending",
      totalAmount: budget.totalAmount || 0,
      discount: budget.discount || 0,
      paidAmount: 0,
      paymentStatus: "unpaid" as const,
      notes: budget.notes || null,
      validUntil: budget.validUntil || null,
      createdAt,
      updatedAt: null,
    };
  }

  async updateBudget(id: string, data: Partial<InsertBudget>): Promise<Budget | undefined> {
    const updatedAt = new Date().toISOString();
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE budgets SET ${fields}, updatedAt = ? WHERE id = ?`).run(...values, updatedAt, id);
    }

    return db.prepare("SELECT * FROM budgets WHERE id = ?").get(id) as Budget | undefined;
  }

  async deleteBudget(id: string): Promise<boolean> {
    db.prepare("DELETE FROM budget_items WHERE budgetId = ?").run(id);
    const result = db.prepare("DELETE FROM budgets WHERE id = ?").run(id);
    return result.changes > 0;
  }

  async registerBudgetPayment(budgetId: string, amount: number, paymentMethod: string, description?: string): Promise<{ budget: Budget; transaction: FinancialTransaction }> {
    const budget = db.prepare("SELECT * FROM budgets WHERE id = ?").get(budgetId) as Budget | undefined;
    if (!budget) {
      throw new Error("Orçamento não encontrado");
    }

    const totalDue = (budget.totalAmount || 0) - (budget.discount || 0);
    const newPaidAmount = (budget.paidAmount || 0) + amount;
    
    // Determine payment status
    let paymentStatus: "unpaid" | "partial" | "paid" = "unpaid";
    let newBudgetStatus = budget.status;
    
    if (newPaidAmount >= totalDue) {
      paymentStatus = "paid";
      // Automatically mark budget as completed when fully paid
      newBudgetStatus = "completed";
    } else if (newPaidAmount > 0) {
      paymentStatus = "partial";
    }

    // Update budget with new payment info and status
    const updatedAt = new Date().toISOString();
    db.prepare(`
      UPDATE budgets SET paidAmount = ?, paymentStatus = ?, status = ?, updatedAt = ? WHERE id = ?
    `).run(newPaidAmount, paymentStatus, newBudgetStatus, updatedAt, budgetId);

    // Create financial transaction
    const transactionId = randomUUID();
    const date = new Date().toISOString().split("T")[0];
    const createdAt = new Date().toISOString();
    const patient = db.prepare("SELECT name FROM patients WHERE id = ?").get(budget.patientId) as { name: string } | undefined;
    const transactionDescription = description || `Pagamento orçamento - ${patient?.name || "Paciente"}`;

    db.prepare(`
      INSERT INTO financial_transactions (id, budgetId, patientId, dentistId, type, amount, paymentMethod, description, date, status, createdAt)
      VALUES (?, ?, ?, ?, 'income', ?, ?, ?, ?, 'completed', ?)
    `).run(transactionId, budgetId, budget.patientId, budget.dentistId, amount, paymentMethod, transactionDescription, date, createdAt);

    const updatedBudget = db.prepare("SELECT * FROM budgets WHERE id = ?").get(budgetId) as Budget;
    const transaction = db.prepare("SELECT * FROM financial_transactions WHERE id = ?").get(transactionId) as FinancialTransaction;

    return { budget: updatedBudget, transaction };
  }

  async addBudgetItem(item: InsertBudgetItem): Promise<BudgetItem> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO budget_items (id, budgetId, treatmentId, toothNumber, quantity, unitPrice, status, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      item.budgetId,
      item.treatmentId,
      item.toothNumber || null,
      item.quantity || 1,
      item.unitPrice,
      item.status || "pending",
      item.notes || null,
      createdAt
    );

    // Update budget total
    const budget = db.prepare("SELECT * FROM budgets WHERE id = ?").get(item.budgetId) as any;
    if (budget) {
      const items = db.prepare("SELECT SUM(unitPrice * quantity) as total FROM budget_items WHERE budgetId = ?").get(item.budgetId) as { total: number };
      db.prepare("UPDATE budgets SET totalAmount = ?, updatedAt = ? WHERE id = ?").run(items.total || 0, new Date().toISOString(), item.budgetId);
    }

    return {
      id,
      budgetId: item.budgetId,
      treatmentId: item.treatmentId,
      toothNumber: item.toothNumber || null,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice,
      status: item.status || "pending",
      notes: item.notes || null,
      createdAt,
    };
  }

  async updateBudgetItem(id: string, data: Partial<InsertBudgetItem>): Promise<BudgetItem | undefined> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE budget_items SET ${fields} WHERE id = ?`).run(...values, id);
    }

    const item = db.prepare("SELECT * FROM budget_items WHERE id = ?").get(id) as BudgetItem | undefined;
    
    // Update budget total
    if (item) {
      const items = db.prepare("SELECT SUM(unitPrice * quantity) as total FROM budget_items WHERE budgetId = ?").get(item.budgetId) as { total: number };
      db.prepare("UPDATE budgets SET totalAmount = ?, updatedAt = ? WHERE id = ?").run(items.total || 0, new Date().toISOString(), item.budgetId);
    }

    return item;
  }

  async deleteBudgetItem(id: string): Promise<boolean> {
    const item = db.prepare("SELECT budgetId FROM budget_items WHERE id = ?").get(id) as { budgetId: string } | undefined;
    const result = db.prepare("DELETE FROM budget_items WHERE id = ?").run(id);
    
    // Update budget total
    if (item) {
      const items = db.prepare("SELECT SUM(unitPrice * quantity) as total FROM budget_items WHERE budgetId = ?").get(item.budgetId) as { total: number };
      db.prepare("UPDATE budgets SET totalAmount = ?, updatedAt = ? WHERE id = ?").run(items.total || 0, new Date().toISOString(), item.budgetId);
    }

    return result.changes > 0;
  }

  // ========== APPOINTMENT REQUESTS ==========
  async getAppointmentRequests(): Promise<AppointmentRequestWithDetails[]> {
    const rows = db.prepare(`
      SELECT ar.*, t.name as treatmentName, t.description as treatmentDescription, t.duration as treatmentDuration,
             u.id as dentist_id, u.name as dentist_name, u.email as dentist_email
      FROM appointment_requests ar
      LEFT JOIN treatments t ON ar.treatmentId = t.id
      LEFT JOIN users u ON ar.dentistId = u.id
      ORDER BY ar.createdAt DESC
    `).all() as any[];

    return rows.map(row => ({
      id: row.id,
      patientName: row.patientName,
      patientPhone: row.patientPhone,
      patientEmail: row.patientEmail,
      treatmentId: row.treatmentId,
      dentistId: row.dentistId,
      preferredDate: row.preferredDate,
      notes: row.notes,
      status: row.status,
      createdAt: row.createdAt,
      treatment: {
        id: row.treatmentId,
        name: row.treatmentName,
        description: row.treatmentDescription,
        duration: row.treatmentDuration,
        isActive: true,
        createdAt: "",
      },
      dentist: row.dentist_id ? {
        id: row.dentist_id,
        username: "",
        email: row.dentist_email,
        name: row.dentist_name,
        role: "dentist",
        createdAt: "",
      } : undefined,
    }));
  }

  async createAppointmentRequest(request: InsertAppointmentRequest): Promise<AppointmentRequest> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO appointment_requests (id, patientName, patientPhone, patientEmail, treatmentId, dentistId, preferredDate, notes, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      id,
      request.patientName,
      request.patientPhone,
      request.patientEmail || null,
      request.treatmentId,
      request.dentistId || null,
      request.preferredDate || null,
      request.notes || null,
      createdAt
    );

    return {
      id,
      patientName: request.patientName,
      patientPhone: request.patientPhone,
      patientEmail: request.patientEmail || null,
      treatmentId: request.treatmentId,
      dentistId: request.dentistId || null,
      preferredDate: request.preferredDate || null,
      notes: request.notes || null,
      status: "pending",
      createdAt,
    };
  }

  async updateAppointmentRequestStatus(id: string, status: string): Promise<AppointmentRequest | undefined> {
    db.prepare("UPDATE appointment_requests SET status = ? WHERE id = ?").run(status, id);
    return db.prepare("SELECT * FROM appointment_requests WHERE id = ?").get(id) as AppointmentRequest | undefined;
  }

  // ========== CLINIC SETTINGS ==========
  async getClinicSettings(): Promise<ClinicSettings | undefined> {
    return db.prepare("SELECT * FROM clinic_settings LIMIT 1").get() as ClinicSettings | undefined;
  }

  async updateClinicSettings(data: Partial<InsertClinicSettings>): Promise<ClinicSettings> {
    const existing = await this.getClinicSettings();
    const updatedAt = new Date().toISOString();

    if (!existing) {
      const id = "clinic-main";
      db.prepare(`
        INSERT INTO clinic_settings (id, clinicName, clinicPhone, clinicWhatsApp, clinicEmail, clinicAddress, clinicDescription, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.clinicName || "Odonto Ramalho", data.clinicPhone || null, data.clinicWhatsApp || null, data.clinicEmail || null, data.clinicAddress || null, data.clinicDescription || null, updatedAt);
    } else {
      const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
      const values = Object.values(data);
      if (fields) {
        db.prepare(`UPDATE clinic_settings SET ${fields}, updatedAt = ? WHERE id = ?`).run(...values, updatedAt, existing.id);
      }
    }

    return (await this.getClinicSettings())!;
  }

  // ========== PUBLIC APIs ==========
  async getPublicDentists(): Promise<PublicDentist[]> {
    const dentists = db.prepare(`
      SELECT id, name FROM users WHERE role IN ('dentist', 'admin') ORDER BY name ASC
    `).all() as { id: string; name: string }[];

    const result: PublicDentist[] = [];
    for (const dentist of dentists) {
      const dentistTreatments = await this.getDentistTreatmentsWithDetails(dentist.id);
      if (dentistTreatments.length > 0) {
        result.push({ 
          id: dentist.id, 
          name: dentist.name, 
          treatments: dentistTreatments.map(dt => ({
            ...dt.treatment,
            price: dt.price,
            customDuration: dt.customDuration,
          }))
        });
      }
    }

    return result;
  }

  // ========== FINANCIAL TRANSACTIONS ==========
  async getFinancialTransactions(dentistId: string, startDate?: string, endDate?: string, isAdmin?: boolean): Promise<FinancialTransactionWithDetails[]> {
    let query = `
      SELECT ft.*, 
             p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
             b.id as budget_id, b.status as budget_status, b.totalAmount as budget_total
      FROM financial_transactions ft
      LEFT JOIN patients p ON ft.patientId = p.id
      LEFT JOIN budgets b ON ft.budgetId = b.id
    `;
    const params: string[] = [];
    const conditions: string[] = [];

    if (!isAdmin) {
      conditions.push("ft.dentistId = ?");
      params.push(dentistId);
    }

    if (startDate) {
      conditions.push("ft.date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("ft.date <= ?");
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY ft.date DESC, ft.createdAt DESC";

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      budgetId: row.budgetId,
      patientId: row.patientId,
      dentistId: row.dentistId,
      type: row.type as "income" | "expense",
      amount: row.amount,
      paymentMethod: row.paymentMethod,
      description: row.description,
      date: row.date,
      status: row.status,
      createdAt: row.createdAt,
      patient: row.patient_id ? {
        id: row.patient_id,
        recordNumber: 0,
        dentistId: row.dentistId,
        name: row.patient_name,
        cpf: null,
        birthDate: null,
        gender: null,
        phone: row.patient_phone,
        email: null,
        address: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
        notes: null,
        createdAt: "",
        updatedAt: null,
      } : undefined,
      budget: row.budget_id ? {
        id: row.budget_id,
        patientId: row.patientId,
        dentistId: row.dentistId,
        status: row.budget_status,
        totalAmount: row.budget_total || 0,
        discount: 0,
        paidAmount: 0,
        paymentStatus: "unpaid" as const,
        notes: null,
        validUntil: null,
        createdAt: "",
        updatedAt: null,
      } : undefined,
    }));
  }

  async getFinancialTransaction(id: string): Promise<FinancialTransaction | undefined> {
    const row = db.prepare("SELECT * FROM financial_transactions WHERE id = ?").get(id) as any;
    if (!row) return undefined;
    return {
      ...row,
      type: row.type as "income" | "expense",
    };
  }

  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO financial_transactions (id, budgetId, patientId, dentistId, type, amount, paymentMethod, description, date, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      transaction.budgetId || null,
      transaction.patientId || null,
      transaction.dentistId,
      transaction.type,
      transaction.amount,
      transaction.paymentMethod || null,
      transaction.description || null,
      transaction.date,
      transaction.status || "completed",
      createdAt
    );

    return {
      id,
      budgetId: transaction.budgetId || null,
      patientId: transaction.patientId || null,
      dentistId: transaction.dentistId,
      type: transaction.type,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod || null,
      description: transaction.description || null,
      date: transaction.date,
      status: transaction.status || "completed",
      createdAt,
    };
  }

  async updateFinancialTransaction(id: string, data: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction | undefined> {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const values = Object.values(data);

    if (fields) {
      db.prepare(`UPDATE financial_transactions SET ${fields} WHERE id = ?`).run(...values, id);
    }

    return this.getFinancialTransaction(id);
  }

  async deleteFinancialTransaction(id: string): Promise<boolean> {
    const result = db.prepare("DELETE FROM financial_transactions WHERE id = ?").run(id);
    return result.changes > 0;
  }

  // ========== TREATMENT COSTS ==========
  async getTreatmentCosts(dentistId: string): Promise<TreatmentCostWithDetails[]> {
    const rows = db.prepare(`
      SELECT tc.*, t.name, t.description, t.duration, t.isActive, t.createdAt as treatmentCreatedAt,
             dt.price
      FROM treatment_costs tc
      INNER JOIN treatments t ON tc.treatmentId = t.id
      LEFT JOIN dentist_treatments dt ON tc.treatmentId = dt.treatmentId AND tc.dentistId = dt.dentistId
      WHERE tc.dentistId = ?
      ORDER BY t.name ASC
    `).all(dentistId) as any[];

    return rows.map(row => {
      const totalCost = (row.materialCost || 0) + (row.laborCost || 0) + (row.overheadCost || 0);
      const price = row.price || 0;
      const profit = price - totalCost;
      const profitMargin = price > 0 ? (profit / price) * 100 : 0;

      return {
        id: row.id,
        treatmentId: row.treatmentId,
        dentistId: row.dentistId,
        materialCost: row.materialCost || 0,
        laborCost: row.laborCost || 0,
        overheadCost: row.overheadCost || 0,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        treatment: {
          id: row.treatmentId,
          name: row.name,
          description: row.description,
          duration: row.duration,
          isActive: !!row.isActive,
          createdAt: row.treatmentCreatedAt,
        },
        price,
        profit,
        profitMargin,
      };
    });
  }

  async getTreatmentCost(treatmentId: string, dentistId: string): Promise<TreatmentCost | undefined> {
    const row = db.prepare("SELECT * FROM treatment_costs WHERE treatmentId = ? AND dentistId = ?")
      .get(treatmentId, dentistId) as TreatmentCost | undefined;
    return row;
  }

  async createOrUpdateTreatmentCost(data: InsertTreatmentCost): Promise<TreatmentCost> {
    const existing = await this.getTreatmentCost(data.treatmentId, data.dentistId);
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE treatment_costs 
        SET materialCost = ?, laborCost = ?, overheadCost = ?, notes = ?, updatedAt = ?
        WHERE treatmentId = ? AND dentistId = ?
      `).run(data.materialCost, data.laborCost, data.overheadCost, data.notes || null, now, data.treatmentId, data.dentistId);
      return (await this.getTreatmentCost(data.treatmentId, data.dentistId))!;
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO treatment_costs (id, treatmentId, dentistId, materialCost, laborCost, overheadCost, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.treatmentId, data.dentistId, data.materialCost, data.laborCost, data.overheadCost, data.notes || null, now);

    return {
      id,
      treatmentId: data.treatmentId,
      dentistId: data.dentistId,
      materialCost: data.materialCost || 0,
      laborCost: data.laborCost || 0,
      overheadCost: data.overheadCost || 0,
      notes: data.notes || null,
      createdAt: now,
      updatedAt: null,
    };
  }

  // ========== FINANCIAL REPORTS ==========
  async getFinancialSummary(dentistId: string, startDate?: string, endDate?: string, isAdmin?: boolean): Promise<FinancialSummary> {
    let incomeQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE type = 'income' AND status = 'completed'";
    let expenseQuery = "SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE type = 'expense' AND status = 'completed'";
    
    const params: string[] = [];
    
    if (!isAdmin) {
      incomeQuery += " AND dentistId = ?";
      expenseQuery += " AND dentistId = ?";
      params.push(dentistId);
    }

    if (startDate) {
      incomeQuery += " AND date >= ?";
      expenseQuery += " AND date >= ?";
    }
    if (endDate) {
      incomeQuery += " AND date <= ?";
      expenseQuery += " AND date <= ?";
    }

    const dateParams = [startDate, endDate].filter(Boolean) as string[];
    
    const incomeResult = db.prepare(incomeQuery).get(...params, ...dateParams) as { total: number };
    const expenseResult = db.prepare(expenseQuery).get(...params, ...dateParams) as { total: number };

    // Calculate pending payments from budgets (excluding draft and rejected)
    // Pending = (totalAmount - discount - paidAmount) for pending/approved budgets
    // Use COALESCE to handle NULL values for discount and paidAmount
    let pendingBudgetQuery = `
      SELECT COALESCE(SUM((COALESCE(totalAmount, 0) - COALESCE(discount, 0)) - COALESCE(paidAmount, 0)), 0) as total 
      FROM budgets 
      WHERE status IN ('pending', 'approved') 
      AND ((COALESCE(totalAmount, 0) - COALESCE(discount, 0)) - COALESCE(paidAmount, 0)) > 0
    `;
    if (!isAdmin) {
      pendingBudgetQuery += " AND dentistId = ?";
    }
    const pendingBudgetResult = db.prepare(pendingBudgetQuery).get(...(isAdmin ? [] : [dentistId])) as { total: number };

    // Budget stats - exclude draft and rejected from value calculations
    // Use COALESCE to handle NULL values
    let budgetQuery = `
      SELECT status, COUNT(*) as count, 
             COALESCE(SUM(COALESCE(totalAmount, 0) - COALESCE(discount, 0)), 0) as total,
             COALESCE(SUM(COALESCE(paidAmount, 0)), 0) as totalPaid
      FROM budgets
      WHERE status NOT IN ('draft', 'rejected')
    `;
    if (!isAdmin) {
      budgetQuery += " AND dentistId = ?";
    }
    budgetQuery += " GROUP BY status";

    const budgetStats = db.prepare(budgetQuery).all(...(isAdmin ? [] : [dentistId])) as { status: string; count: number; total: number; totalPaid: number }[];

    const completedBudgets = budgetStats.find(s => s.status === "completed")?.count || 0;
    const approvedBudgets = budgetStats.find(s => s.status === "approved")?.count || 0;
    const pendingBudgetsCount = budgetStats.find(s => s.status === "pending")?.count || 0;
    
    // Total budget value only for non-draft/non-rejected budgets
    const totalBudgetValue = budgetStats.reduce((sum, s) => sum + (s.total || 0), 0);

    return {
      totalIncome: incomeResult.total || 0,
      totalExpenses: expenseResult.total || 0,
      netProfit: (incomeResult.total || 0) - (expenseResult.total || 0),
      pendingPayments: pendingBudgetResult.total || 0,
      completedBudgets,
      approvedBudgets,
      pendingBudgetsCount,
      totalBudgetValue,
    };
  }

  async getMonthlyFinancialData(dentistId: string, year: number, isAdmin?: boolean): Promise<MonthlyFinancialData[]> {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const month = m.toString().padStart(2, "0");
      const startDate = `${year}-${month}-01`;
      const endDate = m === 12 ? `${year + 1}-01-01` : `${year}-${(m + 1).toString().padStart(2, "0")}-01`;

      let incomeQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE type = 'income' AND status = 'completed' AND date >= ? AND date < ?`;
      let expenseQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE type = 'expense' AND status = 'completed' AND date >= ? AND date < ?`;

      if (!isAdmin) {
        incomeQuery += " AND dentistId = ?";
        expenseQuery += " AND dentistId = ?";
      }

      const params = isAdmin ? [startDate, endDate] : [startDate, endDate, dentistId];
      const incomeResult = db.prepare(incomeQuery).get(...params) as { total: number };
      const expenseResult = db.prepare(expenseQuery).get(...params) as { total: number };

      months.push({
        month: month,
        year,
        income: incomeResult.total || 0,
        expenses: expenseResult.total || 0,
        profit: (incomeResult.total || 0) - (expenseResult.total || 0),
      });
    }
    return months;
  }

  async getTreatmentFinancialReport(dentistId: string, startDate?: string, endDate?: string, isAdmin?: boolean): Promise<TreatmentFinancialReport[]> {
    let query = `
      SELECT bi.treatmentId, t.name as treatmentName,
             COUNT(*) as count,
             COALESCE(SUM(bi.unitPrice * bi.quantity), 0) as totalRevenue,
             COALESCE(AVG(bi.unitPrice), 0) as averagePrice
      FROM budget_items bi
      INNER JOIN budgets b ON bi.budgetId = b.id
      INNER JOIN treatments t ON bi.treatmentId = t.id
      WHERE bi.status = 'completed'
    `;
    const params: string[] = [];

    if (!isAdmin) {
      query += " AND b.dentistId = ?";
      params.push(dentistId);
    }

    if (startDate) {
      query += " AND b.createdAt >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND b.createdAt <= ?";
      params.push(endDate);
    }

    query += " GROUP BY bi.treatmentId, t.name ORDER BY totalRevenue DESC";

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      treatmentId: row.treatmentId,
      treatmentName: row.treatmentName,
      totalRevenue: row.totalRevenue || 0,
      totalCost: 0,
      profit: row.totalRevenue || 0,
      count: row.count || 0,
      averagePrice: row.averagePrice || 0,
    }));
  }

  async getPatientFinancialReport(dentistId: string, isAdmin?: boolean): Promise<PatientFinancialReport[]> {
    let query = `
      SELECT p.id as patientId, p.name as patientName,
             COALESCE(SUM(DISTINCT CASE WHEN ft.status = 'completed' AND ft.type = 'income' THEN ft.amount ELSE 0 END), 0) as totalPaid,
             COALESCE(
               (SELECT SUM(CASE WHEN b2.status IN ('approved', 'completed') THEN MAX(b2.totalAmount - b2.discount - b2.paidAmount, 0) ELSE 0 END)
                FROM budgets b2 WHERE b2.patientId = p.id), 0
             ) as totalPending,
             COUNT(DISTINCT b.id) as budgetsCount,
             MAX(CASE WHEN ft.status = 'completed' THEN ft.date ELSE NULL END) as lastPaymentDate
      FROM patients p
      LEFT JOIN financial_transactions ft ON p.id = ft.patientId AND ft.type = 'income'
      LEFT JOIN budgets b ON p.id = b.patientId
    `;
    const params: string[] = [];

    if (!isAdmin) {
      query += " WHERE p.dentistId = ?";
      params.push(dentistId);
    }

    query += " GROUP BY p.id, p.name HAVING (totalPaid > 0 OR totalPending > 0 OR budgetsCount > 0) ORDER BY totalPaid DESC";

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      patientId: row.patientId,
      patientName: row.patientName,
      totalPaid: row.totalPaid || 0,
      totalPending: row.totalPending || 0,
      budgetsCount: row.budgetsCount || 0,
      lastPaymentDate: row.lastPaymentDate || null,
    }));
  }
}

export const storage = new SQLiteStorage();
