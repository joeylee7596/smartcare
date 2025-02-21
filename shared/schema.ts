import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("staff"),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  careLevel: integer("care_level").notNull(),
  address: text("address").notNull(),
  emergencyContact: text("emergency_contact").notNull(),
  medications: json("medications").$type<string[]>().notNull(),
  notes: text("notes"),
});

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  caregiverId: integer("caregiver_id").notNull(),
  patientIds: json("patient_ids").$type<number[]>().notNull(),
});

export const documentation = pgTable("documentation", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  caregiverId: integer("caregiver_id").notNull(),
  date: timestamp("date").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertPatientSchema = createInsertSchema(patients);
export const insertTourSchema = createInsertSchema(tours);
export const insertDocSchema = createInsertSchema(documentation);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Tour = typeof tours.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Documentation = typeof documentation.$inferSelect;
export type InsertDoc = z.infer<typeof insertDocSchema>;
