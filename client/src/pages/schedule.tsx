import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { useState, useEffect } from "react";
import {
  Brain,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Settings2,
  Wand2,
  Plus,
  FileText,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Sliders,
  UserCheck,
  Scale,
  Heart
} from "lucide-react";
import type { Employee, Shift, ShiftTemplate } from "@shared/schema";
import { ModernRoster } from "@/components/scheduling/modern-roster";
import { ShiftTemplatesDialog } from "@/components/scheduling/shift-templates-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Helper function to calculate employee workload
const calculateWorkload = (shifts: Shift[], employeeId: number): number => {
  const employeeShifts = shifts.filter(s => s.employeeId === employeeId);
  return (employeeShifts.length / shifts.length) * 100;
};

type ScheduleView = "daily" | "weekly";
type ScheduleMode = "manual" | "auto";
type OptimizationFocus = "workload" | "preferences" | "efficiency";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<ScheduleView>("weekly");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("manual");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [department, setDepartment] = useState("all");
  const [optimizationFocus, setOptimizationFocus] = useState<OptimizationFocus>("workload");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendMessage, subscribe } = useWebSocket();

  // Enhanced data fetching with proper typing
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: startOfWeek(selectedDate, { locale: de }).toISOString(),
      end: endOfWeek(selectedDate, { locale: de }).toISOString(),
    }],
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/shift-templates"],
  });

  // AI Optimization Mutation with Gemini Integration
  const optimizeScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/schedule/optimize", {
        startDate: startOfWeek(selectedDate).toISOString(),
        endDate: endOfWeek(selectedDate).toISOString(),
        department,
        optimizationFocus,
        scheduleMode,
      });
      if (!res.ok) throw new Error("Optimierung fehlgeschlagen");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Dienstplan optimiert",
        description: `Die KI hat ${data.changesCount} Änderungen vorgenommen für optimale ${
          optimizationFocus === "workload" ? "Arbeitsbelastung" :
            optimizationFocus === "preferences" ? "Mitarbeiterzufriedenheit" : "Effizienz"
        }.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Die Optimierung konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    },
  });

  // WebSocket subscription for real-time updates
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      if (message.type === 'SHIFT_UPDATED' || message.type === 'OPTIMIZATION_COMPLETE') {
        queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
        toast({
          title: message.type === 'SHIFT_UPDATED' ? "Schicht aktualisiert" : "Optimierung abgeschlossen",
          description: message.description,
        });
      }
    });

    return () => unsubscribe();
  }, [subscribe, queryClient, toast]);

  // Calculate statistics and insights
  const stats = {
    totalShifts: shifts.length,
    coveredShifts: shifts.filter(s => s.employeeId).length,
    openShifts: shifts.filter(s => !s.employeeId).length,
    activeEmployees: new Set(shifts.map(s => s.employeeId)).size,
    averageWorkload: employees.length > 0
      ? employees.reduce((acc, emp) => acc + calculateWorkload(shifts, emp.id), 0) / employees.length
      : 0
  };

  // AI Insights based on current schedule
  const getAiInsights = () => {
    const insights = [];

    if (stats.openShifts > 0) {
      insights.push({
        type: "warning",
        icon: AlertTriangle,
        message: `${stats.openShifts} offene Schichten zu besetzen`
      });
    }

    if (stats.averageWorkload > 80) {
      insights.push({
        type: "alert",
        icon: Scale,
        message: "Hohe durchschnittliche Arbeitsbelastung"
      });
    }

    const overworkedEmployees = employees.filter(emp =>
      calculateWorkload(shifts, emp.id) > 90
    );

    if (overworkedEmployees.length > 0) {
      insights.push({
        type: "critical",
        icon: Heart,
        message: `${overworkedEmployees.length} Mitarbeiter mit sehr hoher Belastung`
      });
    }

    return insights;
  };

  const aiInsights = getAiInsights();

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex">
          {/* Left Panel - Enhanced Controls & Insights */}
          <div className="w-80 border-r border-gray-200 bg-white/80 backdrop-blur-sm">
            <ScrollArea className="h-[calc(100vh-4rem)] p-4">
              <div className="space-y-6">
                {/* Calendar */}
                <div>
                  <Label className="text-base font-semibold">Datum</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border w-full"
                    locale={de}
                  />
                </div>

                {/* Enhanced Stats Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-white border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Übersicht
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Gesamt</div>
                      <div className="font-medium">{stats.totalShifts} Schichten</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Besetzt</div>
                      <div className="font-medium">{stats.coveredShifts} Schichten</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Offen</div>
                      <div className="font-medium text-yellow-600">{stats.openShifts} Schichten</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Aktiv</div>
                      <div className="font-medium">{stats.activeEmployees} Mitarbeiter</div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Durchschnittliche Auslastung</span>
                        <span className="font-medium">{Math.round(stats.averageWorkload)}%</span>
                      </div>
                      <Progress value={stats.averageWorkload} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced View Controls */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Ansicht</Label>
                    <Tabs value={view} className="w-full mt-2">
                      <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="daily" onClick={() => setView("daily")}>Tag</TabsTrigger>
                        <TabsTrigger value="weekly" onClick={() => setView("weekly")}>Woche</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Abteilung</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Abteilungen</SelectItem>
                        <SelectItem value="general">Allgemeinpflege</SelectItem>
                        <SelectItem value="intensive">Intensivpflege</SelectItem>
                        <SelectItem value="palliative">Palliativpflege</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Enhanced AI Controls */}
                <Card className="border-2 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      KI-Planung
                    </CardTitle>
                    <CardDescription>
                      Optimieren Sie den Dienstplan mit KI-Unterstützung
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Planungsmodus</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <Button
                          variant={scheduleMode === "manual" ? "default" : "outline"}
                          onClick={() => setScheduleMode("manual")}
                          className="w-full"
                          size="sm"
                        >
                          <Settings2 className="h-4 w-4 mr-1" />
                          Manuell
                        </Button>
                        <Button
                          variant={scheduleMode === "auto" ? "default" : "outline"}
                          onClick={() => setScheduleMode("auto")}
                          className="w-full"
                          size="sm"
                        >
                          <Wand2 className="h-4 w-4 mr-1" />
                          KI
                        </Button>
                        <Button
                          variant={scheduleMode === "balanced" ? "default" : "outline"}
                          onClick={() => setScheduleMode("balanced")}
                          className="w-full"
                          size="sm"
                        >
                          <Scale className="h-4 w-4 mr-1" />
                          Hybrid
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Optimierungsfokus</Label>
                      <Select value={optimizationFocus} onValueChange={(value: OptimizationFocus) => setOptimizationFocus(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="workload">
                            <div className="flex items-center gap-2">
                              <Scale className="h-4 w-4" />
                              Arbeitsbelastung
                            </div>
                          </SelectItem>
                          <SelectItem value="preferences">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4" />
                              Mitarbeiterwünsche
                            </div>
                          </SelectItem>
                          <SelectItem value="efficiency">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              Effizienz
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                      onClick={() => optimizeScheduleMutation.mutate()}
                      disabled={optimizeScheduleMutation.isPending}
                    >
                      {optimizeScheduleMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Optimiere...
                        </>
                      ) : (
                        <>
                          <Brain className="mr-2 h-4 w-4" />
                          KI-Optimierung starten
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* AI Insights */}
                <Card className="border-2 bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      KI-Erkenntnisse
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiInsights.map((insight, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 ${
                            insight.type === "warning" ? "text-yellow-600" :
                              insight.type === "alert" ? "text-orange-600" :
                                "text-red-600"
                            }`}
                        >
                          <insight.icon className="h-4 w-4" />
                          <span className="text-sm">{insight.message}</span>
                        </div>
                      ))}
                      {aiInsights.length === 0 && (
                        <div className="flex items-center gap-2 text-green-600">
                          <UserCheck className="h-4 w-4" />
                          <span className="text-sm">Optimale Verteilung erreicht</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Templates Section - Remains largely unchanged */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Schichtvorlagen</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTemplateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-48 rounded-md border">
                    <div className="p-2 space-y-2">
                      {templates.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="w-full justify-start text-left"
                          size="sm"
                        >
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-gray-500">
                              {template.startTime} - {template.endTime}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Main Content - Enhanced Roster */}
          <div className="flex-1 overflow-hidden bg-white">
            <ModernRoster
              selectedDate={selectedDate}
              department={department}
              view={view}
              scheduleMode={scheduleMode}
              optimizationFocus={optimizationFocus}
            />
          </div>
        </div>
      </div>

      <ShiftTemplatesDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </div>
  );
}