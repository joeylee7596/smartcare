import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
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
  Brain,
  UserCheck,
  Star,
  Sparkles,
  Filter,
  Users,
  Search,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

import type {
  Employee,
  Shift,
  ShiftTemplate,
  ShiftPreference,
} from "@shared/schema";

interface ModernRosterProps {
  selectedDate: Date;
  department: string;
  view: "daily" | "weekly";
  scheduleMode: "manual" | "auto";
  optimizationFocus: "workload" | "preferences" | "efficiency";
}

const ShiftPatternIcons = {
  early: <Sunrise className="h-4 w-4 text-yellow-500" />,
  late: <Sun className="h-4 w-4 text-orange-500" />,
  night: <Moon className="h-4 w-4 text-blue-500" />,
};

export function ModernRoster({ selectedDate, department, view, scheduleMode, optimizationFocus }: ModernRosterProps) {
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [aiOptimizationOpen, setAiOptimizationOpen] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Enhanced queries with proper error handling
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      department,
    }],
  });

  const { data: preferences = [] } = useQuery<ShiftPreference[]>({
    queryKey: ["/api/shift-preferences"],
  });

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(employeeFilter.toLowerCase()) ||
    emp.qualifications?.nursingDegree && employeeFilter.toLowerCase().includes("pflege") ||
    emp.qualifications?.woundCare && employeeFilter.toLowerCase().includes("wund")
  );

  // Enhanced mutations
  const updateShiftMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Shift> }) => {
      const res = await apiRequest("PATCH", `/api/shifts/${data.id}`, data.updates);
      if (!res.ok) throw new Error("Failed to update shift");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
      setEditDialogOpen(false);
    },
  });

  // AI optimization mutation
  const optimizeScheduleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shifts/optimize", {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        department,
      });
      if (!res.ok) throw new Error("Could not optimize schedule");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Dienstplan optimiert",
        description: `KI-Optimierung abgeschlossen mit ${data.improvements} Verbesserungen.`,
      });
    },
  });

  // Handle drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const shiftId = parseInt(active.id.toString());
    const targetTime = over.id.toString().split("-");
    const [pattern, date] = targetTime;

    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // Calculate new times based on pattern
    const baseDate = new Date(date);
    let startTime = new Date(baseDate);
    let endTime = new Date(baseDate);

    switch (pattern) {
      case "early":
        startTime.setHours(6, 0);
        endTime.setHours(14, 0);
        break;
      case "late":
        startTime.setHours(14, 0);
        endTime.setHours(22, 0);
        break;
      case "night":
        startTime.setHours(22, 0);
        endTime = new Date(endTime.setDate(endTime.getDate() + 1));
        endTime.setHours(6, 0);
        break;
    }

    updateShiftMutation.mutate({
      id: shiftId,
      updates: {
        startTime,
        endTime,
        rotationPattern: pattern as "early" | "late" | "night",
      },
    });
  };

  // Group shifts by day and employee
  const shiftsByDay = shifts.reduce((acc, shift) => {
    const day = format(new Date(shift.startTime), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = {};
    if (!acc[day][shift.employeeId]) acc[day][shift.employeeId] = [];
    acc[day][shift.employeeId].push(shift);
    return acc;
  }, {} as Record<string, Record<number, Shift[]>>);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Render employee qualifications badges
  const renderQualifications = (employee: Employee) => {
    const quals = employee.qualifications || {};
    return (
      <div className="flex gap-1">
        {quals.nursingDegree && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="h-5">
                <Star className="h-3 w-3 text-yellow-500" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Examinierte Pflegekraft</TooltipContent>
          </Tooltip>
        )}
        {quals.woundCare && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="h-5">
                <UserCheck className="h-3 w-3 text-purple-500" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Wundexperte</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  };

  // Render employee list item
  const renderEmployeeListItem = (employee: Employee) => (
    <Card
      key={employee.id}
      className={cn(
        "p-3 mb-2 cursor-move",
        employee.status === "active" ? "bg-card" : "bg-muted opacity-50"
      )}
      data-draggable
      id={`employee-${employee.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-medium">{employee.name}</span>
            <span className="text-xs text-muted-foreground">
              {employee.workingHours?.monday?.start} - {employee.workingHours?.monday?.end}
            </span>
          </div>
        </div>
        {renderQualifications(employee)}
      </div>
    </Card>
  );

  // AI Optimization Panel
  const renderAiPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">KI-Assistent</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowAiPanel(false)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium mb-2">Dienstplan-Analyse</h4>
            <Progress value={75} className="mb-2" />
            <p className="text-sm text-muted-foreground">
              Der aktuelle Dienstplan ist zu 75% optimal.
              Hier sind einige Verbesserungsvorschläge:
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Überlastung bei 2 Mitarbeitern
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Qualifikationslücken in 3 Schichten
              </li>
            </ul>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-2">Automatische Optimierung</h4>
            <Button
              className="w-full"
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
                  <Sparkles className="mr-2 h-4 w-4" />
                  Dienstplan optimieren
                </>
              )}
            </Button>
          </Card>

          {selectedShift?.aiSuggestions && (
            <Card className="p-4">
              <h4 className="font-medium mb-2">Vorschläge für aktuelle Schicht</h4>
              <div className="space-y-2">
                {selectedShift.aiSuggestions.suggestedChanges.map((change, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{change.reason}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateShiftMutation.mutate({
                          id: selectedShift.id,
                          updates: {
                            [change.type]: change.suggestedValue,
                          },
                        });
                      }}
                    >
                      Anwenden
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ModernRoster;