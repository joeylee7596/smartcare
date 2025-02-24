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
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
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
} from "lucide-react";
import type { Employee, Shift, ShiftTemplate } from "@shared/schema";
import { ModernRoster } from "@/components/scheduling/modern-roster";
import { ShiftTemplatesDialog } from "@/components/scheduling/shift-templates-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [scheduleMode, setScheduleMode] = useState<"manual" | "auto">("manual");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [department, setDepartment] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // AI Optimization Mutation
  const optimizeScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/schedule/optimize", {
        startDate: startOfWeek(selectedDate).toISOString(),
        endDate: endOfWeek(selectedDate).toISOString(),
        department,
      });
      if (!res.ok) throw new Error("Optimierung fehlgeschlagen");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Dienstplan optimiert",
        description: "Die KI hat den Dienstplan erfolgreich optimiert.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Optimierung konnte nicht durchgeführt werden.",
        variant: "destructive",
      });
    },
  });

  // Quick Stats
  const stats = {
    totalShifts: shifts.length,
    coveredShifts: shifts.filter(s => s.employeeId).length,
    openShifts: shifts.filter(s => !s.employeeId).length,
    activeEmployees: new Set(shifts.map(s => s.employeeId)).size,
  };

  const handleOptimize = () => {
    optimizeScheduleMutation.mutate();
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex">
          {/* Left Panel - Calendar & Controls */}
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

                {/* Stats Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Übersicht</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
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
                  </CardContent>
                </Card>

                {/* View Controls */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Ansicht</Label>
                  <Select
                    value={view}
                    onValueChange={(value: "daily" | "weekly") => setView(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Tagesansicht</SelectItem>
                      <SelectItem value="weekly">Wochenansicht</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="space-y-2">
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

                {/* Scheduling Mode */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Planungsmodus</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={scheduleMode === "manual" ? "default" : "outline"}
                      onClick={() => setScheduleMode("manual")}
                      className="w-full"
                      size="sm"
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Manuell
                    </Button>
                    <Button
                      variant={scheduleMode === "auto" ? "default" : "outline"}
                      onClick={() => setScheduleMode("auto")}
                      className="w-full"
                      size="sm"
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      KI-Optimiert
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Schnellzugriff</Label>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleOptimize()}
                      disabled={optimizeScheduleMutation.isPending}
                    >
                      <Brain className="mr-2 h-4 w-4 text-blue-500" />
                      KI-Optimierung starten
                      {optimizeScheduleMutation.isPending && (
                        <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                      )}
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4 text-purple-500" />
                      Mitarbeiter verwalten
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setTemplateDialogOpen(true)}
                    >
                      <Clock className="mr-2 h-4 w-4 text-green-500" />
                      Schichtvorlagen
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4 text-orange-500" />
                      Dokumentation erstellen
                    </Button>
                  </div>
                </div>

                {/* AI Insights */}
                <Card className="bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <CardTitle className="text-sm font-medium">KI-Erkenntnisse</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="space-y-2">
                      {stats.openShifts > 0 && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{stats.openShifts} offene Schichten zu besetzen</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-blue-600">
                        <Brain className="h-4 w-4" />
                        <span>Optimierungsvorschläge verfügbar</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Templates Section */}
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

          {/* Main Content - Roster */}
          <div className="flex-1 overflow-hidden bg-white">
            <ModernRoster
              selectedDate={selectedDate}
              department={department}
              view={view}
              scheduleMode={scheduleMode}
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