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
  HelpCircle
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
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
          <div className="mt-4">
            <h3 className="font-medium text-sm text-gray-600">{title}</h3>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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

// Quick Action component
function QuickAction({ 
  icon: Icon, 
  label, 
  description, 
  onClick,
  shortcut 
}: { 
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer"
          >
            <Button
              variant="outline"
              className="w-full justify-between p-4 h-auto rounded-xl
                bg-gradient-to-r from-white to-blue-50/50
                hover:from-blue-50 hover:to-blue-100/50
                border border-white/40 hover:border-blue-200
                hover:shadow-lg
                transition-all duration-500 group"
              onClick={onClick}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Icon className="h-5 w-5 text-blue-600
                    transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-700">{label}</div>
                  <div className="text-sm text-gray-500 mt-1">{description}</div>
                </div>
              </div>
              {shortcut && (
                <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded">
                  {shortcut}
                </kbd>
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
          {shortcut && <p className="text-xs text-gray-500">Shortcut: {shortcut}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// AI Assistant Dialog component
function AIAssistantDialog() {
  const { toast } = useToast();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="fixed right-6 bottom-6 h-14 w-14 rounded-full shadow-xl
            bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
            transition-all duration-300 hover:scale-110"
        >
          <Wand2 className="h-6 w-6 text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>KI-Assistent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto p-4"
            onClick={() => {
              toast({
                title: "Tour-Optimierung gestartet",
                description: "Der KI-Assistent analysiert Ihre Touren...",
              });
            }}
          >
            <Route className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Tour optimieren</div>
              <div className="text-sm text-gray-500">Lassen Sie die KI Ihre Touren automatisch optimieren</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto p-4"
            onClick={() => {
              toast({
                title: "Dokumentation wird erstellt",
                description: "Die KI erstellt einen Dokumentationsvorschlag...",
              });
            }}
          >
            <FileText className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Dokumentation erstellen</div>
              <div className="text-sm text-gray-500">Automatische Erstellung einer Pflegedokumentation</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto p-4"
            onClick={() => {
              toast({
                title: "Dienstplan-Analyse gestartet",
                description: "Die KI analysiert Ihren Dienstplan...",
              });
            }}
          >
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Dienstplan analysieren</div>
              <div className="text-sm text-gray-500">KI-gestützte Analyse und Optimierung des Dienstplans</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

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

  const quickActions = [
    {
      icon: Users,
      label: "Patient aufnehmen",
      description: "Schnelle Patientenaufnahme mit KI-Unterstützung",
      shortcut: "⌘ + N",
      onClick: () => {
        toast({
          title: "Patientenaufnahme gestartet",
          description: "Die KI-gestützte Aufnahme wird vorbereitet...",
        });
      }
    },
    {
      icon: Route,
      label: "Schnell-Tour",
      description: "KI erstellt optimierte Tour basierend auf aktuellen Patienten",
      shortcut: "⌘ + T",
      onClick: () => {
        toast({
          title: "Tour wird erstellt",
          description: "Die KI optimiert die Route...",
        });
      }
    },
    {
      icon: Brain,
      label: "Smart-Dokumentation",
      description: "Automatische Dokumentation mit Spracheingabe",
      shortcut: "⌘ + D",
      onClick: () => {
        toast({
          title: "Dokumentation wird vorbereitet",
          description: "Spracherkennung wird initialisiert...",
        });
      }
    },
    {
      icon: Calendar,
      label: "Dienstplan-Assistent",
      description: "KI-gestützte Dienstplanerstellung",
      shortcut: "⌘ + S",
      onClick: () => {
        toast({
          title: "Dienstplan-Assistent",
          description: "Die KI analysiert verfügbare Mitarbeiter...",
        });
      }
    }
  ];

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

          {/* Quick Actions Grid */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8"
          >
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
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-7">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-3"
            >
              <Card className="rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-800">Pflegegrad-Verteilung</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={careLevelData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="lg:col-span-4"
            >
              <Card className="rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl text-gray-800">Aktivitäten</CardTitle>
                  <Bell className="h-5 w-5 text-gray-400" />
                </CardHeader>
                <CardContent>
                  <ActivityFeed activities={recentActivities} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Floating AI Assistant Button */}
          <AIAssistantDialog />
        </main>
      </div>
    </div>
  );
}