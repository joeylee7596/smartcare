import { type Patient, type Employee, type Tour } from "@shared/schema";
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format } from "date-fns";
import { de } from "date-fns/locale";

export interface PatientAnalytics {
  totalPatients: number;
  byCareLevels: Record<number, number>;
  utilizationMetrics: {
    currentCapacity: number;
    maxCapacity: number;
    utilizationRate: number;
  };
  economicMetrics: {
    averageProfitMargin: number;
    profitabilityByCareLevels: Record<number, number>;
    revenueProjection: number;
  };
  staffingMetrics: {
    activeEmployees: number;
    patientToStaffRatio: number;
    qualificationCoverage: Record<string, number>;
  };
  demandAnalysis: {
    peakDemandHours: string[];
    understaffedPeriods: string[];
    serviceBottlenecks: string[];
  };
}

export function analyzePatientData(
  patients: Patient[],
  employees: Employee[],
  tours: Tour[],
): PatientAnalytics {
  // Calculate patient statistics
  const byCareLevels = patients.reduce((acc, patient) => {
    acc[patient.careLevel] = (acc[patient.careLevel] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Calculate utilization metrics
  const activeEmployees = employees.filter(e => e.status === 'active');
  const maxPatientsPerDay = activeEmployees.length * 8; // Assuming 8 patients per employee per day

  const currentPatients = patients.length;
  const utilizationRate = (currentPatients / maxPatientsPerDay) * 100;

  // Calculate economic metrics based on billing data and care levels
  const profitabilityByCareLevels = calculateProfitabilityByCareLevels(patients, tours);
  const averageProfitMargin = Object.values(profitabilityByCareLevels)
    .reduce((sum, val) => sum + val, 0) / Object.values(profitabilityByCareLevels).length || 0;

  // Project monthly revenue based on current tours and rates
  const revenueProjection = calculateRevenueProjection(tours);

  // Analyze staff qualifications coverage
  const qualificationCoverage = calculateQualificationCoverage(employees);

  // Analyze peak demand and bottlenecks
  const demandAnalysis = analyzeDemandPatterns(tours);

  return {
    totalPatients: currentPatients,
    byCareLevels,
    utilizationMetrics: {
      currentCapacity: currentPatients,
      maxCapacity: maxPatientsPerDay,
      utilizationRate,
    },
    economicMetrics: {
      averageProfitMargin,
      profitabilityByCareLevels,
      revenueProjection,
    },
    staffingMetrics: {
      activeEmployees: activeEmployees.length,
      patientToStaffRatio: currentPatients / activeEmployees.length || 0,
      qualificationCoverage,
    },
    demandAnalysis,
  };
}

function calculateProfitabilityByCareLevels(
  patients: Patient[],
  tours: Tour[],
): Record<number, number> {
  const profitByLevel: Record<number, { total: number; count: number }> = {};

  // Initialize profitability for each care level
  patients.forEach(patient => {
    if (!profitByLevel[patient.careLevel]) {
      profitByLevel[patient.careLevel] = { total: 0, count: 0 };
    }
    profitByLevel[patient.careLevel].count++;
  });

  // Calculate average profit margins per care level
  tours.forEach(tour => {
    const tourProfit = tour.economicMetrics?.profitMargin || 0;
    tour.patientIds.forEach(patientId => {
      const patient = patients.find(p => p.id === patientId);
      if (patient && profitByLevel[patient.careLevel]) {
        profitByLevel[patient.careLevel].total += tourProfit;
      }
    });
  });

  // Calculate averages
  return Object.entries(profitByLevel).reduce((acc, [level, { total, count }]) => {
    acc[Number(level)] = count > 0 ? (total / count) : 0;
    return acc;
  }, {} as Record<number, number>);
}

function calculateRevenueProjection(tours: Tour[]): number {
  const recentTours = tours.filter(t => {
    const tourDate = new Date(t.date);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return tourDate >= weekStart && tourDate <= weekEnd;
  });

  const weeklyRevenue = recentTours.reduce((sum, tour) => {
    return sum + (tour.economicMetrics?.expectedRevenue || 0);
  }, 0);

  return weeklyRevenue * 4.3; // Monthly projection (average weeks per month)
}

function calculateQualificationCoverage(employees: Employee[]): Record<string, number> {
  const qualificationCounts: Record<string, number> = {};
  const totalEmployees = employees.length;

  employees.forEach(employee => {
    Object.entries(employee.qualifications || {}).forEach(([qual, hasQual]) => {
      if (typeof hasQual === 'boolean' && hasQual) {
        qualificationCounts[qual] = (qualificationCounts[qual] || 0) + 1;
      }
    });
  });

  return Object.entries(qualificationCounts).reduce((acc, [qual, count]) => {
    acc[qual] = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
    return acc;
  }, {} as Record<string, number>);
}

function analyzeDemandPatterns(tours: Tour[]): {
  peakDemandHours: string[];
  understaffedPeriods: string[];
  serviceBottlenecks: string[];
} {
  const hourlyDemand: Record<number, number> = {};
  const daysRange = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  // Analyze tours for the week
  tours.forEach(tour => {
    const tourDate = new Date(tour.date);
    const hour = tourDate.getHours();

    if (daysRange.some(day => isSameDay(day, tourDate))) {
      hourlyDemand[hour] = (hourlyDemand[hour] || 0) + tour.patientIds.length;
    }
  });

  // Find peak hours (top 20% of demand)
  const sortedHours = Object.entries(hourlyDemand)
    .sort(([, a], [, b]) => b - a)
    .slice(0, Math.ceil(Object.keys(hourlyDemand).length * 0.2));

  // Identify understaffed periods and bottlenecks
  const understaffedPeriods = tours
    .filter(tour => tour.staffingMetrics?.isUnderstaffed)
    .map(tour => format(new Date(tour.date), "EEEE HH:mm", { locale: de }));

  const bottlenecks = tours
    .filter(tour => {
      const optScore = tour.optimizationMetrics?.score || 0;
      return typeof optScore === 'number' && optScore < 0.7;
    })
    .map(tour => format(new Date(tour.date), "EEEE HH:mm", { locale: de }));

  return {
    peakDemandHours: sortedHours.map(([hour]) => `${hour}:00`),
    understaffedPeriods: Array.from(new Set(understaffedPeriods)),
    serviceBottlenecks: Array.from(new Set(bottlenecks)),
  };
}