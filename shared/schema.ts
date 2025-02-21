import { pgTable, text, serial, integer, timestamp, json, boolean, decimal } from "drizzle-orm/pg-core";
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

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  caregiverId: integer("caregiver_id").notNull(),
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
    }[];
    totalDistance: number;
    estimatedDuration: number;
  }>(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
});

export const documentation = pgTable("documentation", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  caregiverId: integer("caregiver_id").notNull(),
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
  caregiverId: integer("caregiver_id").notNull(),
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
});

export const insertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients);
export const insertTourSchema = createInsertSchema(tours).extend({
  date: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
});
export const insertDocSchema = createInsertSchema(documentation);
export const insertWorkflowSchema = createInsertSchema(workflowTemplates);
export const insertBillingSchema = createInsertSchema(insuranceBilling);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Documentation = typeof documentation.$inferSelect;
export type InsertDoc = z.infer<typeof insertDocSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type InsuranceBilling = typeof insuranceBilling.$inferSelect;
export type InsertBilling = z.infer<typeof insertBillingSchema>;

export const DocumentationStatus = {
  PENDING: "pending",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;

export type DocumentationStatusType = typeof DocumentationStatus[keyof typeof DocumentationStatus];