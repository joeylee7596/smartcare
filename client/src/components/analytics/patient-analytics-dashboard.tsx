import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  AlertCircle,
  Heart,
  DollarSign,
  UserCheck,
  Clock,
  Activity,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

type PatientAnalytics = {
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
};

export function PatientAnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery<PatientAnalytics>({
    queryKey: ["/api/analytics/patients"],
  });

  if (isLoading || !analytics) {
    return (
      <div className="p-8">
        <div className="h-[400px] rounded-lg border border-dashed flex items-center justify-center">
          <p className="text-muted-foreground">Analysiere Patientendaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Gesamtpatienten"
          value={analytics.totalPatients}
          description="Aktive Patienten"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Auslastung"
          value={`${analytics.utilizationMetrics.utilizationRate.toFixed(1)}%`}
          description={`${analytics.utilizationMetrics.currentCapacity} von ${analytics.utilizationMetrics.maxCapacity}`}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Durchschn. Marge"
          value={`${analytics.economicMetrics.averageProfitMargin.toFixed(1)}%`}
          description="Gewinnspanne"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Personal"
          value={analytics.staffingMetrics.activeEmployees}
          description={`1:${analytics.staffingMetrics.patientToStaffRatio.toFixed(1)} Betreuungsschlüssel`}
          icon={<UserCheck className="h-4 w-4" />}
        />
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Care Levels Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verteilung Pflegegrade</CardTitle>
            <CardDescription>
              Aktuelle Verteilung nach Pflegestufen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.byCareLevels).map(([level, count]) => (
                <div key={level}>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Pflegegrad {level}</span>
                    <span className="font-medium">{count} Patienten</span>
                  </div>
                  <Progress
                    value={(count / analytics.totalPatients) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Economic Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wirtschaftlichkeit</CardTitle>
            <CardDescription>
              Profitabilität nach Pflegegrad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.economicMetrics.profitabilityByCareLevels)
                .map(([level, margin]) => (
                  <div key={level}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Pflegegrad {level}</span>
                      <span className="font-medium">{margin.toFixed(1)}% Marge</span>
                    </div>
                    <Progress
                      value={margin}
                      className="h-2"
                      indicatorClassName={
                        margin < 0
                          ? "bg-destructive"
                          : margin < 10
                          ? "bg-warning"
                          : undefined
                      }
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Staff Qualifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qualifikationen</CardTitle>
            <CardDescription>
              Abdeckung der Qualifikationen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.staffingMetrics.qualificationCoverage)
                .map(([qual, coverage]) => (
                  <div key={qual}>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{formatQualification(qual)}</span>
                      <span className="font-medium">{coverage.toFixed(0)}%</span>
                    </div>
                    <Progress value={coverage} className="h-2" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Demand Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Auslastungsanalyse</CardTitle>
            <CardDescription>
              Spitzenzeiten und Engpässe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Spitzenzeiten
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analytics.demandAnalysis.peakDemandHours.map((hour) => (
                    <span
                      key={hour}
                      className="px-2 py-1 bg-primary/10 rounded-md text-sm"
                    >
                      {hour}
                    </span>
                  ))}
                </div>
              </div>

              {analytics.demandAnalysis.understaffedPeriods.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Unterbesetzte Zeiten
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analytics.demandAnalysis.understaffedPeriods.map((period) => (
                      <span
                        key={period}
                        className="px-2 py-1 bg-destructive/10 text-destructive rounded-md text-sm"
                      >
                        {period}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatQualification(qual: string): string {
  const map: Record<string, string> = {
    nursingDegree: "Examiniert",
    medicationAdministration: "Medikamentengabe",
    woundCare: "Wundversorgung",
    dementiaCare: "Demenzbetreuung",
    palliativeCare: "Palliativpflege",
    lifting: "Hebetechniken",
    firstAid: "Erste Hilfe",
  };
  return map[qual] || qual;
}
