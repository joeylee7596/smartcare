import { pgTable, text, serial, integer, timestamp, json, boolean, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"),
  preferences: json("preferences").$type<{
    aiAssistEnabled: boolean;
    voiceInputEnabled: boolean;
    defaultWorkflowId?: number;
  }>().default({
    aiAssistEnabled: true,
    voiceInputEnabled: true,
  }).notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  careLevel: integer("care_level").notNull(),
  address: text("address").notNull(),
  emergencyContact: text("emergency_contact").notNull(),
  medications: json("medications").$type<string[]>().notNull(),
  notes: text("notes"),
  insuranceProvider: text("insurance_provider").notNull(),
  insuranceNumber: text("insurance_number").notNull(),
  aiSummary: text("ai_summary"),
  lastVisit: timestamp("last_visit"),
  nextScheduledVisit: timestamp("next_scheduled_visit"),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("caregiver"),
  status: text("status").notNull().default("active"),
  workingHours: json("working_hours").$type<{
    [key: string]: {
      start: string;
      end: string;
      isWorkingDay: boolean;
    };
  }>().notNull(),
  qualifications: json("qualifications").$type<{
    nursingDegree: boolean;
    medicationAdministration: boolean;
    woundCare: boolean;
    dementiaCare: boolean;
    palliativeCare: boolean;
    lifting: boolean;
    firstAid: boolean;
    additionalCertifications: string[];
  }>().notNull(),
  languages: json("languages").$type<string[]>().notNull(),
  vehicleInfo: json("vehicle_info").$type<{
    hasVehicle: boolean;
    type: "car" | "bicycle" | "public_transport";
    licensePlate?: string;
  }>().notNull(),
  maxPatientsPerDay: integer("max_patients_per_day").notNull().default(8),
  preferredDistricts: json("preferred_districts").$type<string[]>().notNull(),
  vacationDays: json("vacation_days").$type<string[]>().notNull(),
  notes: text("notes"),
  lastTour: timestamp("last_tour"),
  nextScheduledTour: timestamp("next_scheduled_tour"),
});

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  employeeId: integer("employee_id").notNull(),
  patientIds: json("patient_ids").$type<number[]>().notNull(),
  status: text("status").notNull().default("scheduled"),
  optimizedRoute: json("optimized_route").$type<{
    waypoints: {
      patientId: number;
      lat: number;
      lng: number;
      estimatedTime: string;
      visitDuration: number;
      travelTimeToNext: number;
      distanceToNext: number;
      requiredQualifications: string[];
    }[];
    totalDistance: number;
    estimatedDuration: number;
  }>(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  employeeNotes: text("employee_notes"),
  optimizationScore: decimal("optimization_score"),
  matchingScore: decimal("matching_score"),
});

export const documentation = pgTable("documentation", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  date: timestamp("date").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
  aiGenerated: boolean("ai_generated").default(false),
  verified: boolean("verified").default(false),
  audioRecordingUrl: text("audio_recording_url"),
  status: text("status").notNull().default("pending"),
  reviewerId: integer("reviewer_id"),
  reviewNotes: text("review_notes"),
  reviewDate: timestamp("review_date"),
});

export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  steps: json("steps").$type<{
    order: number;
    action: string;
    duration: number;
    required: boolean;
  }[]>().notNull(),
  aiOptimized: boolean("ai_optimized").default(true),
});

export const insuranceBilling = pgTable("insurance_billing", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  date: timestamp("date").notNull(),
  services: json("services").$type<{
    code: string;
    description: string;
    amount: number;
  }[]>().notNull(),
  status: text("status").notNull().default("pending"),
  totalAmount: decimal("total_amount").notNull(),
  submissionDate: timestamp("submission_date"),
  responseDate: timestamp("response_date"),
  insuranceResponse: text("insurance_response"),
  content: text("content"), // Added new field for storing billing text content
});

export const expiryTracking = pgTable("expiry_tracking", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type").notNull(),
  expiryDate: date("expiry_date").notNull(),
  quantity: decimal("quantity").notNull(),
  unit: text("unit").notNull(),
  locationId: integer("location_id"),
  patientId: integer("patient_id"),
  batchNumber: text("batch_number"),
  notes: text("notes"),
  warningThreshold: integer("warning_threshold").notNull().default(30),
  status: text("status").notNull().default("active"),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// New tables for duty roster
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("pending"), // pending, confirmed, rejected
  type: text("type").notNull(), // regular, on-call, overtime
  notes: text("notes"),
  aiGenerated: boolean("ai_generated").default(false),
  conflictInfo: json("conflict_info").$type<{
    type?: "overtime" | "rest-period" | "qualification";
    description?: string;
  }>(),
  lastModified: timestamp("last_modified").defaultNow(),
  lastModifiedBy: integer("last_modified_by"),
});

export const shiftPreferences = pgTable("shift_preferences", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  preferredShiftTypes: json("preferred_shift_types").$type<string[]>().notNull(),
  preferredDays: json("preferred_days").$type<string[]>().notNull(),
  maxShiftsPerWeek: integer("max_shifts_per_week").notNull(),
  minRestHours: integer("min_rest_hours").notNull().default(11),
  blackoutDates: json("blackout_dates").$type<string[]>().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const shiftChanges = pgTable("shift_changes", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").notNull(),
  requestedBy: integer("requested_by").notNull(),
  requestType: text("request_type").notNull(), // swap, cancel, modify
  requestStatus: text("request_status").notNull().default("pending"),
  requestDetails: json("request_details").$type<{
    reason: string;
    proposedChanges?: {
      startTime?: string;
      endTime?: string;
      newEmployeeId?: number;
    };
  }>().notNull(),
  responseNote: text("response_note"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const insertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients);
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertTourSchema = createInsertSchema(tours).extend({
  date: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
});
export const insertDocSchema = createInsertSchema(documentation);
export const insertWorkflowSchema = createInsertSchema(workflowTemplates);
export const insertBillingSchema = createInsertSchema(insuranceBilling);
export const insertExpiryTrackingSchema = createInsertSchema(expiryTracking).extend({
  expiryDate: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
});

// Create insert schemas for new tables
export const insertShiftSchema = createInsertSchema(shifts);
export const insertPreferenceSchema = createInsertSchema(shiftPreferences);
export const insertChangeSchema = createInsertSchema(shiftChanges);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Documentation = typeof documentation.$inferSelect;
export type InsertDoc = z.infer<typeof insertDocSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type InsuranceBilling = typeof insuranceBilling.$inferSelect;
export type InsertBilling = z.infer<typeof insertBillingSchema>;
export type ExpiryTracking = typeof expiryTracking.$inferSelect;
export type InsertExpiryTracking = z.infer<typeof insertExpiryTrackingSchema>;

// Create types for new tables
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type ShiftPreference = typeof shiftPreferences.$inferSelect;
export type InsertPreference = z.infer<typeof insertPreferenceSchema>;
export type ShiftChange = typeof shiftChanges.$inferSelect;
export type InsertChange = z.infer<typeof insertChangeSchema>;

export const DocumentationStatus = {
  PENDING: "pending",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;

export type DocumentationStatusType = typeof DocumentationStatus[keyof typeof DocumentationStatus];

// Add shift-related constants
export const ShiftStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
} as const;

export const ShiftType = {
  REGULAR: "regular",
  ON_CALL: "on-call",
  OVERTIME: "overtime",
} as const;

export const ChangeRequestType = {
  SWAP: "swap",
  CANCEL: "cancel",
  MODIFY: "modify",
} as const;

export const ChangeRequestStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;