import {
  users, patients, tours, documentation, workflowTemplates, insuranceBilling, employees,
  type User, type Patient, type Tour, type Documentation, type WorkflowTemplate, type InsuranceBilling, type Employee,
  type InsertUser, type InsertPatient, type InsertTour, type InsertDoc, type InsertWorkflow, type InsertBilling, type InsertEmployee
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, not } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresStore = connectPg(session);

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  getPatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  // Tours
  getTours(): Promise<Tour[]>;
  getTour(id: number): Promise<Tour | undefined>;
  createTour(tour: InsertTour): Promise<Tour>;
  updateTour(id: number, tour: Partial<InsertTour>): Promise<Tour>;
  deleteTour(id: number): Promise<void>;

  // Documentation
  getDocs(patientId?: number): Promise<Documentation[]>;
  createDoc(doc: InsertDoc): Promise<Documentation>;
  updateDoc(id: number, updates: Partial<Documentation>): Promise<Documentation>;

  // New methods for advanced features
  getWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  createWorkflowTemplate(workflow: InsertWorkflow): Promise<WorkflowTemplate>;
  getBillings(patientId: number): Promise<InsuranceBilling[]>;
  createBilling(billing: InsertBilling): Promise<InsuranceBilling>;
  updateBillingStatus(id: number, status: string): Promise<InsuranceBilling>;

  // New Employee methods
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  getAvailableEmployees(date: Date): Promise<Employee[]>;
  getEmployeeQualifications(id: number): Promise<Employee['qualifications']>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool: pool,
      createTableIfMissing: true,
    });
  }

  // Auth methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values({
      ...user,
      preferences: {
        aiAssistEnabled: true,
        voiceInputEnabled: true,
      }
    }).returning();
    return created;
  }

  // Patient methods
  async getPatients(): Promise<Patient[]> {
    return db.select().from(patients).orderBy(desc(patients.lastVisit));
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [created] = await db.insert(patients).values({
      ...patient,
      medications: patient.medications || [],
    }).returning();
    return created;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const [updated] = await db
      .update(patients)
      .set({
        ...updates,
        medications: updates.medications || undefined,
      })
      .where(eq(patients.id, id))
      .returning();
    return updated;
  }

  async deletePatient(id: number): Promise<void> {
    await db.delete(patients).where(eq(patients.id, id));
  }

  // Tour methods
  async getTours(): Promise<Tour[]> {
    return db.select().from(tours).orderBy(desc(tours.date));
  }

  async getTour(id: number): Promise<Tour | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    return tour;
  }

  async createTour(tour: InsertTour): Promise<Tour> {
    const formattedTour = {
      ...tour,
      date: new Date(tour.date),
      actualStartTime: tour.actualStartTime ? new Date(tour.actualStartTime) : null,
      actualEndTime: tour.actualEndTime ? new Date(tour.actualEndTime) : null,
      patientIds: Array.isArray(tour.patientIds) ? tour.patientIds : [],
      optimizationScore: 0,
      matchingScore: 0,
    };

    const [created] = await db.insert(tours).values(formattedTour).returning();
    return created;
  }

  async updateTour(id: number, updates: Partial<InsertTour>): Promise<Tour> {
    const formattedUpdates = {
      ...updates,
      date: updates.date ? new Date(updates.date) : undefined,
      actualStartTime: updates.actualStartTime ? new Date(updates.actualStartTime) : undefined,
      actualEndTime: updates.actualEndTime ? new Date(updates.actualEndTime) : undefined,
      patientIds: updates.patientIds ? Array.isArray(updates.patientIds) ? updates.patientIds : [] : undefined,
    };

    const [updated] = await db
      .update(tours)
      .set(formattedUpdates)
      .where(eq(tours.id, id))
      .returning();
    return updated;
  }

  async deleteTour(id: number): Promise<void> {
    await db.delete(tours).where(eq(tours.id, id));
  }

  // Documentation methods
  async getDocs(patientId?: number): Promise<Documentation[]> {
    if (patientId) {
      return db
        .select()
        .from(documentation)
        .where(eq(documentation.patientId, patientId))
        .orderBy(desc(documentation.date));
    }
    return db
      .select()
      .from(documentation)
      .orderBy(desc(documentation.date));
  }

  async createDoc(doc: InsertDoc): Promise<Documentation> {
    const [created] = await db.insert(documentation).values([doc]).returning();
    return created;
  }

  async updateDoc(id: number, updates: Partial<Documentation>): Promise<Documentation> {
    const [updated] = await db
      .update(documentation)
      .set(updates)
      .where(eq(documentation.id, id))
      .returning();
    return updated;
  }

  // New methods implementation
  async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    return db.select().from(workflowTemplates);
  }

  async createWorkflowTemplate(workflow: InsertWorkflow): Promise<WorkflowTemplate> {
    const [created] = await db.insert(workflowTemplates).values({
      ...workflow,
      steps: Array.isArray(workflow.steps) ? workflow.steps : [],
    }).returning();
    return created;
  }

  async getBillings(patientId: number): Promise<InsuranceBilling[]> {
    return db
      .select()
      .from(insuranceBilling)
      .where(eq(insuranceBilling.patientId, patientId))
      .orderBy(desc(insuranceBilling.date));
  }

  async createBilling(billing: InsertBilling): Promise<InsuranceBilling> {
    const [created] = await db.insert(insuranceBilling).values({
      ...billing,
      services: Array.isArray(billing.services) ? billing.services : [],
    }).returning();
    return created;
  }

  async updateBillingStatus(id: number, status: string): Promise<InsuranceBilling> {
    const [updated] = await db
      .update(insuranceBilling)
      .set({ status })
      .where(eq(insuranceBilling.id, id))
      .returning();
    return updated;
  }

  // New Employee methods
  async getEmployees(): Promise<Employee[]> {
    return db.select().from(employees);
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee;
  }

  async getEmployeeByUserId(userId: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
    return employee;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values({
      ...employee,
      qualifications: {
        nursingDegree: false,
        medicationAdministration: false,
        woundCare: false,
        dementiaCare: false,
        palliativeCare: false,
        lifting: false,
        firstAid: false,
        additionalCertifications: [],
        ...employee.qualifications,
      },
      languages: employee.languages || [],
      preferredDistricts: employee.preferredDistricts || [],
      vacationDays: employee.vacationDays || [],
    }).returning();
    return created;
  }

  async updateEmployee(id: number, updates: Partial<InsertEmployee>): Promise<Employee> {
    const [updated] = await db
      .update(employees)
      .set(updates)
      .where(eq(employees.id, id))
      .returning();
    return updated;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async getAvailableEmployees(date: Date): Promise<Employee[]> {
    const dayOfWeek = date.toLocaleLowerCase().split(',')[0];
    return db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.status, 'active'),
          not(employees.vacationDays.contains([date.toISOString().split('T')[0]]))
        )
      );
  }

  async getEmployeeQualifications(id: number): Promise<Employee['qualifications']> {
    const [employee] = await db
      .select({ qualifications: employees.qualifications })
      .from(employees)
      .where(eq(employees.id, id));
    return employee?.qualifications;
  }
}

export const storage = new DatabaseStorage();