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
  // Added DMRZ.de specific fields
  contactNetwork: json("contact_network").$type<{
    relatives: Array<{
      name: string;
      relationship: string;
      phone: string;
      isEmergencyContact: boolean;
    }>;
    caregivers: Array<{
      name: string;
      role: string;
      organization: string;
      phone: string;
    }>;
    physicians: Array<{
      name: string;
      specialty: string;
      practice: string;
      phone: string;
    }>;
  }>(),
  medicalHistory: json("medical_history").$type<{
    allergies: string[];
    preExistingConditions: string[];
    hospitalizations: Array<{
      date: string;
      reason: string;
      hospital: string;
    }>;
  }>(),
  careLevelAssessment: json("care_level_assessment").$type<{
    lastAssessment: string;
    nextAssessment: string;
    mobilityScore: number;
    cognitiveScore: number;
    selfCareScore: number;
    therapyScore: number;
    socialScore: number;
    dailyRoutineScore: number;
    totalScore: number;
    mdkNotes: string;
  }>(),
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
  // Added DMRZ.de specific fields
  economicIndicator: text("economic_indicator").notNull().default("yellow"), // green/yellow/red
  economicCalculation: json("economic_calculation").$type<{
    personnelCosts: number;
    vehicleCosts: number;
    specialServiceFees: number;
    totalCosts: number;
    expectedRevenue: number;
    profitMargin: number;
  }>(),
  mobileDocumentation: json("mobile_documentation").$type<{
    offlineCapable: boolean;
    gpsTracking: boolean;
    signatureRequired: boolean;
  }>().default({
    offlineCapable: true,
    gpsTracking: true,
    signatureRequired: true,
  }),
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
  // Added DMRZ.de specific fields
  documentClassification: json("document_classification").$type<{
    category: string;
    confidentialityLevel: string;
    retentionPeriod: string;
    metadataTags: string[];
    ocrProcessed: boolean;
    extractedData: Record<string, string>;
  }>(),
  mobileCapture: json("mobile_capture").$type<{
    deviceId: string;
    gpsLocation?: { lat: number; lng: number };
    captureMethod: "scan" | "photo" | "voice" | "manual";
    qrCodeData?: string;
  }>(),
  versionControl: json("version_control").$type<{
    version: number;
    changes: Array<{
      timestamp: string;
      userId: number;
      description: string;
    }>;
    fourEyesPrinciple: {
      verified: boolean;
      verifierId?: number;
      verificationDate?: string;
    };
  }>(),
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
  content: text("content"),
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

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("pending"),
  type: text("type").notNull(),
  notes: text("notes"),
  aiGenerated: boolean("ai_generated").default(false),
  conflictInfo: json("conflict_info").$type<{
    type?: "overtime" | "rest-period" | "qualification" | "overlap";
    description?: string;
    severity: "low" | "medium" | "high";
    affectedShiftIds?: number[];
  }>(),
  rotationPattern: text("rotation_pattern"), // early, late, night
  department: text("department").notNull().default("general"),
  skills: json("required_skills").$type<string[]>().default([]).notNull(),
  breakDuration: integer("break_duration").notNull().default(30), // in minutes
  isOnCall: boolean("is_on_call").default(false),
  replacementNeeded: boolean("replacement_needed").default(false),
  locationId: integer("location_id"),
  lastModified: timestamp("last_modified").defaultNow(),
  lastModifiedBy: integer("last_modified_by"),
});

export const shiftTemplates = pgTable("shift_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  startTime: text("start_time").notNull(), // Format: "HH:mm"
  endTime: text("end_time").notNull(), // Format: "HH:mm"
  type: text("type").notNull(),
  requiredSkills: json("required_skills").$type<string[]>().default([]).notNull(),
  minStaffing: integer("min_staffing").notNull().default(1),
  optimalStaffing: integer("optimal_staffing").notNull().default(1),
  breakDuration: integer("break_duration").notNull().default(30),
  priority: integer("priority").notNull().default(1),
  isActive: boolean("is_active").default(true),
});

export const shiftPreferences = pgTable("shift_preferences", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  preferredShiftTypes: json("preferred_shift_types").$type<string[]>().notNull(),
  preferredDays: json("preferred_days").$type<string[]>().notNull(), // Format: "Monday", "Tuesday", etc.
  maxShiftsPerWeek: integer("max_shifts_per_week").notNull(),
  minRestHours: integer("min_rest_hours").notNull().default(11),
  preferredDepartments: json("preferred_departments").$type<string[]>().default([]).notNull(),
  blackoutDates: json("blackout_dates").$type<string[]>().notNull(),
  maxNightShifts: integer("max_night_shifts").notNull().default(3),
  preferredWorkingHours: json("preferred_working_hours").$type<{
    [key: string]: { // day of week
      start: string; // "HH:mm"
      end: string; // "HH:mm"
    };
  }>(),
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
    urgency: "low" | "medium" | "high";
    alternativeEmployees?: number[];
  }>().notNull(),
  responseNote: text("response_note"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  respondedBy: integer("responded_by"),
});

export const insertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients, {
  medications: z.array(z.string()).default([]),
  aiSummary: z.string().nullable(),
  notes: z.string().nullable(),
  careLevel: z.number().int().min(1).max(5),
  contactNetwork: z.object({
    relatives: z.array(z.object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      isEmergencyContact: z.boolean()
    })).default([]),
    caregivers: z.array(z.object({
      name: z.string(),
      role: z.string(),
      organization: z.string(),
      phone: z.string()
    })).default([]),
    physicians: z.array(z.object({
      name: z.string(),
      specialty: z.string(),
      practice: z.string(),
      phone: z.string()
    })).default([])
  }).nullable(),
  medicalHistory: z.object({
    allergies: z.array(z.string()).default([]),
    preExistingConditions: z.array(z.string()).default([]),
    hospitalizations: z.array(z.object({
      date: z.string(),
      reason: z.string(),
      hospital: z.string()
    })).default([])
  }).nullable(),
  careLevelAssessment: z.object({
    lastAssessment: z.string(),
    nextAssessment: z.string(),
    mobilityScore: z.number().min(0).max(100),
    cognitiveScore: z.number().min(0).max(100),
    selfCareScore: z.number().min(0).max(100),
    therapyScore: z.number().min(0).max(100),
    socialScore: z.number().min(0).max(100),
    dailyRoutineScore: z.number().min(0).max(100),
    totalScore: z.number().min(0).max(100),
    mdkNotes: z.string()
  }).nullable()
}).extend({
  // Add any additional validation or transformation logic here
});
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertTourSchema = createInsertSchema(tours).extend({
  date: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
  economicIndicator: z.enum(['green', 'yellow', 'red']).default('yellow'),
  economicCalculation: z.object({
    personnelCosts: z.number().min(0),
    vehicleCosts: z.number().min(0),
    specialServiceFees: z.number().min(0),
    totalCosts: z.number().min(0),
    expectedRevenue: z.number().min(0),
    profitMargin: z.number()
  }).nullable(),
  mobileDocumentation: z.object({
    offlineCapable: z.boolean(),
    gpsTracking: z.boolean(),
    signatureRequired: z.boolean()
  }).default({
    offlineCapable: true,
    gpsTracking: true,
    signatureRequired: true
  })
});
export const insertDocSchema = createInsertSchema(documentation).extend({
  date: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
  documentClassification: z.object({
    category: z.string(),
    confidentialityLevel: z.enum(['public', 'internal', 'confidential', 'strictly_confidential']),
    retentionPeriod: z.string(),
    metadataTags: z.array(z.string()),
    ocrProcessed: z.boolean(),
    extractedData: z.record(z.string())
  }).nullable(),
  mobileCapture: z.object({
    deviceId: z.string(),
    gpsLocation: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    captureMethod: z.enum(['scan', 'photo', 'voice', 'manual']),
    qrCodeData: z.string().optional()
  }).nullable(),
  versionControl: z.object({
    version: z.number(),
    changes: z.array(z.object({
      timestamp: z.string(),
      userId: z.number(),
      description: z.string()
    })),
    fourEyesPrinciple: z.object({
      verified: z.boolean(),
      verifierId: z.number().optional(),
      verificationDate: z.string().optional()
    })
  }).nullable()
});
export const insertWorkflowSchema = createInsertSchema(workflowTemplates);
export const insertBillingSchema = createInsertSchema(insuranceBilling);
export const insertExpiryTrackingSchema = createInsertSchema(expiryTracking).extend({
  expiryDate: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertShiftSchema = createInsertSchema(shifts, {
  conflictInfo: z.object({
    type: z.enum(["overtime", "rest-period", "qualification", "overlap"]).optional(),
    description: z.string().optional(),
    severity: z.enum(["low", "medium", "high"]).default("low"),
    affectedShiftIds: z.array(z.number()).optional()
  }).nullable(),
  skills: z.array(z.string()).default([]),
  rotationPattern: z.enum(["early", "late", "night"]).optional(),
  department: z.string().default("general"),
  breakDuration: z.number().int().min(0).max(120),
}).extend({
  startTime: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
  endTime: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertTemplateSchema = createInsertSchema(shiftTemplates).extend({
  requiredSkills: z.array(z.string()).default([]),
  minStaffing: z.number().int().min(1),
  optimalStaffing: z.number().int().min(1),
  priority: z.number().int().min(1).max(5),
});

export const insertPreferenceSchema = createInsertSchema(shiftPreferences).extend({
  preferredShiftTypes: z.array(z.string()).default([]),
  preferredDays: z.array(z.enum([
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
  ])).default([]),
  maxShiftsPerWeek: z.number().int().min(1).max(7),
  minRestHours: z.number().int().min(8).max(48),
  preferredDepartments: z.array(z.string()).default([]),
  maxNightShifts: z.number().int().min(0).max(7),
});

export const insertChangeSchema = createInsertSchema(shiftChanges).extend({
  requestType: z.enum(["swap", "cancel", "modify"]),
  requestDetails: z.object({
    reason: z.string().min(1),
    proposedChanges: z.object({
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      newEmployeeId: z.number().optional(),
    }).optional(),
    urgency: z.enum(["low", "medium", "high"]).default("low"),
    alternativeEmployees: z.array(z.number()).optional(),
  }),
});

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

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type ShiftPreference = typeof shiftPreferences.$inferSelect;
export type InsertPreference = z.infer<typeof insertPreferenceSchema>;
export type ShiftChange = typeof shiftChanges.$inferSelect;
export type InsertChange = z.infer<typeof insertChangeSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

// Add base patient schema for AI validation
export const patientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  careLevel: z.number().int().min(1).max(5),
  address: z.string().min(1, "Address is required"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  medications: z.array(z.string()).default([]),
  notes: z.string().nullable(),
  insuranceProvider: z.string().min(1, "Insurance provider is required"),
  insuranceNumber: z.string().min(1, "Insurance number is required"),
  aiSummary: z.string().nullable(),
  lastVisit: z.date().nullable(),
  nextScheduledVisit: z.date().nullable(),
});


export const DocumentationStatus = {
  PENDING: "pending",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;

export type DocumentationStatusType = typeof DocumentationStatus[keyof typeof DocumentationStatus];

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