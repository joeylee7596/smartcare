import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useState } from "react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Calendar as CalendarIcon,
  Settings2,
  AlertTriangle,
} from "lucide-react";
import { ScheduleBoard } from "@/components/scheduling/schedule-board";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [department, setDepartment] = useState("all");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferencesEmployee, setPreferencesEmployee] = useState<{
    id: number;
    name: string;
    preferences: {
      maxShiftsPerWeek?: number;
      preferredShifts?: string[];
      excludedDays?: string[];
    };
  } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // KI-Optimierung Mutation
  const optimizeScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shifts/optimize", {
        date: selectedDate.toISOString(),
        department,
        optimizationMode: "balanced", // Berücksichtigt sowohl Effizienz als auch Präferenzen
      });
      if (!res.ok) throw new Error("Optimierung fehlgeschlagen");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Dienstplan optimiert",
        description: `Die KI hat ${data.changesCount} Änderungen vorgenommen und dabei die Mitarbeiterpräferenzen berücksichtigt.`,
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

  // Präferenzen aktualisieren
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: {
      employeeId: number;
      preferences: {
        maxShiftsPerWeek?: number;
        preferredShifts?: string[];
        excludedDays?: string[];
      };
    }) => {
      const res = await apiRequest("PATCH", `/api/employees/${data.employeeId}/preferences`, data.preferences);
      if (!res.ok) throw new Error("Präferenzen konnten nicht aktualisiert werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setShowPreferences(false);
      toast({
        title: "Präferenzen aktualisiert",
        description: "Die Mitarbeiterpräferenzen wurden gespeichert.",
      });
    },
  });

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Top Navigation */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Dienstplan
              </h1>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, "EEEE, dd. MMMM yyyy", { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Alle Abteilungen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Abteilungen</SelectItem>
                  <SelectItem value="general">Allgemeinpflege</SelectItem>
                  <SelectItem value="intensive">Intensivpflege</SelectItem>
                  <SelectItem value="palliative">Palliativpflege</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setShowPreferences(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Präferenzen
              </Button>
            </div>
          </div>

          {/* Schedule Board */}
          <ScheduleBoard
            selectedDate={selectedDate}
            department={department}
            onOptimize={() => optimizeScheduleMutation.mutate()}
          />

          {/* Preferences Dialog */}
          <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mitarbeiter-Präferenzen</DialogTitle>
                <DialogDescription>
                  Passen Sie die Präferenzen und Einschränkungen der Mitarbeiter an.
                  Diese werden bei der KI-Optimierung berücksichtigt.
                </DialogDescription>
              </DialogHeader>
              {preferencesEmployee && (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Maximale Schichten pro Woche</Label>
                    <Input
                      type="number"
                      value={preferencesEmployee.preferences.maxShiftsPerWeek || 5}
                      onChange={(e) => setPreferencesEmployee({
                        ...preferencesEmployee,
                        preferences: {
                          ...preferencesEmployee.preferences,
                          maxShiftsPerWeek: parseInt(e.target.value),
                        },
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bevorzugte Schichten</Label>
                    <Select
                      value={preferencesEmployee.preferences.preferredShifts?.[0] || "early"}
                      onValueChange={(value) => setPreferencesEmployee({
                        ...preferencesEmployee,
                        preferences: {
                          ...preferencesEmployee.preferences,
                          preferredShifts: [value],
                        },
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="early">Frühdienst</SelectItem>
                        <SelectItem value="late">Spätdienst</SelectItem>
                        <SelectItem value="night">Nachtdienst</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowPreferences(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    if (preferencesEmployee) {
                      updatePreferencesMutation.mutate({
                        employeeId: preferencesEmployee.id,
                        preferences: preferencesEmployee.preferences,
                      });
                    }
                  }}
                >
                  Speichern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}