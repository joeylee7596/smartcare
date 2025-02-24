import { Router } from 'express';
import { db } from '../db';
import { eq, and, between, sql } from 'drizzle-orm';
import { documentation, tours, shifts, type Tour, type Shift } from '@shared/schema';
import { generateDocumentationSuggestions, analyzeDocumentationQuality } from '../services/ai-documentation';

const router = Router();

// Check for missing documentation
router.get('/check', async (req, res) => {
  try {
    const { patientId, startDate, endDate } = req.query;

    if (!patientId || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Ungültige Anfrage',
        details: 'Patient ID und Datumsbereich sind erforderlich'
      });
    }

    const existingDocs = await db.select()
      .from(documentation)
      .where(
        and(
          eq(documentation.patientId, Number(patientId)),
          between(documentation.date, new Date(startDate as string), new Date(endDate as string))
        )
      );

    // Fetch all tours and shifts for the time period to check against
    const tourResults = await db.select()
      .from(tours)
      .where(
        and(
          sql`${tours.patientIds} @> ARRAY[${Number(patientId)}]::integer[]`,
          between(tours.date, new Date(startDate as string), new Date(endDate as string))
        )
      );

    const shiftResults = await db.select()
      .from(shifts)
      .where(
        and(
          eq(shifts.patientId, Number(patientId)),
          between(shifts.startTime, new Date(startDate as string), new Date(endDate as string))
        )
      );

    // Find missing documentation
    const missingDocs: Array<{
      date: string;
      type: 'tour' | 'shift';
      id: number;
    }> = [];

    // Check tours
    tourResults.forEach((tour: Tour) => {
      const hasDoc = existingDocs.some(doc => 
        doc.tourId === tour.id && 
        new Date(doc.date).toDateString() === new Date(tour.date).toDateString()
      );
      if (!hasDoc) {
        missingDocs.push({
          date: new Date(tour.date).toISOString(),
          type: 'tour',
          id: tour.id
        });
      }
    });

    // Check shifts
    shiftResults.forEach((shift: Shift) => {
      const hasDoc = existingDocs.some(doc => 
        doc.shiftId === shift.id && 
        new Date(doc.date).toDateString() === new Date(shift.startTime).toDateString()
      );
      if (!hasDoc) {
        missingDocs.push({
          date: new Date(shift.startTime).toISOString(),
          type: 'shift',
          id: shift.id
        });
      }
    });

    return res.json({ missingDocs });
  } catch (error) {
    console.error('Documentation check error:', error);
    return res.status(500).json({
      error: 'Dokumentationsprüfung fehlgeschlagen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

// Get AI suggestions for documentation
router.post('/suggest', async (req, res) => {
  try {
    const { content, patientContext, type } = req.body;

    if (!type) {
      return res.status(400).json({
        error: 'Ungültige Anfrage',
        details: 'Dokumentationstyp ist erforderlich'
      });
    }

    const suggestions = await generateDocumentationSuggestions({
      content,
      patientContext,
      type
    });

    return res.json({ suggestions });
  } catch (error) {
    console.error('AI suggestion error:', error);
    return res.status(500).json({
      error: 'KI-Vorschläge konnten nicht generiert werden',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

// Analyze documentation quality
router.post('/analyze', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Ungültige Anfrage',
        details: 'Dokumentationsinhalt ist erforderlich'
      });
    }

    const analysis = await analyzeDocumentationQuality(content);
    return res.json(analysis);
  } catch (error) {
    console.error('Documentation analysis error:', error);
    return res.status(500).json({
      error: 'Dokumentationsanalyse fehlgeschlagen',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

export default router;