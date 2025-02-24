import {
  users,
  patients,
  tours,
  documentation,
  workflowTemplates,
  insuranceBilling,
  employees,
  shifts,
  shiftPreferences,
  type User,
  type Patient,
  type Tour,
  type Documentation,
  type WorkflowTemplate,
  type InsuranceBilling,
  type Employee,
  type Shift,
  type ShiftPreference,
  type ShiftChange,
  type InsertShift,
  type InsertPreference,
  type InsertChange,
  type InsertUser,
  type InsertPatient,
  type InsertTour,
  type InsertDoc,
  type InsertWorkflow,
  type InsertBilling,
  type InsertEmployee,
  type ExpiryTracking,
  type InsertExpiryTracking,
  type ShiftTemplate,
  type InsertTemplate,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, not, lte, gte, between, sql } from "drizzle-orm";
import { addDays, startOfWeek, endOfWeek } from "date-fns";
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
  getTours(patientId?: number, startDate?: Date): Promise<Tour[]>;
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

  // Employee methods
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  getEmployeeByUserId(userId: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  getAvailableEmployees(date: Date): Promise<Employee[]>;
  getEmployeeQualifications(id: number): Promise<Employee['qualifications']>;

  // Expiry Tracking methods
  getExpiryItems(): Promise<ExpiryTracking[]>;
  getExpiryItemsByStatus(status: string): Promise<ExpiryTracking[]>;
  getExpiryItemsNearingExpiry(daysThreshold?: number): Promise<ExpiryTracking[]>;
  createExpiryItem(item: InsertExpiryTracking): Promise<ExpiryTracking>;
  updateExpiryItem(id: number, item: Partial<InsertExpiryTracking>): Promise<ExpiryTracking>;
  deleteExpiryItem(id: number): Promise<void>;

  // Shift methods
  getShifts(startDate: Date, endDate: Date, department?: string): Promise<Shift[]>;
  getEmployeeShifts(employeeId: number, startDate: Date, endDate: Date): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, shift: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;
  getShift(id: number): Promise<Shift | undefined>;

  // Shift preferences methods
  getEmployeePreferences(employeeId: number): Promise<ShiftPreference | undefined>;
  updateEmployeePreferences(employeeId: number, preferences: Partial<InsertPreference>): Promise<ShiftPreference>;

  // Shift changes methods
  getShiftChanges(shiftId: number): Promise<ShiftChange[]>;
  createShiftChange(change: InsertChange): Promise<ShiftChange>;
  updateShiftChange(id: number, change: Partial<InsertChange>): Promise<ShiftChange>;
  getShiftTemplates(): Promise<ShiftTemplate[]>;
  createShiftTemplate(template: InsertTemplate): Promise<ShiftTemplate>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresStore({
      pool,
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
  async getTours(patientId?: number, startDate?: Date): Promise<Tour[]> {
    let query = db.select().from(tours);

    if (patientId) {
      query = query.where(sql`${tours.patientIds} @> ${[patientId]}`);
    }

    if (startDate) {
      query = query.where(gte(tours.date, startDate));
    }

    return query.orderBy(desc(tours.date));
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
    try {
      console.log("Creating billing with data:", billing);
      const [created] = await db.insert(insuranceBilling).values({
        patientId: billing.patientId,
        employeeId: billing.employeeId,
        date: new Date(billing.date),
        totalAmount: billing.totalAmount.toString(),
        services: billing.services.map(service => ({
          code: service.code || "",
          description: service.description || "",
          amount: Number(service.amount) || 0
        })),
        status: billing.status || "pending",
      }).returning();
      return created;
    } catch (error) {
      console.error("Database Error in createBilling:", error);
      throw error;
    }
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

  // Expiry Tracking implementations
  async getExpiryItems(): Promise<ExpiryTracking[]> {
    return db.select().from(expiryTracking).orderBy(desc(expiryTracking.expiryDate));
  }

  async getExpiryItemsByStatus(status: string): Promise<ExpiryTracking[]> {
    return db
      .select()
      .from(expiryTracking)
      .where(eq(expiryTracking.status, status))
      .orderBy(desc(expiryTracking.expiryDate));
  }

  async getExpiryItemsNearingExpiry(daysThreshold: number = 30): Promise<ExpiryTracking[]> {
    const today = new Date();
    const futureDate = addDays(today, daysThreshold);

    return db
      .select()
      .from(expiryTracking)
      .where(
        and(
          eq(expiryTracking.status, "active"),
          gte(expiryTracking.expiryDate, today.toISOString().split('T')[0]),
          lte(expiryTracking.expiryDate, futureDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(expiryTracking.expiryDate));
  }

  async createExpiryItem(item: InsertExpiryTracking): Promise<ExpiryTracking> {
    const [created] = await db
      .insert(expiryTracking)
      .values({
        ...item,
        expiryDate: new Date(item.expiryDate).toISOString().split('T')[0],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      })
      .returning();
    return created;
  }

  async updateExpiryItem(id: number, updates: Partial<InsertExpiryTracking>): Promise<ExpiryTracking> {
    const [updated] = await db
      .update(expiryTracking)
      .set({
        ...updates,
        expiryDate: updates.expiryDate ? new Date(updates.expiryDate).toISOString().split('T')[0] : undefined,
        updatedAt: new Date().toISOString().split('T')[0],
      })
      .where(eq(expiryTracking.id, id))
      .returning();
    return updated;
  }

  async deleteExpiryItem(id: number): Promise<void> {
    await db.delete(expiryTracking).where(eq(expiryTracking.id, id));
  }

  // Implement new shift-related methods
  async getShifts(startDate: Date, endDate: Date, department?: string): Promise<Shift[]> {
    let query = db
      .select()
      .from(shifts)
      .where(
        and(
          between(shifts.startTime, startDate, endDate),
          between(shifts.endTime, startDate, endDate)
        )
      );

    if (department) {
      query = query.where(eq(shifts.department, department));
    }

    return query.orderBy(shifts.startTime);
  }

  async getEmployeeShifts(employeeId: number, startDate: Date, endDate: Date): Promise<Shift[]> {
    return db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.employeeId, employeeId),
          between(shifts.startTime, startDate, endDate),
          between(shifts.endTime, startDate, endDate)
        )
      )
      .orderBy(shifts.startTime);
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await db
      .insert(shifts)
      .values(shift)
      .returning();
    return created;
  }

  async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift> {
    const [updated] = await db
      .update(shifts)
      .set({
        ...updates,
        lastModified: new Date(),
      })
      .where(eq(shifts.id, id))
      .returning();
    return updated;
  }

  async deleteShift(id: number): Promise<void> {
    await db.delete(shifts).where(eq(shifts.id, id));
  }

  async getShift(id: number): Promise<Shift | undefined> {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, id));
    return shift;
  }

  async getEmployeePreferences(employeeId: number): Promise<ShiftPreference | undefined> {
    const [preferences] = await db
      .select()
      .from(shiftPreferences)
      .where(eq(shiftPreferences.employeeId, employeeId));
    return preferences;
  }

  async updateEmployeePreferences(employeeId: number, preferences: Partial<InsertPreference>): Promise<ShiftPreference> {
    const [existing] = await db
      .select()
      .from(shiftPreferences)
      .where(eq(shiftPreferences.employeeId, employeeId));

    if (existing) {
      const [updated] = await db
        .update(shiftPreferences)
        .set({
          ...preferences,
          lastUpdated: new Date(),
        })
        .where(eq(shiftPreferences.employeeId, employeeId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(shiftPreferences)
      .values({
        employeeId,
        preferredShiftTypes: [],
        preferredDays: [],
        maxShiftsPerWeek: 5,
        minRestHours: 11,
        blackoutDates: [],
        ...preferences,
      })
      .returning();
    return created;
  }

  async getShiftChanges(shiftId: number): Promise<ShiftChange[]> {
    return db
      .select()
      .from(shiftChanges)
      .where(eq(shiftChanges.shiftId, shiftId))
      .orderBy(desc(shiftChanges.createdAt));
  }

  async createShiftChange(change: InsertChange): Promise<ShiftChange> {
    const [created] = await db
      .insert(shiftChanges)
      .values(change)
      .returning();
    return created;
  }

  async updateShiftChange(id: number, updates: Partial<InsertChange>): Promise<ShiftChange> {
    const [updated] = await db
      .update(shiftChanges)
      .set({
        ...updates,
        respondedAt: updates.requestStatus !== "pending" ? new Date() : undefined,
      })
      .where(eq(shiftChanges.id, id))
      .returning();
    return updated;
  }
  async getShiftTemplates(): Promise<ShiftTemplate[]> {
    return db.select().from(shiftTemplates);
  }

  async createShiftTemplate(template: InsertTemplate): Promise<ShiftTemplate> {
    const [created] = await db.insert(shiftTemplates).values(template).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();