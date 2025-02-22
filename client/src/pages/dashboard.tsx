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
  ChevronRight
} from "lucide-react";
import { Patient, Tour, Documentation, Employee } from "@shared/schema";
import { format } from "date-fns";
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
  Tooltip,
  ResponsiveContainer
} from "recharts";

function DashboardCard({ 
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
    <Card className={cn(
      "relative overflow-hidden transition-all duration-500",
      "hover:scale-[1.02] hover:-translate-y-1",
      "rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]",
      "hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)]",
      "border border-white/20 backdrop-blur-sm",
      gradient && "bg-gradient-to-br from-blue-500/[0.08] via-blue-400/[0.05] to-transparent",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn(
            "p-4 rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110",
            gradient 
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25" 
              : "bg-white shadow-blue-500/10"
          )}>
            <Icon 
              className={cn(
                "h-8 w-8 transition-all duration-500",
                "group-hover:scale-110 group-hover:rotate-6",
                !gradient && "text-blue-500"
              )} 
            />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {value}
            </div>
            <div className="text-sm text-gray-500 mt-1 flex items-center justify-end gap-2">
              {trendValue && (
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  trend === "up" && "bg-green-100 text-green-700",
                  trend === "down" && "bg-red-100 text-red-700",
                  trend === "neutral" && "bg-gray-100 text-gray-700"
                )}>
                  {trendValue}
                </span>
              )}
              {description}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-medium text-sm text-gray-600">{title}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityFeed({ activities }: { activities: any[] }) {
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4 pr-4">
        {activities.map((activity, i) => (
          <div 
            key={i}
            className="flex items-start gap-4 p-4 rounded-xl border bg-white/50 backdrop-blur-sm
              hover:bg-gradient-to-r hover:from-blue-50 hover:to-white
              transition-all duration-300 group"
          >
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              activity.type === "documentation" && "bg-blue-100 text-blue-700",
              activity.type === "tour" && "bg-green-100 text-green-700",
              activity.type === "patient" && "bg-amber-100 text-amber-700",
              activity.type === "alert" && "bg-red-100 text-red-700"
            )}>
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{activity.title}</p>
              <p className="text-sm text-gray-500">{activity.description}</p>
            </div>
            <time className="text-xs text-gray-400">{activity.time}</time>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: docs = [] } = useQuery<Documentation[]>({
    queryKey: ["/api/docs"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  const criticalPatients = patients.filter(patient => patient.careLevel >= 4);
  const pendingDocs = docs.filter(doc => doc.status === "pending");
  const activeEmployees = employees.filter(emp => emp.status === "active");

  // Mock activities for demonstration
  const recentActivities = [
    {
      type: "documentation",
      icon: <FileText className="h-5 w-5" />,
      title: "Neue Dokumentation erstellt",
      description: "Pflege-Dokumentation für Elisabeth Weber wurde mit KI-Unterstützung erstellt",
      time: "Vor 5 Min."
    },
    {
      type: "tour",
      icon: <Route className="h-5 w-5" />,
      title: "Tour #23 abgeschlossen",
      description: "Alle Patienten wurden erfolgreich besucht",
      time: "Vor 15 Min."
    },
    {
      type: "patient",
      icon: <Activity className="h-5 w-5" />,
      title: "Neuer Patient aufgenommen",
      description: "Hans Müller wurde erfolgreich registriert",
      time: "Vor 1 Std."
    },
    {
      type: "alert",
      icon: <AlertTriangle className="h-5 w-5" />,
      title: "Dringende Anfrage",
      description: "Notfallkontakt für Patient #45 aktualisiert",
      time: "Vor 2 Std."
    }
  ];

  // Mock data for care level distribution
  const careLevelData = [
    { name: 'PG 1', count: patients.filter(p => p.careLevel === 1).length },
    { name: 'PG 2', count: patients.filter(p => p.careLevel === 2).length },
    { name: 'PG 3', count: patients.filter(p => p.careLevel === 3).length },
    { name: 'PG 4', count: patients.filter(p => p.careLevel === 4).length },
    { name: 'PG 5', count: patients.filter(p => p.careLevel === 5).length },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Willkommen zurück, {user?.name}
            </h1>
            <p className="text-lg text-gray-500">
              {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <DashboardCard
              title="Aktive Patienten"
              value={patients.length}
              description={`${criticalPatients.length} kritische Fälle`}
              icon={Users}
              trend="up"
              trendValue="+2 diese Woche"
              gradient
            />
            <DashboardCard
              title="Heutige Touren"
              value={todaysTours.length}
              description={`Nächste: ${todaysTours[0] ? format(new Date(todaysTours[0].date), "HH:mm") : '--:--'}`}
              icon={Route}
              trend="neutral"
              trendValue="Planmäßig"
              gradient
            />
            <DashboardCard
              title="Dokumentation"
              value={pendingDocs.length}
              description="Ausstehende Berichte"
              icon={Brain}
              trend={pendingDocs.length > 5 ? "down" : "up"}
              trendValue={pendingDocs.length > 5 ? "Überfällig" : "Aktuell"}
              gradient
            />
            <DashboardCard
              title="Personal im Dienst"
              value={activeEmployees.length}
              description="von insgesamt"
              icon={Users}
              trend={activeEmployees.length < 5 ? "down" : "up"}
              trendValue={`${activeEmployees.length}/${employees.length}`}
              className="bg-gradient-to-br from-emerald-500/[0.08] via-emerald-400/[0.05] to-transparent"
            />
          </div>

          {/* Main Content Area */}
          <div className="grid gap-6 lg:grid-cols-7">
            {/* Left Column: Care Level Distribution */}
            <Card className="lg:col-span-3 rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Pflegegrad-Verteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={careLevelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Middle Column: Recent Activity */}
            <Card className="lg:col-span-4 rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-gray-800">Aktivitäten</CardTitle>
                <Bell className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={recentActivities} />
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <Link href="/patients/new">
              <Button 
                variant="outline" 
                className="w-full justify-between h-14 rounded-xl
                  bg-gradient-to-r from-white to-blue-50/50
                  hover:from-blue-50 hover:to-blue-100/50
                  border border-white/40 hover:border-blue-200
                  hover:shadow-lg hover:-translate-y-0.5
                  transition-all duration-500 group"
              >
                <div className="flex items-center">
                  <Users className="mr-3 h-5 w-5 text-blue-500 
                    transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                  <span className="font-medium text-gray-700">Neuer Patient</span>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                  group-hover:translate-x-1 transition-all duration-500" />
              </Button>
            </Link>
            <Link href="/tours/new">
              <Button 
                variant="outline" 
                className="w-full justify-between h-14 rounded-xl
                  bg-gradient-to-r from-white to-blue-50/50
                  hover:from-blue-50 hover:to-blue-100/50
                  border border-white/40 hover:border-blue-200
                  hover:shadow-lg hover:-translate-y-0.5
                  transition-all duration-500 group"
              >
                <div className="flex items-center">
                  <Route className="mr-3 h-5 w-5 text-blue-500 
                    transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                  <span className="font-medium text-gray-700">Tour planen</span>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                  group-hover:translate-x-1 transition-all duration-500" />
              </Button>
            </Link>
            <Link href="/documentation/new">
              <Button 
                variant="outline" 
                className="w-full justify-between h-14 rounded-xl
                  bg-gradient-to-r from-white to-blue-50/50
                  hover:from-blue-50 hover:to-blue-100/50
                  border border-white/40 hover:border-blue-200
                  hover:shadow-lg hover:-translate-y-0.5
                  transition-all duration-500 group"
              >
                <div className="flex items-center">
                  <Brain className="mr-3 h-5 w-5 text-blue-500 
                    transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                  <span className="font-medium text-gray-700">KI-Dokumentation</span>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                  group-hover:translate-x-1 transition-all duration-500" />
              </Button>
            </Link>
            <Link href="/schedule">
              <Button 
                variant="outline" 
                className="w-full justify-between h-14 rounded-xl
                  bg-gradient-to-r from-white to-blue-50/50
                  hover:from-blue-50 hover:to-blue-100/50
                  border border-white/40 hover:border-blue-200
                  hover:shadow-lg hover:-translate-y-0.5
                  transition-all duration-500 group"
              >
                <div className="flex items-center">
                  <Calendar className="mr-3 h-5 w-5 text-blue-500 
                    transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                  <span className="font-medium text-gray-700">Dienstplan</span>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                  group-hover:translate-x-1 transition-all duration-500" />
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}