import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  AlertTriangle,
  UserPlus,
  Settings,
  RefreshCw,
  Moon,
  Sun,
  Sunrise,
  FileClock,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import type {
  Employee,
  Shift,
  ShiftTemplate,
  ShiftPreference,
} from "@shared/schema";

const ShiftPatternIcons = {
  early: <Sunrise className="h-4 w-4" />,
  late: <Sun className="h-4 w-4" />,
  night: <Moon className="h-4 w-4" />,
};

export function ModernRoster() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", weekStart.toISOString(), weekEnd.toISOString()],
  });

  const { data: templates = [] } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/shift-templates"],
  });

  const { data: preferences = [] } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/shift-preferences"],
  });

  const createShiftMutation = useMutation({
    mutationFn: async (shift: Omit<Shift, "id">) => {
      const res = await apiRequest("POST", "/api/shifts", shift);
      if (!res.ok) throw new Error("Failed to create shift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht erstellt",
        description: "Die neue Schicht wurde erfolgreich angelegt.",
      });
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Die Schicht konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, ...shift }: Partial<Shift> & { id: number }) => {
      const res = await apiRequest("PATCH", `/api/shifts/${id}`, shift);
      if (!res.ok) throw new Error("Failed to update shift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/shifts/${id}`);
      if (!res.ok) throw new Error("Failed to delete shift");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht gelöscht",
        description: "Die Schicht wurde erfolgreich entfernt.",
      });
    },
  });

  // Group shifts by day and employee
  const shiftsByDay = shifts.reduce((acc, shift) => {
    const day = format(new Date(shift.startTime), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = {};
    if (!acc[day][shift.employeeId]) acc[day][shift.employeeId] = [];
    acc[day][shift.employeeId].push(shift);
    return acc;
  }, {} as Record<string, Record<number, Shift[]>>);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Dienstplan</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
            >
              Heute
            </Button>
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Abteilung wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Abteilungen</SelectItem>
                <SelectItem value="general">Allgemein</SelectItem>
                <SelectItem value="intensive">Intensivpflege</SelectItem>
                <SelectItem value="palliative">Palliativpflege</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <FileClock className="h-4 w-4 mr-2" />
                Schichtvorlagen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schichtvorlagen verwalten</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Tabs defaultValue="templates">
                  <TabsList>
                    <TabsTrigger value="templates">Vorlagen</TabsTrigger>
                    <TabsTrigger value="patterns">Schichtmuster</TabsTrigger>
                  </TabsList>
                  <TabsContent value="templates">
                    {/* Template management UI */}
                  </TabsContent>
                  <TabsContent value="patterns">
                    {/* Pattern management UI */}
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[auto,1fr] gap-4 bg-card rounded-lg border">
        {/* Time slots */}
        <div className="w-48 pt-16 pb-4 px-4">
          <div className="space-y-2">
            {["Früh", "Spät", "Nacht"].map((shift) => (
              <div
                key={shift}
                className="h-24 flex items-center text-sm text-muted-foreground"
              >
                {shift}
              </div>
            ))}
          </div>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-px bg-muted">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="bg-card">
              <div className="p-2 text-center border-b">
                <div className="font-medium">
                  {format(day, "EEEE", { locale: de })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(day, "dd.MM.")}
                </div>
              </div>

              {/* Shift slots */}
              <div className="space-y-px">
                {["early", "late", "night"].map((pattern) => {
                  const dayShifts = shiftsByDay[format(day, "yyyy-MM-dd")] || {};
                  const patternShifts = Object.values(dayShifts)
                    .flat()
                    .filter((s) => s.rotationPattern === pattern);

                  return (
                    <div
                      key={pattern}
                      className="h-24 p-2 bg-card hover:bg-accent/5 transition-colors"
                    >
                      <ScrollArea className="h-full">
                        <div className="space-y-1">
                          {patternShifts.map((shift) => {
                            const employee = employees.find(
                              (e) => e.id === shift.employeeId
                            );
                            if (!employee) return null;

                            return (
                              <div
                                key={shift.id}
                                className="group relative p-2 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {ShiftPatternIcons[shift.rotationPattern as keyof typeof ShiftPatternIcons]}
                                  <span className="text-sm font-medium truncate">
                                    {employee.name}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(shift.startTime), "HH:mm")} -{" "}
                                  {format(new Date(shift.endTime), "HH:mm")}
                                </div>

                                {shift.conflictInfo && (
                                  <Badge
                                    variant="destructive"
                                    className="absolute top-1 right-1"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
