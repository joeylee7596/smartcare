import {
  users, patients, tours, documentation, workflowTemplates, insuranceBilling,
  type User, type Patient, type Tour, type Documentation, type WorkflowTemplate, type InsuranceBilling,
  type InsertUser, type InsertPatient, type InsertTour, type InsertDoc, type InsertWorkflow, type InsertBilling
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";
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

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool: pool, // Changed from db to pool
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
    const [created] = await db.insert(users).values([user]).returning();
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
    const [created] = await db.insert(patients).values([patient]).returning();
    return created;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient> {
    const [updated] = await db
      .update(patients)
      .set(patient)
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
    // Ensure date is properly formatted for PostgreSQL
    const formattedTour = {
      ...tour,
      date: new Date(tour.date),
      actualStartTime: tour.actualStartTime ? new Date(tour.actualStartTime) : null,
      actualEndTime: tour.actualEndTime ? new Date(tour.actualEndTime) : null,
    };

    const [created] = await db.insert(tours).values([formattedTour]).returning();
    return created;
  }

  async updateTour(id: number, tour: Partial<InsertTour>): Promise<Tour> {
    // Format dates if they exist in the update
    const formattedTour = {
      ...tour,
      date: tour.date ? new Date(tour.date) : undefined,
      actualStartTime: tour.actualStartTime ? new Date(tour.actualStartTime) : undefined,
      actualEndTime: tour.actualEndTime ? new Date(tour.actualEndTime) : undefined,
    };

    const [updated] = await db
      .update(tours)
      .set(formattedTour)
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
    const [created] = await db.insert(workflowTemplates).values([workflow]).returning();
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
    const [created] = await db.insert(insuranceBilling).values([billing]).returning();
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
}

export const storage = new DatabaseStorage();