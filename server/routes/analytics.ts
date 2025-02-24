import { Router } from "express";
import { db } from "../db";
import { analytics } from "../services/analytics";
import { insuranceBilling, BillingStatus } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { format, subMonths } from "date-fns";

const router = Router();

// Helper für Datumsbereiche
const getDateRange = (from?: string, to?: string) => {
  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : subMonths(endDate, 1);
  return { startDate, endDate };
};

// Billing Analytics Endpoint
router.get("/billing", async (req, res) => {
  try {
    const { startDate, endDate } = getDateRange(
      req.query.from as string,
      req.query.to as string
    );

    // Abrechnungsdaten für den Zeitraum abrufen
    const billings = await db
      .select()
      .from(insuranceBilling)
      .where(
        and(
          gte(insuranceBilling.date, startDate),
          lte(insuranceBilling.date, endDate)
        )
      );

    // Statistiken berechnen
    const totalRevenue = billings.reduce(
      (sum, bill) => sum + Number(bill.totalAmount || 0),
      0
    );

    const pendingCount = billings.filter(
      (b) => b.status === BillingStatus.PENDING || b.status === BillingStatus.DRAFT
    ).length;

    const submittedCount = billings.filter(
      (b) => b.status === BillingStatus.SUBMITTED
    ).length;

    const paidCount = billings.filter(
      (b) => b.status === BillingStatus.PAID
    ).length;

    const successRate =
      submittedCount > 0
        ? (paidCount / submittedCount) * 100
        : 0;

    // KI-gestützte Insights generieren
    const aiInsights = await analytics.generateBillingInsights(billings);

    // Trendanalyse
    const trends = await analytics.analyzeBillingTrends(billings);

    res.json({
      totalRevenue,
      pendingCount,
      submittedCount,
      paidCount,
      successRate,
      aiInsights,
      trends,
      dateRange: {
        from: startDate,
        to: endDate,
      },
    });
  } catch (error) {
    console.error("Error generating billing analytics:", error);
    res.status(500).json({
      error: "Could not generate analytics",
      details: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
});

router.get("/patients", async (req, res) => {
  try {
    const [patients, employees, tours] = await Promise.all([
      storage.getPatients(),
      storage.getEmployees(),
      storage.getTours(),
    ]);

    const analytics = analyzePatientData(patients, employees, tours);
    res.json(analytics);
  } catch (error) {
    console.error("Error generating patient analytics:", error);
    res.status(500).json({ error: "Could not generate analytics" });
  }
});

export default router;