import { Router } from "express";
import { storage } from "../storage";
import { insertExpiryTrackingSchema } from "@shared/schema";
import { validateRequest } from "../middleware/validate";

const router = Router();

// Get all expiry tracking items
router.get("/", async (req, res) => {
  const items = await storage.getExpiryItems();
  res.json(items);
});

// Get items by status
router.get("/status/:status", async (req, res) => {
  const items = await storage.getExpiryItemsByStatus(req.params.status);
  res.json(items);
});

// Get items nearing expiry
router.get("/nearing-expiry", async (req, res) => {
  const threshold = req.query.days ? parseInt(req.query.days as string) : undefined;
  const items = await storage.getExpiryItemsNearingExpiry(threshold);
  res.json(items);
});

// Create new expiry tracking item
router.post("/", validateRequest(insertExpiryTrackingSchema), async (req, res) => {
  const item = await storage.createExpiryItem(req.body);
  res.status(201).json(item);
});

// Update expiry tracking item
router.patch("/:id", async (req, res) => {
  const item = await storage.updateExpiryItem(parseInt(req.params.id), req.body);
  res.json(item);
});

// Delete expiry tracking item
router.delete("/:id", async (req, res) => {
  await storage.deleteExpiryItem(parseInt(req.params.id));
  res.status(204).end();
});

export default router;
