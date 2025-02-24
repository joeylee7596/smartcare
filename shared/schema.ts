import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Basic tables for shift management
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("caregiver")
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type").notNull()
});

// Create insert schemas
export const insertEmployeeSchema = createInsertSchema(employees);
export const insertShiftSchema = createInsertSchema(shifts, {
  type: z.enum(["early", "late", "night"]),
  startTime: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
  endTime: z.string().or(z.date()).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  )
});

// Export types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;