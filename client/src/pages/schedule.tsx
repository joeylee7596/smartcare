import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Filter, Users, Clock, UserCheck, UserX, ArrowLeftRight, AlertCircle, Edit2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isSameDay, parseISO, isWithinInterval, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useState, useCallback } from "react";
import type { Employee, Shift, ShiftChange } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, useDraggable, useDroppable } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

const WORKING_HOURS = {
  start: 6,
  end: 22,
} as const;

type ShiftDialogMode = "create" | "edit" | "change" | null;

const MotionCard = motion(Card);

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterEmployeeType, setFilterEmployeeType] = useState<"all" | "full-time" | "part-time">("all");
  const [dialogMode, setDialogMode] = useState<ShiftDialogMode>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [weekView, setWeekView] = useState(false);

  // Sensors for Drag & Drop with better touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch data
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedDate.toISOString()],
  });

  const { data: shiftChanges = [], isLoading: isLoadingChanges } = useQuery<ShiftChange[]>({
    queryKey: ["/api/shift-changes"],
  });

  // Create new shift mutation
  const createShift = useMutation({
    mutationFn: async (newShift: {
      employeeId: number;
      startTime: string;
      endTime: string;
      type: string;
      notes?: string;
      status: string;
    }) => {
      const response = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShift),
      });
      if (!response.ok) throw new Error("Failed to create shift");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setDialogMode(null);
    },
  });

  // Update shift mutation
  const updateShift = useMutation({
    mutationFn: async ({
      shiftId,
      updates,
    }: {
      shiftId: number;
      updates: Partial<{
        employeeId: number;
        startTime: string;
        endTime: string;
        type: string;
        notes: string;
        status: string;
      }>;
    }) => {
      const response = await fetch(`/api/shifts/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update shift");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setDialogMode(null);
      setSelectedShift(null);
    },
  });

  // Helper function to calculate shift position and width
  const calculateShiftStyle = useCallback((shift: Shift, isOverlay: boolean = false) => {
    const startTime = new Date(shift.startTime);
    const endTime = new Date(shift.endTime);
    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    const totalHours = WORKING_HOURS.end - WORKING_HOURS.start;
    const left = ((startHour - WORKING_HOURS.start) / totalHours) * 100;
    const width = ((endHour - startHour) / totalHours) * 100;

    return {
      left: isOverlay ? 0 : `${left}%`,
      width: `${width}%`,
      position: "absolute" as const,
      zIndex: isOverlay ? 50 : 10,
    };
  }, []);

  // Filter shifts for selected period
  const periodShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.startTime);
    if (weekView) {
      const weekStart = startOfWeek(selectedDate, { locale: de });
      const weekEnd = endOfWeek(selectedDate, { locale: de });
      return isWithinInterval(shiftDate, { start: weekStart, end: weekEnd });
    }
    return isSameDay(shiftDate, selectedDate);
  });

  // Handle form submission
  const handleSubmitShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const employeeId = Number(formData.get("employeeId"));
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const type = formData.get("type") as string;
    const notes = formData.get("notes") as string;

    if (!employeeId || !startTime || !endTime || !type) return;

    const shiftData = {
      employeeId,
      startTime: new Date(`${format(selectedDate, "yyyy-MM-dd")}T${startTime}`).toISOString(),
      endTime: new Date(`${format(selectedDate, "yyyy-MM-dd")}T${endTime}`).toISOString(),
      type,
      notes,
      status: "pending",
    };

    if (dialogMode === "create") {
      createShift.mutate(shiftData);
    } else if (dialogMode === "edit" && selectedShift) {
      updateShift.mutate({
        shiftId: selectedShift.id,
        updates: shiftData,
      });
    }
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over || !draggedShift) return;

    const newEmployeeId = parseInt(over.id as string);
    if (newEmployeeId === draggedShift.employeeId) return;

    updateShift.mutate({
      shiftId: draggedShift.id,
      updates: {
        employeeId: newEmployeeId,
      },
    });

    setDraggedShift(null);
  };

  // Loading state
  if (isLoadingEmployees || isLoadingShifts) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex">
          {/* Left Panel - Calendar & Filters */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-64 border-r border-gray-200 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80"
          >
            <ScrollArea className="h-[calc(100vh-4rem)] p-4">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Datum</Label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDate(subDays(selectedDate, weekView ? 7 : 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDate(addDays(selectedDate, weekView ? 7 : 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border w-full max-w-[240px] bg-white shadow-sm dark:bg-gray-800"
                    locale={de}
                  />
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setWeekView(!weekView)}
                    >
                      {weekView ? "Tagesansicht" : "Wochenansicht"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Filter</Label>
                  <div className="space-y-1">
                    <Button
                      variant={filterEmployeeType === "all" ? "default" : "ghost"}
                      onClick={() => setFilterEmployeeType("all")}
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Alle Mitarbeiter
                    </Button>
                    <Button
                      variant={filterEmployeeType === "full-time" ? "default" : "ghost"}
                      onClick={() => setFilterEmployeeType("full-time")}
                      className="w-full justify-start"
                      size="sm"
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Vollzeit
                    </Button>
                    <Button
                      variant={filterEmployeeType === "part-time" ? "default" : "ghost"}
                      onClick={() => setFilterEmployeeType("part-time")}
                      className="w-full justify-start"
                      size="sm"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Teilzeit
                    </Button>
                  </div>
                </div>

                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/50 backdrop-blur-sm dark:bg-gray-800/50"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Legende</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-green-500"
                        whileHover={{ scale: 1.2 }}
                      />
                      <span className="text-sm">Bestätigt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-yellow-500"
                        whileHover={{ scale: 1.2 }}
                      />
                      <span className="text-sm">Änderung angefragt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full bg-red-500"
                        whileHover={{ scale: 1.2 }}
                      />
                      <span className="text-sm">Krank gemeldet</span>
                    </div>
                  </CardContent>
                </MotionCard>
              </div>
            </ScrollArea>
          </motion.div>

          {/* Center Panel - Schedule */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 min-w-0 bg-white dark:bg-gray-900"
          >
            <div className="h-full p-6 flex flex-col">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between mb-6"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Dienstplan für {format(selectedDate, weekView ? "'KW' w, yyyy" : "EEEE, d. MMMM yyyy", { locale: de })}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {periodShifts.length} Schichten geplant
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button onClick={() => setDialogMode("create")} className="shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Neue Schicht
                  </Button>
                </motion.div>
              </motion.div>

              {/* Schedule Grid */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden dark:bg-gray-800 dark:border-gray-700"
              >
                <ScrollArea className="h-full">
                  <DndContext
                    sensors={sensors}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="p-4">
                      {/* Time scale */}
                      <div className="relative h-8 mb-4 border-b border-gray-100 dark:border-gray-700">
                        {Array.from({ length: WORKING_HOURS.end - WORKING_HOURS.start + 1 }).map((_, i) => (
                          <div
                            key={i}
                            className="absolute text-sm text-gray-500"
                            style={{ left: `${(i / (WORKING_HOURS.end - WORKING_HOURS.start)) * 100}%` }}
                          >
                            {String(WORKING_HOURS.start + i).padStart(2, '0')}:00
                          </div>
                        ))}
                      </div>

                      {/* Employee rows with shifts */}
                      <div className="space-y-4">
                        <AnimatePresence>
                          {employees.map(employee => (
                            <motion.div
                              key={employee.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2 }}
                              className="relative h-16 border border-gray-100 rounded-md hover:bg-gray-50/50 transition-colors dark:border-gray-700 dark:hover:bg-gray-800/50"
                            >
                              {/* Employee info */}
                              <div className="absolute left-0 top-0 bottom-0 w-48 flex items-center px-4 bg-white border-r border-gray-100 dark:bg-gray-900 dark:border-gray-700">
                                <div className="truncate">
                                  <div className="font-medium">{employee.name}</div>
                                  <div className="text-sm text-gray-500">{employee.role}</div>
                                </div>
                              </div>

                              {/* Timeline with shifts */}
                              <div className="relative ml-48 h-full bg-gray-50/50 rounded-r-md dark:bg-gray-800/50">
                                {/* Time slots background */}
                                <div className="absolute inset-0 grid grid-cols-16 gap-0">
                                  {Array.from({ length: 16 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="h-full border-l border-gray-200 first:border-l-0 dark:border-gray-700"
                                    />
                                  ))}
                                </div>

                                {/* Employee's shifts */}
                                <AnimatePresence>
                                  {periodShifts
                                    .filter(shift => shift.employeeId === employee.id)
                                    .map(shift => {
                                      const style = calculateShiftStyle(shift);
                                      const isChanged = shiftChanges.some(
                                        change => change.shiftId === shift.id && change.requestStatus === "pending"
                                      );

                                      return (
                                        <TooltipProvider key={shift.id}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <motion.div
                                                className={cn(
                                                  "absolute top-2 h-12 rounded-md cursor-pointer shadow-sm",
                                                  "flex items-center justify-between px-2 text-sm font-medium text-white",
                                                  {
                                                    "bg-green-500 hover:bg-green-600": shift.status === "confirmed",
                                                    "bg-yellow-500 hover:bg-yellow-600": isChanged,
                                                    "bg-red-500 hover:bg-red-600": shift.status === "sick",
                                                  }
                                                )}
                                                style={style}
                                                onClick={() => {
                                                  setSelectedShift(shift);
                                                  setDialogMode("edit");
                                                }}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                drag="y"
                                                dragConstraints={{ top: 0, bottom: 0 }}
                                                onDragStart={() => setDraggedShift(shift)}
                                              >
                                                <div className="truncate">
                                                  {format(new Date(shift.startTime), "HH:mm")} -
                                                  {format(new Date(shift.endTime), "HH:mm")}
                                                </div>
                                                <motion.button
                                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  whileHover={{ scale: 1.1 }}
                                                  whileTap={{ scale: 0.9 }}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedShift(shift);
                                                    setDialogMode("edit");
                                                  }}
                                                >
                                                  <Edit2 className="h-3 w-3 text-white" />
                                                </motion.button>
                                              </motion.div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <div className="space-y-1">
                                                <div className="font-medium">{employee.name}</div>
                                                <div className="text-sm">
                                                  {format(new Date(shift.startTime), "HH:mm")} -
                                                  {format(new Date(shift.endTime), "HH:mm")}
                                                </div>
                                                <div className="text-sm">
                                                  Status: {shift.status}
                                                  {isChanged && " (Änderung angefragt)"}
                                                </div>
                                                {shift.notes && (
                                                  <div className="text-sm">
                                                    Notizen: {shift.notes}
                                                  </div>
                                                )}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    })}
                                </AnimatePresence>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    <DragOverlay>
                      {draggedShift && (
                        <motion.div
                          className={cn(
                            "h-12 rounded-md px-2 text-sm font-medium text-white shadow-lg",
                            "flex items-center justify-center",
                            {
                              "bg-green-500": draggedShift.status === "confirmed",
                              "bg-yellow-500": draggedShift.status === "pending",
                              "bg-red-500": draggedShift.status === "sick",
                            }
                          )}
                          style={calculateShiftStyle(draggedShift, true)}
                          initial={{ scale: 1.05 }}
                          animate={{ scale: 1.05 }}
                        >
                          {format(new Date(draggedShift.startTime), "HH:mm")} -
                          {format(new Date(draggedShift.endTime), "HH:mm")}
                        </motion.div>
                      )}
                    </DragOverlay>
                  </DndContext>
                </ScrollArea>
              </motion.div>
            </div>
          </motion.div>

          {/* Shift Dialog */}
          <Dialog open={!!dialogMode} onOpenChange={(open) => !open && setDialogMode(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create" ? "Neue Schicht erstellen" :
                    dialogMode === "edit" ? "Schicht bearbeiten" :
                      "Schicht ändern"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmitShift} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Mitarbeiter</Label>
                  <Select
                    name="employeeId"
                    defaultValue={selectedShift?.employeeId.toString()}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mitarbeiter auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={String(employee.id)}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Schichttyp</Label>
                  <Select
                    name="type"
                    defaultValue={selectedShift?.type}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Schichttyp auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regulär</SelectItem>
                      <SelectItem value="on-call">Bereitschaft</SelectItem>
                      <SelectItem value="overtime">Überstunden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Startzeit</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      defaultValue={selectedShift ?
                        format(new Date(selectedShift.startTime), "HH:mm") :
                        undefined
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Endzeit</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="time"
                      defaultValue={selectedShift ?
                        format(new Date(selectedShift.endTime), "HH:mm") :
                        undefined
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Zusätzliche Informationen zur Schicht"
                    defaultValue={selectedShift?.notes || ""}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogMode(null)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    disabled={dialogMode === "create" ? createShift.isPending : updateShift.isPending}
                  >
                    {dialogMode === "create" ?
                      (createShift.isPending ? "Wird erstellt..." : "Schicht erstellen") :
                      (updateShift.isPending ? "Wird gespeichert..." : "Änderungen speichern")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}