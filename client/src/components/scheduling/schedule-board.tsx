import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sun,
  Moon,
  Coffee,
  PalmtreeIcon,
  Stethoscope,
  Brain,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

import type { Employee, Shift } from "@shared/schema";

interface ScheduleBoardProps {
  selectedDate: Date;
  department: string;
  onOptimize: () => void;
}

const ShiftTypes = {
  early: { icon: Sun, color: "text-yellow-500", bgColor: "bg-yellow-50", label: "Früh", time: "06:00 - 14:00" },
  late: { icon: Coffee, color: "text-orange-500", bgColor: "bg-orange-50", label: "Spät", time: "14:00 - 22:00" },
  night: { icon: Moon, color: "text-blue-500", bgColor: "bg-blue-50", label: "Nacht", time: "22:00 - 06:00" },
  vacation: { icon: PalmtreeIcon, color: "text-green-500", bgColor: "bg-green-50", label: "Urlaub", time: "Ganztägig" },
  sick: { icon: Stethoscope, color: "text-red-500", bgColor: "bg-red-50", label: "Krank", time: "Ganztägig" },
} as const;

function ShiftBadge({ type, onDelete }: { type: keyof typeof ShiftTypes; onDelete?: () => void }) {
  const info = ShiftTypes[type] || ShiftTypes.early; // Fallback to early if type is invalid
  const Icon = info.icon;

  return (
    <div className={`
      flex items-center justify-between gap-2 p-2 rounded-md ${info.bgColor}
      border border-gray-200
    `}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${info.color}`} />
        <span className="text-sm font-medium">{info.label}</span>
        <span className="text-xs text-gray-500">{info.time}</span>
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [], isLoading, error } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      department
    }],
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const res = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      if (!res.ok) throw new Error("Schicht konnte nicht gelöscht werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht gelöscht",
        description: "Die Schicht wurde erfolgreich entfernt.",
      });
    },
  });

  if (isLoading) {
    return <div>Lade Schichtplan...</div>;
  }

  if (error) {
    return <div>Fehler beim Laden des Schichtplans</div>;
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <Button
            onClick={onOptimize}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <Brain className="h-4 w-4 mr-2" />
            KI-Optimierung
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b">
            <div className="p-4 font-medium">Mitarbeiter</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-4 text-center ${
                  format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    ? 'bg-blue-50/80'
                    : ''
                }`}
              >
                <div className="font-medium">
                  {format(day, "EEEE", { locale: de })}
                </div>
                <div className="text-sm text-gray-500">
                  {format(day, "dd.MM.")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="min-w-[1200px]">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50/50"
              >
                <div className="p-4">
                  <div className="font-medium">{employee.name}</div>
                </div>

                {weekDays.map((day) => {
                  // Safe date comparison
                  const dayFormatted = format(day, 'yyyy-MM-dd');
                  const dayShifts = shifts.filter(shift => {
                    try {
                      const shiftDate = new Date(shift.startTime);
                      return shift.employeeId === employee.id && 
                             format(shiftDate, 'yyyy-MM-dd') === dayFormatted;
                    } catch (e) {
                      console.error("Error processing shift:", e);
                      return false;
                    }
                  });

                  return (
                    <div
                      key={day.toISOString()}
                      className="p-2 min-h-[100px] border-l"
                    >
                      <div className="space-y-2">
                        {dayShifts.map((shift) => {
                          // Validate shift type
                          const shiftType = shift.type as keyof typeof ShiftTypes;
                          if (!ShiftTypes[shiftType]) {
                            console.warn(`Invalid shift type: ${shift.type}`);
                            return null;
                          }

                          return (
                            <ShiftBadge
                              key={shift.id}
                              type={shiftType}
                              onDelete={() => deleteShiftMutation.mutate(shift.id)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default ScheduleBoard;