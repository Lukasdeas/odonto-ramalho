import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import express from "express";
import path from "path";
import { storage } from "./storage";
import { sendEmailNotification } from "./email";
import { upload, UPLOADS_PATH, deleteFile } from "./upload";
import db from "./db";
import {
  insertUserSchema,
  loginSchema,
  insertPatientSchema,
  insertAnamnesisSchema,
  insertAppointmentSchema,
  insertDentalRecordSchema,
  insertToothConditionSchema,
  insertDentistSettingsSchema,
  transferPatientSchema,
  insertAppointmentRequestSchema,
  insertTreatmentSchema,
  insertClinicSettingsSchema,
  insertBudgetSchema,
  insertBudgetItemSchema,
  insertContactMessageSchema,
  insertFinancialTransactionSchema,
  insertTreatmentCostSchema,
  insertRecordImageSchema,
} from "@shared/schema";

// ==================== SECURITY HELPERS ====================
function sanitizeString(str: string | null | undefined): string | null {
  if (!str) return null;
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

function sanitizePatientData(data: any): any {
  return {
    ...data,
    name: sanitizeString(data.name) || data.name,
    cpf: data.cpf ? data.cpf.replace(/[^\d.-]/g, '') : data.cpf,
    phone: data.phone ? data.phone.replace(/[^\d()\s-+]/g, '') : data.phone,
    email: sanitizeString(data.email),
    address: sanitizeString(data.address),
    city: sanitizeString(data.city),
    notes: sanitizeString(data.notes),
  };
}

function maskCPF(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `***.***.${digits.slice(6, 9)}-**`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return phone;
  return `****-${digits.slice(-4)}`;
}

function getJwtSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("ERRO FATAL: SESSION_SECRET nao esta definido em producao!");
    console.error("Configure a variavel de ambiente SESSION_SECRET antes de iniciar.");
    process.exit(1);
  }
  return secret || "odonto-ramalho-dev-secret-key-2024";
}

const JWT_SECRET = getJwtSecret();

interface AuthRequest extends Request {
  user?: { id: string; username: string; email: string; name: string; role: string };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores podem acessar este recurso." });
  }
  next();
}

function isAdmin(user: { role: string } | undefined): boolean {
  return user?.role === "admin";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==================== AUTH ====================
  // Registration is now protected - only admins can create new users
  // New users are created through the dentists management page
  app.post("/api/auth/register", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username já existe" });
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(400).json({ message: error.message || "Erro ao registrar" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "8h" }
      );

      const { password, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Erro no login" });
    }
  });

  // ==================== DASHBOARD ====================
  app.get("/api/dashboard/stats", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userIsAdmin = isAdmin(req.user);
      const stats = await storage.getDashboardStats(req.user!.id, userIsAdmin);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/dashboard/birthdays", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userIsAdmin = isAdmin(req.user);
      const birthdays = await storage.getBirthdayPatients(req.user!.id, userIsAdmin);
      res.json(birthdays);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== DENTISTS (Admin only) ====================
  app.get("/api/dentists", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const dentists = await storage.getAllDentists();
      res.json(dentists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dentists", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertUserSchema.parse({ ...req.body, role: req.body.role || "dentist" });

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username já existe" });
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/dentists/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      if (req.params.id === req.user!.id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta" });
      }
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Dentista não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== PATIENTS ====================
  app.get("/api/patients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userIsAdmin = isAdmin(req.user);
      const patients = await storage.getPatients(req.user!.id, userIsAdmin);
      res.json(patients);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      // Admin can access any patient
      // Dentist can ONLY access patients where dentistId matches their ID
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      res.json(patient);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const sanitizedData = sanitizePatientData(req.body);
      const data = insertPatientSchema.parse(sanitizedData);
      const userIsAdmin = isAdmin(req.user);
      let dentistId = req.user!.id;
      
      if (userIsAdmin && data.dentistId) {
        const targetDentist = await storage.getUser(data.dentistId);
        if (targetDentist && (targetDentist.role === "dentist" || targetDentist.role === "admin")) {
          dentistId = data.dentistId;
        }
      }
      
      const patient = await storage.createPatient({ ...data, dentistId });
      res.status(201).json(patient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/patients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      // Admin can edit any patient
      // Dentist can ONLY edit patients where dentistId matches their ID
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar este paciente" });
      }
      
      const sanitizedData = sanitizePatientData(req.body);
      const data = insertPatientSchema.partial().parse(sanitizedData);
      const updatedPatient = await storage.updatePatient(req.params.id, data);
      res.json(updatedPatient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/patients/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      // Admin can delete any patient
      // Dentist can ONLY delete patients where dentistId matches their ID
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este paciente" });
      }
      
      // Check if patient has financial transactions
      const hasTransactions = await storage.hasPatientTransactions(req.params.id);
      if (hasTransactions) {
        return res.status(400).json({ message: "Não é possível excluir este paciente pois existem transações financeiras vinculadas a ele" });
      }
      
      const deleted = await storage.deletePatient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/patients/:id/transfer", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const { newDentistId } = transferPatientSchema.parse(req.body);
      
      const newDentist = await storage.getUser(newDentistId);
      if (!newDentist || (newDentist.role !== "dentist" && newDentist.role !== "admin")) {
        return res.status(400).json({ message: "Dentista de destino inválido" });
      }
      
      const updatedPatient = await storage.transferPatient(req.params.id, newDentistId);
      res.json(updatedPatient);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Patient Anamnesis
  app.get("/api/patients/:id/anamnesis", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const anamnesis = await storage.getAnamnesisByPatient(req.params.id);
      res.json(anamnesis || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Patient Appointments
  app.get("/api/patients/:id/appointments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const appointments = await storage.getAppointmentsByPatient(req.params.id);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Patient Records
  app.get("/api/patients/:id/records", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const records = await storage.getRecordsByPatient(req.params.id);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== ANAMNESIS ====================
  app.post("/api/anamnesis", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertAnamnesisSchema.parse(req.body);
      
      // Verify user has access to this patient
      const patient = await storage.getPatient(data.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const anamnesis = await storage.createAnamnesis(data);
      res.status(201).json(anamnesis);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/anamnesis/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertAnamnesisSchema.partial().parse(req.body);
      
      // Always verify access by fetching the existing anamnesis and its patient
      const existingAnamnesis = await storage.getAnamnesis(req.params.id);
      if (!existingAnamnesis) {
        return res.status(404).json({ message: "Anamnese não encontrada" });
      }
      
      // Verify access to the patient that owns this anamnesis
      const patient = await storage.getPatient(existingAnamnesis.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar esta anamnese" });
      }
      
      // If trying to change the patientId, verify access to the new patient too
      if (data.patientId && data.patientId !== existingAnamnesis.patientId) {
        const newPatient = await storage.getPatient(data.patientId);
        if (!newPatient) {
          return res.status(404).json({ message: "Novo paciente não encontrado" });
        }
        if (!userIsAdmin && newPatient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para mover esta anamnese para outro paciente" });
        }
      }
      
      const anamnesis = await storage.updateAnamnesis(req.params.id, data);
      if (!anamnesis) {
        return res.status(404).json({ message: "Anamnese não encontrada" });
      }
      res.json(anamnesis);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== APPOINTMENTS ====================
  app.get("/api/appointments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, date } = req.query as { startDate?: string; endDate?: string; date?: string };
      const userIsAdmin = isAdmin(req.user);
      
      if (date) {
        const appointments = await storage.getAppointmentsByDate(date, req.user!.id, userIsAdmin);
        return res.json(appointments);
      }
      
      const appointments = await storage.getAppointments(startDate, endDate, req.user!.id, userIsAdmin);
      res.json(appointments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appointments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertAppointmentSchema.parse({
        ...req.body,
        dentistId: req.body.dentistId || req.user!.id,
      });
      
      // Verify user has access to this patient
      const patient = await storage.getPatient(data.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para criar agendamento para este paciente" });
      }
      
      const appointment = await storage.createAppointment(data);
      res.status(201).json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/appointments/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertAppointmentSchema.partial().parse(req.body);
      
      // Get the existing appointment to verify ownership
      const existingAppointment = await storage.getAppointment(req.params.id);
      
      if (!existingAppointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && existingAppointment.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar este agendamento" });
      }
      
      // If trying to change the patientId, verify access to the new patient
      if (data.patientId && data.patientId !== existingAppointment.patientId) {
        const newPatient = await storage.getPatient(data.patientId);
        if (!newPatient) {
          return res.status(404).json({ message: "Novo paciente não encontrado" });
        }
        if (!userIsAdmin && newPatient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para agendar para este paciente" });
        }
      }
      
      const appointment = await storage.updateAppointment(req.params.id, data);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/appointments/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Get the appointment first to verify ownership
      const existingAppointment = await storage.getAppointment(req.params.id);
      
      if (!existingAppointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && existingAppointment.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este agendamento" });
      }
      
      const deleted = await storage.deleteAppointment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== DENTAL RECORDS ====================
  app.get("/api/records", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { patientId } = req.query as { patientId?: string };
      if (!patientId) {
        return res.status(400).json({ message: "patientId é obrigatório" });
      }
      
      // Verify user has access to this patient
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const records = await storage.getRecordsByPatient(patientId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/records", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertDentalRecordSchema.parse({
        ...req.body,
        dentistId: req.body.dentistId || req.user!.id,
      });
      
      // Verify user has access to this patient
      const patient = await storage.getPatient(data.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const record = await storage.createRecord(data);
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/records/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertDentalRecordSchema.partial().parse(req.body);
      
      // Always verify access by fetching the existing record
      const existingRecord = await storage.getRecord(req.params.id);
      if (!existingRecord) {
        return res.status(404).json({ message: "Registro não encontrado" });
      }
      
      // Verify access to the patient that owns this record
      const patient = await storage.getPatient(existingRecord.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar este registro" });
      }
      
      // If trying to change the patientId, verify access to the new patient
      if (data.patientId && data.patientId !== existingRecord.patientId) {
        const newPatient = await storage.getPatient(data.patientId);
        if (!newPatient) {
          return res.status(404).json({ message: "Novo paciente não encontrado" });
        }
        if (!userIsAdmin && newPatient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para mover este registro para outro paciente" });
        }
      }
      
      const record = await storage.updateRecord(req.params.id, data);
      if (!record) {
        return res.status(404).json({ message: "Registro não encontrado" });
      }
      res.json(record);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get records with images
  app.get("/api/records-with-images", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { patientId } = req.query as { patientId?: string };
      if (!patientId) {
        return res.status(400).json({ message: "patientId é obrigatório" });
      }
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const records = await storage.getRecordsWithImagesByPatient(patientId);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== RECORD IMAGES ====================
  // Middleware that accepts token via header OR query parameter (for img tags)
  function imageAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    // Try header first
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      // Fallback to query parameter for img tags
      token = req.query.token as string;
    }
    
    if (!token) {
      return res.status(401).json({ message: "Token não fornecido" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Token inválido" });
    }
  }

  // Secure file serving with authentication and access control
  app.get("/api/uploads/:filename", imageAuthMiddleware, async (req: AuthRequest, res) => {
    try {
      const { filename } = req.params;
      
      // Find the image record to verify access
      const imageRecord = db.prepare("SELECT * FROM record_images WHERE filename = ?").get(filename) as any;
      if (!imageRecord) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      const record = await storage.getRecord(imageRecord.recordId);
      if (!record) {
        return res.status(404).json({ message: "Registro não encontrado" });
      }

      const patient = await storage.getPatient(record.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este arquivo" });
      }

      const filePath = path.join(UPLOADS_PATH, filename);
      const fs = await import("fs");
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado no servidor" });
      }

      res.setHeader("Content-Type", imageRecord.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${imageRecord.originalName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Upload images to a record
  app.post("/api/records/:recordId/images", authMiddleware, upload.array("images", 10), async (req: AuthRequest, res) => {
    try {
      const recordId = req.params.recordId;
      
      const record = await storage.getRecord(recordId);
      if (!record) {
        return res.status(404).json({ message: "Registro não encontrado" });
      }
      
      const patient = await storage.getPatient(record.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para adicionar imagens a este registro" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const imageType = (req.body.imageType as string) || "exam";
      const description = (req.body.description as string) || null;

      const savedImages = await Promise.all(
        files.map(async (file) => {
          const imageData = insertRecordImageSchema.parse({
            recordId,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            description,
            imageType,
          });
          return storage.createRecordImage(imageData);
        })
      );

      res.status(201).json(savedImages);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get images for a record
  app.get("/api/records/:recordId/images", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const record = await storage.getRecord(req.params.recordId);
      if (!record) {
        return res.status(404).json({ message: "Registro não encontrado" });
      }
      
      const patient = await storage.getPatient(record.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para ver as imagens deste registro" });
      }

      const images = await storage.getRecordImages(req.params.recordId);
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete an image
  app.delete("/api/record-images/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const image = await storage.getRecordImage(req.params.id);
      if (!image) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }

      const record = await storage.getRecord(image.recordId);
      if (!record) {
        return res.status(404).json({ message: "Registro não encontrado" });
      }
      
      const patient = await storage.getPatient(record.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para deletar esta imagem" });
      }

      deleteFile(image.filename);
      await storage.deleteRecordImage(req.params.id);
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== ODONTOGRAM ====================
  app.get("/api/odontogram/:patientId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      // Verify user has access to this patient
      const patient = await storage.getPatient(req.params.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const conditions = await storage.getToothConditionsByPatient(req.params.patientId);
      res.json(conditions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/odontogram", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertToothConditionSchema.parse(req.body);
      
      // Verify user has access to this patient
      const patient = await storage.getPatient(data.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const condition = await storage.createOrUpdateToothCondition(data);
      res.status(201).json(condition);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/odontogram/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertToothConditionSchema.partial().parse(req.body);
      
      // Always verify access by fetching the existing condition
      const existingCondition = await storage.getToothCondition(req.params.id);
      if (!existingCondition) {
        return res.status(404).json({ message: "Condição não encontrada" });
      }
      
      // Verify access to the patient that owns this condition
      const patient = await storage.getPatient(existingCondition.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar esta condição" });
      }
      
      // If trying to change the patientId, verify access to the new patient
      if (data.patientId && data.patientId !== existingCondition.patientId) {
        const newPatient = await storage.getPatient(data.patientId);
        if (!newPatient) {
          return res.status(404).json({ message: "Novo paciente não encontrado" });
        }
        if (!userIsAdmin && newPatient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para mover esta condição para outro paciente" });
        }
      }
      
      const condition = await storage.updateToothCondition(req.params.id, data);
      if (!condition) {
        return res.status(404).json({ message: "Condição não encontrada" });
      }
      res.json(condition);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get odontogram with treatments
  app.get("/api/odontogram/:patientId/with-treatments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      const conditions = await storage.getToothConditionsWithTreatmentsByPatient(req.params.patientId);
      res.json(conditions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tooth Condition Treatments
  app.post("/api/odontogram/:conditionId/treatments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const existingCondition = await storage.getToothCondition(req.params.conditionId);
      if (!existingCondition) {
        return res.status(404).json({ message: "Condição não encontrada" });
      }
      
      const patient = await storage.getPatient(existingCondition.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar esta condição" });
      }
      
      const { treatmentId, surface, notes } = req.body;
      const treatment = await storage.addToothConditionTreatment({
        toothConditionId: req.params.conditionId,
        treatmentId,
        surface,
        notes,
      });
      res.status(201).json(treatment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/odontogram/treatments/:treatmentId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.removeToothConditionTreatment(req.params.treatmentId);
      if (!deleted) {
        return res.status(404).json({ message: "Tratamento não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save tooth condition with treatments in one request
  app.post("/api/odontogram/save-with-treatments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { patientId, toothNumber, condition, surface, notes, treatments } = req.body;
      
      // Validate required fields
      if (!patientId || typeof patientId !== 'string') {
        return res.status(400).json({ message: "ID do paciente é obrigatório" });
      }
      if (!toothNumber || typeof toothNumber !== 'number') {
        return res.status(400).json({ message: "Número do dente é obrigatório" });
      }
      if (!condition || typeof condition !== 'string') {
        return res.status(400).json({ message: "Condição é obrigatória" });
      }
      
      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para acessar este paciente" });
      }
      
      // Validate treatments array if provided
      const validTreatments: { treatmentId: string; surface: string; notes: string }[] = [];
      if (treatments && Array.isArray(treatments)) {
        for (const t of treatments) {
          if (!t.treatmentId || typeof t.treatmentId !== 'string') {
            return res.status(400).json({ message: "Cada tratamento deve ter um ID válido" });
          }
          validTreatments.push({
            treatmentId: t.treatmentId,
            surface: t.surface || '',
            notes: t.notes || '',
          });
        }
      }
      
      // Create or update tooth condition
      const toothCondition = await storage.createOrUpdateToothCondition({
        patientId,
        toothNumber,
        condition,
        surface: surface || '',
        notes: notes || '',
      });
      
      // Clear existing treatments and add new ones
      await storage.clearToothConditionTreatments(toothCondition.id);
      
      for (const t of validTreatments) {
        await storage.addToothConditionTreatment({
          toothConditionId: toothCondition.id,
          treatmentId: t.treatmentId,
          surface: t.surface,
          notes: t.notes,
        });
      }
      
      // Return condition with treatments
      const conditionsWithTreatments = await storage.getToothConditionsWithTreatmentsByPatient(patientId);
      const resultCondition = conditionsWithTreatments.find(c => c.id === toothCondition.id);
      
      res.status(201).json(resultCondition);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== SETTINGS ====================
  app.get("/api/settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      let settings = await storage.getSettingsByUser(req.user!.id);
      
      if (!settings) {
        settings = await storage.createSettings({
          userId: req.user!.id,
          workDays: [1, 2, 3, 4, 5],
          startTime: "08:00",
          endTime: "18:00",
          lunchStart: "12:00",
          lunchEnd: "13:00",
          appointmentDuration: 30,
          clinicName: "Odonto Ramalho",
        });
      }
      
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertDentistSettingsSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });
      const settings = await storage.createSettings(data);
      res.status(201).json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/settings/:id", authMiddleware, async (req, res) => {
    try {
      const data = insertDentistSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(req.params.id, data);
      if (!settings) {
        return res.status(404).json({ message: "Configurações não encontradas" });
      }
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== TREATMENTS ====================
  app.get("/api/treatments", authMiddleware, async (req, res) => {
    try {
      const treatments = await storage.getAllTreatments();
      res.json(treatments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/treatments", authMiddleware, async (req, res) => {
    try {
      const data = insertTreatmentSchema.parse(req.body);
      const treatment = await storage.createTreatment(data);
      res.status(201).json(treatment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/treatments/:id", authMiddleware, async (req, res) => {
    try {
      const data = insertTreatmentSchema.partial().parse(req.body);
      const treatment = await storage.updateTreatment(req.params.id, data);
      if (!treatment) {
        return res.status(404).json({ message: "Tratamento não encontrado" });
      }
      res.json(treatment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/treatments/:id", authMiddleware, async (req, res) => {
    try {
      const deleted = await storage.deleteTreatment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Tratamento não encontrado" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== DENTIST TREATMENTS ====================
  app.get("/api/dentist-treatments/:dentistId", authMiddleware, async (req, res) => {
    try {
      const treatments = await storage.getDentistTreatments(req.params.dentistId);
      res.json(treatments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get dentist treatments with full details including price
  app.get("/api/dentist-treatments/:dentistId/details", authMiddleware, async (req, res) => {
    try {
      const treatments = await storage.getDentistTreatmentsWithDetails(req.params.dentistId);
      res.json(treatments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/dentist-treatments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { dentistId, treatmentId, price, customDuration } = req.body;
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      const result = await storage.addDentistTreatment({ dentistId, treatmentId, price: price || 0, customDuration });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update dentist treatment (price, customDuration, legendColor)
  app.patch("/api/dentist-treatments/:dentistId/:treatmentId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { dentistId, treatmentId } = req.params;
      const { price, customDuration, legendColor } = req.body;
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      const result = await storage.updateDentistTreatment(dentistId, treatmentId, { price, customDuration, legendColor });
      if (!result) {
        return res.status(404).json({ message: "Tratamento não encontrado" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/dentist-treatments/:dentistId/:treatmentId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { dentistId, treatmentId } = req.params;
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      await storage.removeDentistTreatment(dentistId, treatmentId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== BUDGETS ====================
  app.get("/api/budgets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { patientId, dentistId, includeItems } = req.query;
      const userIsAdmin = isAdmin(req.user);
      
      let budgets = await storage.getBudgets(userIsAdmin ? undefined : req.user!.id);
      
      if (patientId && typeof patientId === "string") {
        budgets = budgets.filter(b => b.patientId === patientId);
      }
      if (dentistId && typeof dentistId === "string") {
        budgets = budgets.filter(b => b.dentistId === dentistId);
      }
      
      if (includeItems === "true") {
        const budgetsWithItems = await Promise.all(budgets.map(async (budget) => {
          const items = await storage.getBudgetItems(budget.id);
          return { ...budget, items };
        }));
        return res.json(budgetsWithItems);
      }
      
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/budgets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && budget.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      res.json(budget);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/patients/:patientId/budgets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const patient = await storage.getPatient(req.params.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      const budgets = await storage.getBudgetsByPatient(req.params.patientId);
      res.json(budgets);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budgets", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertBudgetSchema.parse({
        ...req.body,
        dentistId: req.body.dentistId || req.user!.id,
      });
      
      // Verify user has access to this patient
      const patient = await storage.getPatient(data.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para criar orçamento para este paciente" });
      }
      
      const budget = await storage.createBudget(data);
      res.status(201).json(budget);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/budgets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      // Verify the patient ownership for the existing budget
      const patient = await storage.getPatient(budget.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar este orçamento" });
      }
      
      const data = insertBudgetSchema.partial().parse(req.body);
      
      // If trying to change the patientId, verify access to the new patient
      if (data.patientId && data.patientId !== budget.patientId) {
        const newPatient = await storage.getPatient(data.patientId);
        if (!newPatient) {
          return res.status(404).json({ message: "Novo paciente não encontrado" });
        }
        if (!userIsAdmin && newPatient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para mover este orçamento para outro paciente" });
        }
      }
      
      const updated = await storage.updateBudget(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/budgets/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      // Verify the patient ownership
      const patient = await storage.getPatient(budget.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este orçamento" });
      }
      
      await storage.deleteBudget(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Budget Payments
  app.post("/api/budgets/:id/payments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      // Verify the patient ownership
      const patient = await storage.getPatient(budget.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && patient.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para registrar pagamento neste orçamento" });
      }

      const { amount, paymentMethod, description } = req.body;
      
      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "Valor do pagamento inválido" });
      }
      if (!paymentMethod) {
        return res.status(400).json({ message: "Método de pagamento obrigatório" });
      }

      const result = await storage.registerBudgetPayment(req.params.id, amount, paymentMethod, description);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get payments for a budget
  app.get("/api/budgets/:id/payments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && budget.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }

      const transactions = await storage.getFinancialTransactions(req.user!.id, undefined, undefined, userIsAdmin);
      const budgetPayments = transactions.filter(t => t.budgetId === req.params.id);
      res.json(budgetPayments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Budget Items
  app.get("/api/budgets/:id/items", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && budget.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      const items = await storage.getBudgetItems(req.params.id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/budget-items", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertBudgetItemSchema.parse(req.body);
      const budget = await storage.getBudget(data.budgetId);
      if (!budget) {
        return res.status(404).json({ message: "Orçamento não encontrado" });
      }
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && budget.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      const item = await storage.addBudgetItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/budget-items/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertBudgetItemSchema.partial().parse(req.body);
      const updated = await storage.updateBudgetItem(req.params.id, data);
      if (!updated) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/budget-items/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.deleteBudgetItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== APPOINTMENT REQUESTS (Admin only) ====================
  app.get("/api/appointment-requests", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const requests = await storage.getAppointmentRequests();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/appointment-requests/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateAppointmentRequestStatus(req.params.id, status);
      if (!updated) {
        return res.status(404).json({ message: "Solicitação não encontrada" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== CLINIC SETTINGS (Admin only) ====================
  app.get("/api/clinic-settings", authMiddleware, async (req, res) => {
    try {
      const settings = await storage.getClinicSettings();
      res.json(settings || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/clinic-settings", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const data = insertClinicSettingsSchema.parse(req.body);
      const settings = await storage.updateClinicSettings(data);
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== PUBLIC APIs (No auth required) ====================
  app.get("/api/public/clinic", async (req, res) => {
    try {
      const settings = await storage.getClinicSettings();
      res.json(settings || { clinicName: "Odonto Ramalho" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/public/treatments", async (req, res) => {
    try {
      const treatments = await storage.getActiveTreatments();
      res.json(treatments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/public/dentists", async (req, res) => {
    try {
      const dentists = await storage.getPublicDentists();
      res.json(dentists);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/public/appointment-request", async (req, res) => {
    try {
      const data = insertAppointmentRequestSchema.parse(req.body);
      const request = await storage.createAppointmentRequest(data);

      const treatment = (await storage.getActiveTreatments()).find(t => t.id === data.treatmentId);
      let dentistName: string | undefined;
      let dentistPhone: string | undefined;

      if (data.dentistId) {
        const dentist = await storage.getUser(data.dentistId);
        if (dentist) {
          dentistName = dentist.name;
          const dentistSettings = await storage.getSettingsByUser(data.dentistId);
          dentistPhone = dentistSettings?.clinicPhone || undefined;
        }
      }

      await sendEmailNotification({
        type: 'appointment',
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientEmail: data.patientEmail || undefined,
        treatmentName: treatment?.name || "Consulta",
        dentistName,
        preferredDate: data.preferredDate || undefined,
        notes: data.notes || undefined,
      });

      res.status(201).json({ 
        success: true, 
        message: "Solicitação recebida com sucesso! Entraremos em contato em breve." 
      });
    } catch (error: any) {
      console.error("Error creating appointment request:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/public/contact-message", async (req, res) => {
    try {
      const data = insertContactMessageSchema.parse(req.body);

      await sendEmailNotification({
        type: 'contact',
        patientName: data.patientName,
        patientPhone: data.patientPhone,
        patientEmail: data.patientEmail || undefined,
        message: data.message || undefined,
      });

      res.status(201).json({ 
        success: true, 
        message: "Mensagem recebida com sucesso! Entraremos em contato em breve." 
      });
    } catch (error: any) {
      console.error("Error sending contact message:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== FINANCIAL CONTROL ====================
  // Financial Transactions
  app.get("/api/financial/transactions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const userIsAdmin = isAdmin(req.user);
      const transactions = await storage.getFinancialTransactions(req.user!.id, startDate, endDate, userIsAdmin);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/financial/transactions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertFinancialTransactionSchema.parse({
        ...req.body,
        dentistId: req.body.dentistId || req.user!.id,
      });
      
      // Verify patient ownership if patientId is provided
      if (data.patientId) {
        const patient = await storage.getPatient(data.patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }
        const userIsAdmin = isAdmin(req.user);
        if (!userIsAdmin && patient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para criar transação para este paciente" });
        }
      }
      
      const transaction = await storage.createFinancialTransaction(data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/financial/transactions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getFinancialTransaction(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && existing.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      const data = insertFinancialTransactionSchema.partial().parse(req.body);
      
      // If updating patientId, verify ownership
      if (data.patientId) {
        const patient = await storage.getPatient(data.patientId);
        if (!patient) {
          return res.status(404).json({ message: "Paciente não encontrado" });
        }
        if (!userIsAdmin && patient.dentistId !== req.user!.id) {
          return res.status(403).json({ message: "Você não tem permissão para associar esta transação a este paciente" });
        }
      }
      
      const updated = await storage.updateFinancialTransaction(req.params.id, data);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/financial/transactions/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const existing = await storage.getFinancialTransaction(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Transação não encontrada" });
      }
      const userIsAdmin = isAdmin(req.user);
      if (!userIsAdmin && existing.dentistId !== req.user!.id) {
        return res.status(403).json({ message: "Sem permissão" });
      }
      await storage.deleteFinancialTransaction(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Financial Summary
  app.get("/api/financial/summary", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const userIsAdmin = isAdmin(req.user);
      const summary = await storage.getFinancialSummary(req.user!.id, startDate, endDate, userIsAdmin);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Monthly Financial Data
  app.get("/api/financial/monthly", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const userIsAdmin = isAdmin(req.user);
      const data = await storage.getMonthlyFinancialData(req.user!.id, year, userIsAdmin);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Treatment Financial Report
  app.get("/api/financial/treatments-report", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const userIsAdmin = isAdmin(req.user);
      const report = await storage.getTreatmentFinancialReport(req.user!.id, startDate, endDate, userIsAdmin);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Patient Financial Report
  app.get("/api/financial/patients-report", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userIsAdmin = isAdmin(req.user);
      const report = await storage.getPatientFinancialReport(req.user!.id, userIsAdmin);
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Treatment Costs
  app.get("/api/financial/treatment-costs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const costs = await storage.getTreatmentCosts(req.user!.id);
      res.json(costs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/financial/treatment-costs", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const data = insertTreatmentCostSchema.parse({
        ...req.body,
        dentistId: req.user!.id,
      });
      const cost = await storage.createOrUpdateTreatmentCost(data);
      res.status(201).json(cost);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  return httpServer;
}
