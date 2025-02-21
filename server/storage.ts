import { User, Patient, Tour, Documentation, InsertUser, InsertPatient, InsertTour, InsertDoc } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  getDocs(patientId: number): Promise<Documentation[]>;
  createDoc(doc: InsertDoc): Promise<Documentation>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private tours: Map<number, Tour>;
  private docs: Map<number, Documentation>;
  private currentId: { [key: string]: number };
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.tours = new Map();
    this.docs = new Map();
    this.currentId = { users: 1, patients: 1, tours: 1, docs: 1 };
    this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
  }

  // Auth methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Patient methods
  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const id = this.currentId.patients++;
    const newPatient = { ...patient, id };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  async updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient> {
    const existing = await this.getPatient(id);
    if (!existing) throw new Error("Patient not found");
    const updated = { ...existing, ...patient };
    this.patients.set(id, updated);
    return updated;
  }

  async deletePatient(id: number): Promise<void> {
    this.patients.delete(id);
  }

  // Tour methods
  async getTours(): Promise<Tour[]> {
    return Array.from(this.tours.values());
  }

  async getTour(id: number): Promise<Tour | undefined> {
    return this.tours.get(id);
  }

  async createTour(tour: InsertTour): Promise<Tour> {
    const id = this.currentId.tours++;
    const newTour = { ...tour, id };
    this.tours.set(id, newTour);
    return newTour;
  }

  async updateTour(id: number, tour: Partial<InsertTour>): Promise<Tour> {
    const existing = await this.getTour(id);
    if (!existing) throw new Error("Tour not found");
    const updated = { ...existing, ...tour };
    this.tours.set(id, updated);
    return updated;
  }

  async deleteTour(id: number): Promise<void> {
    this.tours.delete(id);
  }

  // Documentation methods
  async getDocs(patientId: number): Promise<Documentation[]> {
    return Array.from(this.docs.values()).filter(doc => doc.patientId === patientId);
  }

  async createDoc(doc: InsertDoc): Promise<Documentation> {
    const id = this.currentId.docs++;
    const newDoc = { ...doc, id };
    this.docs.set(id, newDoc);
    return newDoc;
  }
}

export const storage = new MemStorage();
