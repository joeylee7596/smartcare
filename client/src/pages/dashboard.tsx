import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Users,
  FileText,
  Route,
  Brain,
  Bell,
  Activity,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Plus,
  Wand2,
  Euro,
  TrendingUp,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Patient, Tour, Documentation, Employee, InsuranceBilling } from "@shared/schema";
import { format, isToday, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Background pattern component
const BackgroundPattern = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute w-[500px] h-[500px] -top-48 -right-48 bg-blue-500/10 rounded-full blur-3xl" />
    <div className="absolute w-[400px] h-[400px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-500/10 rounded-full blur-3xl" />
    <div className="absolute w-[600px] h-[600px] -bottom-48 -left-48 bg-indigo-500/10 rounded-full blur-3xl" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
      <pattern id="pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M0 32V16L16 0H32V16L16 32" fill="currentColor"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#pattern)"/>
    </svg>
  </div>
);

// Economic indicators chart
function EconomicIndicators({ tours }: { tours: Tour[] }) {
  const data = tours.map(tour => ({
    date: format(new Date(tour.date), 'dd.MM.'),
    profitMargin: tour.economicCalculation?.profitMargin || 0,
    revenue: tour.economicCalculation?.expectedRevenue || 0,
    costs: tour.economicCalculation?.totalCosts || 0,
  }));

  return (
    <Card className="col-span-full lg:col-span-8">
      <CardHeader>
        <CardTitle className="text-xl text-gray-800">Wirtschaftliche Entwicklung</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" name="Umsatz" />
              <Line type="monotone" dataKey="costs" stroke="#EF4444" name="Kosten" />
              <Line type="monotone" dataKey="profitMargin" stroke="#3B82F6" name="Marge" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Patient distribution chart
function PatientDistribution({ patients }: { patients: Patient[] }) {
  const data = [
    { name: 'PG 1', value: patients.filter(p => p.careLevel === 1).length },
    { name: 'PG 2', value: patients.filter(p => p.careLevel === 2).length },
    { name: 'PG 3', value: patients.filter(p => p.careLevel === 3).length },
    { name: 'PG 4', value: patients.filter(p => p.careLevel === 4).length },
    { name: 'PG 5', value: patients.filter(p => p.careLevel === 5).length },
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <Card className="col-span-full lg:col-span-4">
      <CardHeader>
        <CardTitle className="text-xl text-gray-800">Pflegegrade</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const { name, value } = payload[0].payload;
                    return (
                      <div className="bg-white p-2 rounded-lg shadow border">
                        <p className="font-medium">{name}</p>
                        <p className="text-sm text-gray-500">{value} Patienten</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          {data.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ activities }: { activities: any[] }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        <AnimatePresence>
          {activities.map((activity, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, delay: i * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-xl border bg-white/50 backdrop-blur-sm
                hover:bg-gradient-to-r hover:from-blue-50 hover:to-white
                transition-all duration-300 group"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  activity.type === "documentation" && "bg-blue-100 text-blue-700",
                  activity.type === "tour" && "bg-green-100 text-green-700",
                  activity.type === "patient" && "bg-amber-100 text-amber-700",
                  activity.type === "alert" && "bg-red-100 text-red-700"
                )}
              >
                {activity.icon}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                <p className="text-sm text-gray-500">{activity.description}</p>
              </div>
              <time className="text-xs text-gray-400">{activity.time}</time>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className,
  gradient = false
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<any>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  gradient?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className={cn(
        "relative overflow-hidden",
        "rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]",
        "hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)]",
        "border border-white/20 backdrop-blur-sm",
        gradient && "bg-gradient-to-br from-blue-500/[0.08] via-blue-400/[0.05] to-transparent",
        className
      )}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className={cn(
                "p-4 rounded-2xl shadow-lg",
                gradient
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25"
                  : "bg-white shadow-blue-500/10"
              )}
            >
              <Icon
                className={cn(
                  "h-8 w-8",
                  !gradient && "text-blue-500"
                )}
              />
            </motion.div>
            <div className="text-right">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
              >
                {value}
              </motion.div>
              <div className="text-sm text-gray-500 mt-1 flex items-center justify-end gap-2">
                {trendValue && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      trend === "up" && "bg-green-100 text-green-700",
                      trend === "down" && "bg-red-100 text-red-700",
                      trend === "neutral" && "bg-gray-100 text-gray-700"
                    )}
                  >
                    {trendValue}
                  </motion.span>
                )}
                {description}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Query all necessary data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours", { start: weekStart, end: weekEnd }],
  });

  const { data: docs = [] } = useQuery<Documentation[]>({
    queryKey: ["/api/docs"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: billings = [] } = useQuery<InsuranceBilling[]>({
    queryKey: ["/api/billings"],
  });

  // Calculate KPIs
  const todaysTours = tours.filter(tour => isToday(new Date(tour.date)));
  const criticalPatients = patients.filter(patient => patient.careLevel >= 4);
  const pendingDocs = docs.filter(doc => doc.status === "pending");
  const activeEmployees = employees.filter(emp => emp.status === "active");

  const totalRevenue = billings
    .filter(b => b.status === "paid")
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  const averageProfitMargin = tours
    .filter(t => t.economicCalculation?.profitMargin)
    .reduce((sum, t) => sum + (t.economicCalculation?.profitMargin || 0), 0) / tours.length;

  // Generate activity feed from real data
  const recentActivities = [
    ...docs.slice(0, 3).map(doc => ({
      type: "documentation" as const,
      icon: <FileText className="h-5 w-5" />,
      title: `Dokumentation erstellt`,
      description: `Pflege-Dokumentation für Patient #${doc.patientId}`,
      time: format(new Date(doc.date), 'HH:mm'),
    })),
    ...tours.slice(0, 3).map(tour => ({
      type: "tour" as const,
      icon: <Route className="h-5 w-5" />,
      title: `Tour ${tour.id} ${tour.status}`,
      description: `${tour.patientIds.length} Patienten, ${
        tour.optimizationScore ? `Optimierungsscore: ${tour.optimizationScore}` : 'Keine Optimierung'
      }`,
      time: format(new Date(tour.date), 'HH:mm'),
    })),
    ...billings.slice(0, 3).map(billing => ({
      type: "alert" as const,
      icon: <Euro className="h-5 w-5" />,
      title: `Abrechnung ${billing.status}`,
      description: `${billing.totalAmount}€ für Patient #${billing.patientId}`,
      time: format(new Date(billing.date), 'HH:mm'),
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white relative">
      <BackgroundPattern />
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Willkommen zurück, {user?.name}
            </h1>
            <p className="text-lg text-gray-500">
              {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCard
              title="Aktive Patienten"
              value={patients.length}
              description={`${criticalPatients.length} kritische Fälle`}
              icon={Users}
              trend={criticalPatients.length > 5 ? "down" : "up"}
              trendValue={criticalPatients.length > 5 ? "Hohe Belastung" : "Normal"}
              gradient
            />
            <StatsCard
              title="Heutige Touren"
              value={todaysTours.length}
              description={`${todaysTours.filter(t => t.status === 'completed').length} abgeschlossen`}
              icon={Route}
              trend={todaysTours.length > 0 ? "neutral" : "down"}
              trendValue={todaysTours.length > 0 ? "Planmäßig" : "Keine Touren"}
              gradient
            />
            <StatsCard
              title="Offene Dokumentation"
              value={pendingDocs.length}
              description="Ausstehende Berichte"
              icon={Brain}
              trend={pendingDocs.length > 5 ? "down" : "up"}
              trendValue={pendingDocs.length > 5 ? "Überfällig" : "Aktuell"}
              gradient
            />
            <StatsCard
              title="Umsatz (MTD)"
              value={`${totalRevenue.toLocaleString('de-DE')}€`}
              description={`${averageProfitMargin.toFixed(1)}% Marge`}
              icon={TrendingUp}
              trend={averageProfitMargin > 15 ? "up" : "down"}
              trendValue={`${averageProfitMargin > 15 ? "Profitabel" : "Kritisch"}`}
              className="bg-gradient-to-br from-emerald-500/[0.08] via-emerald-400/[0.05] to-transparent"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12 mb-8">
            <EconomicIndicators tours={tours} />
            <PatientDistribution patients={patients} />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-8 rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-gray-800">Aktivitäten</CardTitle>
                <Bell className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={recentActivities} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Personal heute</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {activeEmployees.map((employee) => (
                      <div
                        key={employee.id}
                        className="p-4 rounded-xl border bg-white/50 hover:bg-blue-50/50 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-gray-500">{employee.role}</p>
                          </div>
                          <Badge
                            variant={employee.status === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {employee.status}
                          </Badge>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {employee.qualifications?.nursingDegree && (
                            <Badge variant="outline" className="bg-blue-50">
                              Examiniert
                            </Badge>
                          )}
                          {employee.languages?.map((lang) => (
                            <Badge key={lang} variant="outline" className="bg-green-50">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}