import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Clock,
  AlertTriangle,
  Shield,
  Star,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  UserCheck,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Employee, Shift } from "@shared/schema";

interface ScheduleBoardProps {
  selectedDate: Date;
  department: string;
  onOptimize: () => void;
}

// Helper function to get shift type icon and color
const getShiftInfo = (startHour: number) => {
  if (startHour >= 6 && startHour < 14) {
    return { icon: Sun, color: "text-yellow-500", label: "Früh" };
  }
  if (startHour >= 14 && startHour < 22) {
    return { icon: Coffee, color: "text-orange-500", label: "Spät" };
  }
  return { icon: Moon, color: "text-blue-500", label: "Nacht" };
};

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get the week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch data
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 6).toISOString(),
      department,
    }],
  });

  // Update shift mutation
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
        description: "Die Änderungen wurden erfolgreich gespeichert.",
      });
    },
  });

  // Handle drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !draggedShift) return;

    const [employeeId, dateStr, pattern] = over.id.toString().split("-");
    const targetDate = new Date(dateStr);

    // Calculate new times based on pattern
    let startTime = new Date(targetDate);
    let endTime = new Date(targetDate);

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
        endTime = addDays(endTime, 1);
        endTime.setHours(6, 0);
        break;
    }

    updateShiftMutation.mutate({
      id: draggedShift.id,
      updates: {
        employeeId: parseInt(employeeId),
        startTime,
        endTime,
        type: pattern,
      },
    });
  };

  // Group shifts by employee and day
  const shiftsByEmployeeAndDay = shifts.reduce((acc, shift) => {
    const dateKey = format(new Date(shift.startTime), "yyyy-MM-dd");
    const empKey = shift.employeeId;

    if (!acc[empKey]) acc[empKey] = {};
    if (!acc[empKey][dateKey]) acc[empKey][dateKey] = [];

    acc[empKey][dateKey].push(shift);
    return acc;
  }, {} as Record<number, Record<string, Shift[]>>);

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Wochendienstplan
            </CardTitle>
            <Button onClick={onOptimize} className="bg-gradient-to-r from-blue-500 to-blue-600">
              <Brain className="h-4 w-4 mr-2" />
              KI-Optimierung starten
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="min-w-[1200px]">
              {/* Header row with dates */}
              <div className="grid grid-cols-[250px_repeat(7,1fr)] gap-2 mb-4">
                <div className="px-4 py-2">Mitarbeiter</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`px-4 py-2 text-center rounded-md ${
                      format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-blue-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">
                      {format(day, "EEEE", { locale: de })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(day, "dd.MM.")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Employee rows */}
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[250px_repeat(7,1fr)] gap-2"
                  >
                    {/* Employee info */}
                    <div className="px-4 py-2">
                      <div className="font-medium">{employee.name}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {employee.role === 'nurse' && (
                          <Badge variant="secondary" className="h-5">
                            <Shield className="h-3 w-3 mr-1" />
                            Examiniert
                          </Badge>
                        )}
                        {employee.qualifications?.woundCare && (
                          <Badge variant="outline" className="h-5">
                            <Star className="h-3 w-3 mr-1" />
                            Wundexperte
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Shift cells for each day */}
                    {weekDays.map((day) => {
                      const dateKey = format(day, "yyyy-MM-dd");
                      const shifts = shiftsByEmployeeAndDay[employee.id]?.[dateKey] || [];

                      return (
                        <div
                          key={dateKey}
                          className="grid grid-rows-3 gap-1 p-2 rounded-md border hover:bg-gray-50/50"
                        >
                          {["early", "late", "night"].map((pattern) => {
                            const patternShifts = shifts.filter((s) => s.type === pattern);
                            return (
                              <div
                                key={`${employee.id}-${dateKey}-${pattern}`}
                                id={`${employee.id}-${dateKey}-${pattern}`}
                                className="min-h-[40px] rounded-md border border-dashed border-gray-200 p-1"
                                data-droppable
                              >
                                {patternShifts.map((shift) => {
                                  const shiftInfo = getShiftInfo(new Date(shift.startTime).getHours());
                                  const ShiftIcon = shiftInfo.icon;

                                  return (
                                    <motion.div
                                      key={shift.id}
                                      id={shift.id.toString()}
                                      data-draggable
                                      className={`
                                        group p-2 rounded-md cursor-move
                                        ${shift.aiOptimized ? 'bg-green-50 border-l-4 border-green-500' : 'bg-blue-50/50'}
                                      `}
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      onMouseDown={() => setDraggedShift(shift)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <ShiftIcon className={`h-4 w-4 ${shiftInfo.color}`} />
                                          <span className="text-sm">
                                            {format(new Date(shift.startTime), "HH:mm")}
                                          </span>
                                        </div>
                                        {shift.aiOptimized && (
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <Sparkles className="h-4 w-4 text-green-500" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              KI-optimierte Schicht
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </DndContext>
  );
}