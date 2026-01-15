import Database from "better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "data", "odonto.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'dentist',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    birthDate TEXT,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zipCode TEXT,
    notes TEXT,
    treatmentPlanNotes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS anamnesis (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    hasAllergies INTEGER DEFAULT 0,
    allergiesDescription TEXT,
    hasMedications INTEGER DEFAULT 0,
    medicationsDescription TEXT,
    hasChronicDiseases INTEGER DEFAULT 0,
    chronicDiseasesDescription TEXT,
    hasHeartProblems INTEGER DEFAULT 0,
    hasDiabetes INTEGER DEFAULT 0,
    hasHypertension INTEGER DEFAULT 0,
    isPregnant INTEGER DEFAULT 0,
    isSmoker INTEGER DEFAULT 0,
    hasBleedingDisorder INTEGER DEFAULT 0,
    previousDentalTreatments TEXT,
    observations TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    dentistId TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 30,
    status TEXT DEFAULT 'scheduled',
    type TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS dental_records (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    dentistId TEXT NOT NULL,
    appointmentId TEXT,
    date TEXT NOT NULL,
    procedure TEXT NOT NULL,
    teeth TEXT,
    description TEXT,
    observations TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tooth_conditions (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    toothNumber INTEGER NOT NULL,
    condition TEXT NOT NULL,
    surface TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    UNIQUE(patientId, toothNumber)
  );

  CREATE TABLE IF NOT EXISTS dentist_settings (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    workDays TEXT DEFAULT '[1,2,3,4,5]',
    startTime TEXT DEFAULT '08:00',
    endTime TEXT DEFAULT '18:00',
    lunchStart TEXT DEFAULT '12:00',
    lunchEnd TEXT DEFAULT '13:00',
    appointmentDuration INTEGER DEFAULT 30,
    clinicName TEXT DEFAULT 'Odonto Ramalho',
    clinicAddress TEXT,
    clinicPhone TEXT,
    clinicEmail TEXT,
    clinicCep TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS treatments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 30,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dentist_treatments (
    id TEXT PRIMARY KEY,
    dentistId TEXT NOT NULL,
    treatmentId TEXT NOT NULL,
    price REAL DEFAULT 0,
    customDuration INTEGER,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (treatmentId) REFERENCES treatments(id) ON DELETE CASCADE,
    UNIQUE(dentistId, treatmentId)
  );

  CREATE TABLE IF NOT EXISTS appointment_requests (
    id TEXT PRIMARY KEY,
    patientName TEXT NOT NULL,
    patientPhone TEXT NOT NULL,
    patientEmail TEXT,
    treatmentId TEXT NOT NULL,
    dentistId TEXT,
    preferredDate TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treatmentId) REFERENCES treatments(id) ON DELETE CASCADE,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS clinic_settings (
    id TEXT PRIMARY KEY,
    clinicName TEXT DEFAULT 'Odonto Ramalho',
    clinicPhone TEXT,
    clinicWhatsApp TEXT,
    clinicEmail TEXT,
    clinicAddress TEXT,
    clinicDescription TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    patientId TEXT NOT NULL,
    dentistId TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    totalAmount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    paymentStatus TEXT DEFAULT 'unpaid',
    notes TEXT,
    validUntil TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS budget_items (
    id TEXT PRIMARY KEY,
    budgetId TEXT NOT NULL,
    treatmentId TEXT NOT NULL,
    toothNumber INTEGER,
    quantity INTEGER DEFAULT 1,
    unitPrice REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budgetId) REFERENCES budgets(id) ON DELETE CASCADE,
    FOREIGN KEY (treatmentId) REFERENCES treatments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY,
    budgetId TEXT,
    patientId TEXT,
    dentistId TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    paymentMethod TEXT,
    description TEXT,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budgetId) REFERENCES budgets(id) ON DELETE SET NULL,
    FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS treatment_costs (
    id TEXT PRIMARY KEY,
    treatmentId TEXT NOT NULL,
    dentistId TEXT NOT NULL,
    materialCost REAL DEFAULT 0,
    laborCost REAL DEFAULT 0,
    overheadCost REAL DEFAULT 0,
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT,
    FOREIGN KEY (treatmentId) REFERENCES treatments(id) ON DELETE CASCADE,
    FOREIGN KEY (dentistId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(treatmentId, dentistId)
  );

  CREATE TABLE IF NOT EXISTS tooth_condition_treatments (
    id TEXT PRIMARY KEY,
    toothConditionId TEXT NOT NULL,
    treatmentId TEXT NOT NULL,
    surface TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (toothConditionId) REFERENCES tooth_conditions(id) ON DELETE CASCADE,
    FOREIGN KEY (treatmentId) REFERENCES treatments(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
  CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId);
  CREATE INDEX IF NOT EXISTS idx_dental_records_patient ON dental_records(patientId);
  CREATE INDEX IF NOT EXISTS idx_tooth_conditions_patient ON tooth_conditions(patientId);
  CREATE INDEX IF NOT EXISTS idx_appointment_requests_status ON appointment_requests(status);
  CREATE INDEX IF NOT EXISTS idx_budgets_patient ON budgets(patientId);
  CREATE INDEX IF NOT EXISTS idx_budgets_dentist ON budgets(dentistId);
  CREATE INDEX IF NOT EXISTS idx_budget_items_budget ON budget_items(budgetId);
  CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date);
  CREATE INDEX IF NOT EXISTS idx_financial_transactions_dentist ON financial_transactions(dentistId);
  CREATE INDEX IF NOT EXISTS idx_treatment_costs_treatment ON treatment_costs(treatmentId);
  CREATE INDEX IF NOT EXISTS idx_tooth_condition_treatments_condition ON tooth_condition_treatments(toothConditionId);
`);

// Migration: Add clinicEmail and clinicCep columns if they don't exist
try {
  db.prepare("ALTER TABLE dentist_settings ADD COLUMN clinicEmail TEXT").run();
} catch (e) {
  // Column may already exist
}
try {
  db.prepare("ALTER TABLE dentist_settings ADD COLUMN clinicCep TEXT").run();
} catch (e) {
  // Column may already exist
}

// Migration: Add dentistId column to patients table if it doesn't exist
try {
  db.prepare("ALTER TABLE patients ADD COLUMN dentistId TEXT REFERENCES users(id)").run();
  console.log("Migration: Added dentistId column to patients table");
} catch (e) {
  // Column may already exist
}

// Migration: Add neighborhood column to patients table if it doesn't exist
try {
  db.prepare("ALTER TABLE patients ADD COLUMN neighborhood TEXT").run();
  console.log("Migration: Added neighborhood column to patients table");
} catch (e) {
  // Column may already exist
}

// Create index for patient filtering by dentist
try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_patients_dentist ON patients(dentistId)");
} catch (e) {
  // Index may already exist
}

// Migration: Add recordNumber column to patients table if it doesn't exist
try {
  // First add column without UNIQUE constraint (SQLite limitation)
  db.prepare("ALTER TABLE patients ADD COLUMN recordNumber INTEGER").run();
  console.log("Migration: Added recordNumber column to patients table");
  
  // Assign sequential numbers to existing patients
  const existingPatients = db.prepare("SELECT id FROM patients ORDER BY createdAt ASC").all() as { id: string }[];
  existingPatients.forEach((patient, index) => {
    db.prepare("UPDATE patients SET recordNumber = ? WHERE id = ?").run(index + 1, patient.id);
  });
  console.log(`Migration: Assigned record numbers to ${existingPatients.length} existing patients`);
} catch (e: any) {
  if (e.message && e.message.includes("duplicate column name")) {
    console.log("Migration: recordNumber column already exists");
  } else {
    console.error("Migration error for recordNumber:", e.message);
  }
}

// Create unique index for recordNumber
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_record_number ON patients(recordNumber)");
  console.log("Migration: Created unique index for recordNumber");
} catch (e) {
  // Index may already exist
}

// Seed default treatments if none exist
const treatmentCount = db.prepare("SELECT COUNT(*) as count FROM treatments").get() as { count: number };
if (treatmentCount.count === 0) {
  const defaultTreatments = [
    { id: "treat-1", name: "Limpeza Dental", description: "Profilaxia e remoção de tártaro", duration: 30 },
    { id: "treat-2", name: "Clareamento Dental", description: "Clareamento profissional a laser ou moldeira", duration: 60 },
    { id: "treat-3", name: "Restauração", description: "Restauração em resina ou amálgama", duration: 45 },
    { id: "treat-4", name: "Extração", description: "Extração dentária simples ou complexa", duration: 45 },
    { id: "treat-5", name: "Canal", description: "Tratamento endodôntico", duration: 90 },
    { id: "treat-6", name: "Implante Dentário", description: "Colocação de implante osseointegrado", duration: 120 },
    { id: "treat-7", name: "Prótese Dentária", description: "Confecção e instalação de próteses", duration: 60 },
    { id: "treat-8", name: "Ortodontia", description: "Avaliação e tratamento ortodôntico", duration: 45 },
    { id: "treat-9", name: "Facetas de Porcelana", description: "Lentes de contato dental", duration: 90 },
    { id: "treat-10", name: "Consulta de Avaliação", description: "Avaliação inicial e diagnóstico", duration: 30 },
  ];
  
  const insertTreatment = db.prepare(`
    INSERT INTO treatments (id, name, description, duration, isActive, createdAt) 
    VALUES (?, ?, ?, ?, 1, datetime('now'))
  `);
  
  defaultTreatments.forEach(t => {
    insertTreatment.run(t.id, t.name, t.description, t.duration);
  });
  console.log("Seed: Created default treatments");
}

// Seed clinic settings if none exist
const clinicCount = db.prepare("SELECT COUNT(*) as count FROM clinic_settings").get() as { count: number };
if (clinicCount.count === 0) {
  db.prepare(`
    INSERT INTO clinic_settings (id, clinicName, clinicDescription) 
    VALUES ('clinic-main', 'Odonto Ramalho', 'Sua saúde bucal é nossa prioridade. Oferecemos tratamentos odontológicos de alta qualidade com profissionais experientes.')
  `).run();
  console.log("Seed: Created clinic settings");
}

// Migration: Add price and customDuration columns to dentist_treatments if they don't exist
try {
  db.prepare("ALTER TABLE dentist_treatments ADD COLUMN price REAL DEFAULT 0").run();
  console.log("Migration: Added price column to dentist_treatments");
} catch (e) {
  // Column may already exist
}
try {
  db.prepare("ALTER TABLE dentist_treatments ADD COLUMN customDuration INTEGER").run();
  console.log("Migration: Added customDuration column to dentist_treatments");
} catch (e) {
  // Column may already exist
}
try {
  db.prepare("ALTER TABLE dentist_treatments ADD COLUMN legendColor TEXT").run();
  console.log("Migration: Added legendColor column to dentist_treatments");
} catch (e) {
  // Column may already exist
}

// Seed dentist treatments for existing dentists (if none exist)
const dentistTreatmentCount = db.prepare("SELECT COUNT(*) as count FROM dentist_treatments").get() as { count: number };
if (dentistTreatmentCount.count === 0) {
  const dentists = db.prepare("SELECT id FROM users WHERE role IN ('dentist', 'admin')").all() as { id: string }[];
  const allTreatments = db.prepare("SELECT id FROM treatments WHERE isActive = 1").all() as { id: string }[];
  
  if (dentists.length > 0 && allTreatments.length > 0) {
    const insertDentistTreatment = db.prepare(`
      INSERT INTO dentist_treatments (id, dentistId, treatmentId, createdAt) 
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    dentists.forEach(dentist => {
      allTreatments.forEach(treatment => {
        insertDentistTreatment.run(`dt-${dentist.id.slice(0, 8)}-${treatment.id}`, dentist.id, treatment.id);
      });
    });
    console.log(`Seed: Assigned ${allTreatments.length} treatments to ${dentists.length} dentists`);
  }
}

// Migration: Add paidAmount and paymentStatus columns to budgets
try {
  db.prepare("ALTER TABLE budgets ADD COLUMN paidAmount REAL DEFAULT 0").run();
  console.log("Migration: Added paidAmount column to budgets");
} catch (e) {
  // Column may already exist
}
try {
  db.prepare("ALTER TABLE budgets ADD COLUMN paymentStatus TEXT DEFAULT 'unpaid'").run();
  console.log("Migration: Added paymentStatus column to budgets");
} catch (e) {
  // Column may already exist
}

// Migration: Add treatmentPlanNotes column to patients table
try {
  db.prepare("ALTER TABLE patients ADD COLUMN treatmentPlanNotes TEXT").run();
  console.log("Migration: Added treatmentPlanNotes column to patients table");
} catch (e) {
  // Column may already exist
}

// Create record_images table for storing dental record images
db.exec(`
  CREATE TABLE IF NOT EXISTS record_images (
    id TEXT PRIMARY KEY,
    recordId TEXT NOT NULL,
    filename TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size INTEGER NOT NULL,
    description TEXT,
    imageType TEXT DEFAULT 'exam',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recordId) REFERENCES dental_records(id) ON DELETE CASCADE
  );
  
  CREATE INDEX IF NOT EXISTS idx_record_images_record ON record_images(recordId);
`);

export default db;
