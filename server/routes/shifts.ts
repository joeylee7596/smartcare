import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertShiftSchema, insertTemplateSchema, insertPreferenceSchema, insertChangeSchema } from "@shared/schema";
import { startOfWeek, endOfWeek, addDays, isWithinInterval, parseISO } from "date-fns";

const router = Router();

// Get shifts within a date range
router.get("/", async (req, res) => {
  try {
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date range");
    }

    const shifts = await storage.getShifts(startDate, endDate);
    res.json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(400).json({ error: "Could not fetch shifts" });
  }
});

// Get shifts for a specific employee
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    if (isNaN(employeeId) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid parameters");
    }

    const shifts = await storage.getEmployeeShifts(employeeId, startDate, endDate);
    res.json(shifts);
  } catch (error) {
    res.status(400).json({ error: "Could not fetch employee shifts" });
  }
});

// Create a new shift
router.post("/", async (req, res) => {
  try {
    const shift = insertShiftSchema.parse(req.body);
    
    // Check for conflicts
    const conflicts = await checkShiftConflicts(shift);
    if (conflicts.length > 0) {
      shift.conflictInfo = {
        type: "overlap",
        description: "Overlapping shifts detected",
        severity: "high",
        affectedShiftIds: conflicts.map(c => c.id)
      };
    }

    const created = await storage.createShift(shift);
    res.json(created);
  } catch (error) {
    console.error("Error creating shift:", error);
    res.status(400).json({ error: "Could not create shift" });
  }
});

// Update a shift
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = insertShiftSchema.partial().parse(req.body);
    
    if (updates.startTime || updates.endTime) {
      const existingShift = await storage.getShift(id);
      if (!existingShift) throw new Error("Shift not found");

      const shiftToCheck = {
        ...existingShift,
        ...updates,
        id: undefined
      };

      const conflicts = await checkShiftConflicts(shiftToCheck);
      if (conflicts.length > 0) {
        updates.conflictInfo = {
          type: "overlap",
          description: "Overlapping shifts detected",
          severity: "high",
          affectedShiftIds: conflicts.map(c => c.id)
        };
      }
    }

    const updated = await storage.updateShift(id, updates);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Could not update shift" });
  }
});

// Delete a shift
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteShift(id);
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Could not delete shift" });
  }
});

// Get shift templates
router.get("/templates", async (req, res) => {
  try {
    const templates = await storage.getShiftTemplates();
    res.json(templates);
  } catch (error) {
    res.status(400).json({ error: "Could not fetch shift templates" });
  }
});

// Create shift template
router.post("/templates", async (req, res) => {
  try {
    const template = insertTemplateSchema.parse(req.body);
    const created = await storage.createShiftTemplate(template);
    res.json(created);
  } catch (error) {
    res.status(400).json({ error: "Could not create shift template" });
  }
});

// Get employee preferences
router.get("/preferences/:employeeId", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const preferences = await storage.getEmployeePreferences(employeeId);
    res.json(preferences);
  } catch (error) {
    res.status(400).json({ error: "Could not fetch preferences" });
  }
});

// Update employee preferences
router.patch("/preferences/:employeeId", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const updates = insertPreferenceSchema.partial().parse(req.body);
    const updated = await storage.updateEmployeePreferences(employeeId, updates);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Could not update preferences" });
  }
});

// Create shift change request
router.post("/changes", async (req, res) => {
  try {
    const change = insertChangeSchema.parse(req.body);
    const created = await storage.createShiftChange(change);
    res.json(created);
  } catch (error) {
    res.status(400).json({ error: "Could not create change request" });
  }
});

// Update shift change request
router.patch("/changes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = insertChangeSchema.partial().parse(req.body);
    const updated = await storage.updateShiftChange(id, updates);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Could not update change request" });
  }
});

// Helper function to check for shift conflicts
async function checkShiftConflicts(shift: any) {
  const existingShifts = await storage.getEmployeeShifts(
    shift.employeeId,
    new Date(shift.startTime),
    new Date(shift.endTime)
  );

  return existingShifts.filter(existing => {
    if (shift.id === existing.id) return false;

    const newShiftInterval = {
      start: new Date(shift.startTime),
      end: new Date(shift.endTime)
    };

    const existingInterval = {
      start: new Date(existing.startTime),
      end: new Date(existing.endTime)
    };

    return (
      isWithinInterval(newShiftInterval.start, existingInterval) ||
      isWithinInterval(newShiftInterval.end, existingInterval) ||
      isWithinInterval(existingInterval.start, newShiftInterval) ||
      isWithinInterval(existingInterval.end, newShiftInterval)
    );
  });
}

export default router;
