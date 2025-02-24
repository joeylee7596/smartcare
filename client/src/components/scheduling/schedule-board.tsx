import { useState } from "react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, addDays, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain,
  Sun,
  Moon,
  Coffee,
  Shield,
  Star,
  Sparkles,
  Plus,
  Pencil,
  X,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const ShiftTypes = {
  early: { icon: Sun, color: "text-yellow-500", bgColor: "bg-yellow-50", label: "Früh", time: "06:00 - 14:00" },
  late: { icon: Coffee, color: "text-orange-500", bgColor: "bg-orange-50", label: "Spät", time: "14:00 - 22:00" },
  night: { icon: Moon, color: "text-blue-500", bgColor: "bg-blue-50", label: "Nacht", time: "22:00 - 06:00" },
};

function SortableShift({ shift, info }: { shift: Shift; info: typeof ShiftTypes[keyof typeof ShiftTypes] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: shift.id.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = info.icon;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-2 mb-1 rounded-md cursor-grab group
        ${shift.aiOptimized ? 'bg-green-50 border-l-2 border-green-500' : `${info.bgColor} border`}
        hover:shadow-md transition-all
        hover:scale-105 relative
      `}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${info.color}`} />
          <span className="text-sm font-medium">
            {info.label}
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
}

function DroppableCell({ children, id, onDrop }: { children: React.ReactNode; id: string; onDrop: (id: string) => void }) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id,
    data: {
      type: 'cell',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        p-2 min-h-[100px] border-l relative
        ${isOver ? 'bg-blue-50/50 border-2 border-dashed border-blue-300' : ''}
        transition-all
      `}
      onDrop={() => onDrop(id)}
    >
      {children}
    </div>
  );
}

export function ScheduleBoard({ selectedDate, department, onOptimize }: ScheduleBoardProps) {
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Get week days
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: de });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch data
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees", { department }],
  });

  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: weekStart.toISOString(),
      end: addDays(weekStart, 6).toISOString(),
      department,
    }],
  });

  // Create new shift
  const createShiftMutation = useMutation({
    mutationFn: async (data: { employeeId: number; type: string; date: Date }) => {
      let startTime = new Date(data.date);
      let endTime = new Date(data.date);

      switch (data.type) {
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

      const res = await apiRequest("POST", "/api/shifts", {
        employeeId: data.employeeId,
        type: data.type,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        department,
      });

      if (!res.ok) throw new Error("Neue Schicht konnte nicht erstellt werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({
        title: "Schicht erstellt",
        description: "Die neue Schicht wurde erfolgreich angelegt.",
      });
      setDraggedShift(null);
    },
  });

  // Update shift
  const updateShiftMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<Shift> }) => {
      const res = await apiRequest("PATCH", `/api/shifts/${data.id}`, data.updates);
      if (!res.ok) throw new Error("Schicht konnte nicht aktualisiert werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowEditDialog(false);
      setEditingShift(null);
      toast({
        title: "Schicht aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    },
  });

  // Delete shift
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/shifts/${id}`);
      if (!res.ok) throw new Error("Schicht konnte nicht gelöscht werden");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowEditDialog(false);
      setEditingShift(null);
      toast({
        title: "Schicht gelöscht",
        description: "Die Schicht wurde erfolgreich gelöscht.",
      });
    },
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const [targetDate, targetEmployeeId] = over.id.toString().split("_");
    const draggedId = active.id.toString();

    // Check if we're dragging a new shift or an existing one
    if (draggedId.startsWith("new_")) {
      const shiftType = draggedId.split("_")[1];
      createShiftMutation.mutate({
        employeeId: parseInt(targetEmployeeId),
        type: shiftType,
        date: new Date(targetDate),
      });
    } else if (draggedShift) {
      updateShiftMutation.mutate({
        id: draggedShift.id,
        updates: {
          employeeId: parseInt(targetEmployeeId),
          startTime: new Date(targetDate),
        },
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Card className="mt-6">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(ShiftTypes).map(([type, info]) => {
                const Icon = info.icon;
                return (
                  <div
                    key={type}
                    data-draggable
                    id={`new_${type}`}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg
                      ${info.bgColor} border-2 border-dashed cursor-grab
                      hover:border-solid hover:shadow-sm transition-all
                      group relative
                    `}
                  >
                    <Icon className={`h-5 w-5 ${info.color} group-hover:scale-110 transition-transform`} />
                    <div>
                      <div className="font-medium">{info.label}</div>
                      <div className="text-xs text-gray-500">{info.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
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
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="min-w-[1200px]">
              {/* Header row with dates */}
              <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b">
                <div className="p-4 font-medium">Mitarbeiter</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`p-4 text-center ${
                      format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-blue-50/50'
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

              {/* Employee rows */}
              <div>
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="grid grid-cols-[250px_repeat(7,1fr)] border-b hover:bg-gray-50/50"
                  >
                    {/* Employee info */}
                    <div className="p-4">
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
                      const dateStr = format(day, "yyyy-MM-dd");
                      const dayShifts = shifts.filter(s => 
                        s.employeeId === employee.id && 
                        format(new Date(s.startTime), 'yyyy-MM-dd') === dateStr
                      );

                      return (
                        <DroppableCell
                          key={dateStr}
                          id={`${dateStr}_${employee.id}`}
                          onDrop={() => {}}
                        >
                          <SortableContext items={dayShifts.map(s => s.id)}>
                            <AnimatePresence>
                              {dayShifts.map((shift) => {
                                const shiftInfo = ShiftTypes[shift.type as keyof typeof ShiftTypes];
                                return (
                                  <SortableShift
                                    key={shift.id}
                                    shift={shift}
                                    info={shiftInfo}
                                  />
                                );
                              })}
                            </AnimatePresence>
                          </SortableContext>

                          {dayShifts.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-gray-500">
                              <Plus className="h-5 w-5" />
                              <span className="text-xs mt-1">Schicht hinzufügen</span>
                            </div>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Shift Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schicht bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details dieser Schicht oder löschen Sie sie.
            </DialogDescription>
          </DialogHeader>

          {editingShift && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Schichttyp</Label>
                <Select
                  value={editingShift.type}
                  onValueChange={(value) =>
                    setEditingShift(prev => prev ? { ...prev, type: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ShiftTypes).map(([type, info]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <info.icon className={`h-4 w-4 ${info.color}`} />
                          {info.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notizen</Label>
                <Input
                  value={editingShift.notes || ''}
                  onChange={(e) =>
                    setEditingShift(prev => prev ? { ...prev, notes: e.target.value } : null)
                  }
                  placeholder="Optionale Notizen zur Schicht"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingShift.status}
                  onValueChange={(value) =>
                    setEditingShift(prev => prev ? { ...prev, status: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-500" />
                        Geplant
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Ausstehend
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => editingShift && deleteShiftMutation.mutate(editingShift.id)}
            >
              <X className="h-4 w-4 mr-2" />
              Löschen
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                onClick={() => editingShift && updateShiftMutation.mutate({
                  id: editingShift.id,
                  updates: {
                    type: editingShift.type,
                    notes: editingShift.notes,
                    status: editingShift.status,
                  },
                })}
              >
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}

export default ScheduleBoard;