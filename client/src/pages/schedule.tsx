import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Filter, Users, Clock, UserCheck, UserX, ArrowLeftRight, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addHours, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import type { Employee, Shift, ShiftChange } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

const WORKING_HOURS = {
  start: 6,
  end: 22,
};

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterEmployeeType, setFilterEmployeeType] = useState<"all" | "full-time" | "part-time">("all");
  const [isNewShiftDialogOpen, setIsNewShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);

  // Fetch employees and shifts
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedDate.toISOString()],
  });

  const { data: shiftChanges, isLoading: isLoadingChanges } = useQuery<ShiftChange[]>({
    queryKey: ["/api/shift-changes"],
    enabled: !!selectedShift,
  });

  // Create new shift mutation
  const createShift = useMutation({
    mutationFn: async (newShift: {
      employeeId: number;
      startTime: string;
      endTime: string;
      type: string;
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
      setIsNewShiftDialogOpen(false);
    },
  });

  // Report sick mutation
  const reportSick = useMutation({
    mutationFn: async ({ shiftId, note }: { shiftId: number; note: string }) => {
      const response = await fetch(`/api/shifts/${shiftId}/sick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!response.ok) throw new Error("Failed to report sick");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setSelectedShift(null);
    },
  });

  // Request shift change mutation
  const requestShiftChange = useMutation({
    mutationFn: async ({
      shiftId,
      type,
      details,
    }: {
      shiftId: number;
      type: "swap" | "cancel" | "modify";
      details: {
        reason: string;
        proposedChanges?: {
          startTime?: string;
          endTime?: string;
          newEmployeeId?: number;
        };
      };
    }) => {
      const response = await fetch(`/api/shifts/${shiftId}/change-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      if (!response.ok) throw new Error("Failed to request shift change");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-changes"] });
      setIsChangeDialogOpen(false);
    },
  });

  // Fetch AI recommendations
  const { data: aiRecommendations, isLoading: isLoadingAI } = useQuery({
    queryKey: ["/api/ai/shift-optimization", selectedDate.toISOString()],
    queryFn: async () => {
      if (!employees) return null;
      const response = await fetch("/api/ai/shift-optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeData: employees,
          currentShifts: shifts,
          date: selectedDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to get AI recommendations");
      const data = await response.json();
      return data.recommendations;
    },
    enabled: !!employees && !!shifts,
  });

  const handleCreateShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const employeeId = Number(formData.get("employeeId"));
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const type = formData.get("type") as string;

    if (!employeeId || !startTime || !endTime || !type) return;

    const newShift = {
      employeeId,
      startTime: new Date(`${format(selectedDate, "yyyy-MM-dd")}T${startTime}`).toISOString(),
      endTime: new Date(`${format(selectedDate, "yyyy-MM-dd")}T${endTime}`).toISOString(),
      type,
    };

    createShift.mutate(newShift);
  };

  // Helper function to calculate shift position and width
  const calculateShiftStyle = (shift: Shift) => {
    const startHour = new Date(shift.startTime).getHours() + new Date(shift.startTime).getMinutes() / 60;
    const endHour = new Date(shift.endTime).getHours() + new Date(shift.endTime).getMinutes() / 60;

    const totalHours = WORKING_HOURS.end - WORKING_HOURS.start;
    const left = ((startHour - WORKING_HOURS.start) / totalHours) * 100;
    const width = ((endHour - startHour) / totalHours) * 100;

    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  // Filter shifts for selected date
  const todaysShifts = shifts?.filter(shift => 
    isSameDay(new Date(shift.startTime), selectedDate)
  ) || [];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex">
          {/* Left Panel - Filters */}
          <div className="w-64 border-r border-gray-200 bg-[#1E2A4A]/5 overflow-y-auto">
            <ScrollArea className="h-full px-3 py-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Datum</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border w-full max-w-[240px] bg-white"
                    locale={de}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mitarbeitertyp</Label>
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

                <Card className="bg-white/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Legende</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">Bestätigt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">Änderung angefragt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Krank gemeldet</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* Center Panel - Schedule */}
          <div className="flex-1 min-w-0 bg-white">
            <div className="h-full p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Dienstplan für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {todaysShifts.length} Schichten geplant
                  </p>
                </div>
                <Dialog open={isNewShiftDialogOpen} onOpenChange={setIsNewShiftDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Neue Schicht
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neue Schicht erstellen</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateShift} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="employeeId">Mitarbeiter</Label>
                        <Select name="employeeId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Mitarbeiter auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees?.map((employee) => (
                              <SelectItem key={employee.id} value={String(employee.id)}>
                                {employee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type">Schichttyp</Label>
                        <Select name="type" required>
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
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime">Endzeit</Label>
                          <Input
                            id="endTime"
                            name="endTime"
                            type="time"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsNewShiftDialogOpen(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button type="submit" disabled={createShift.isPending}>
                          {createShift.isPending ? "Wird erstellt..." : "Schicht erstellen"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Schedule Grid */}
              <div className="h-[calc(100%-4rem)] rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm">
                <ScrollArea className="h-full">
                  {isLoadingShifts ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      {/* Time scale */}
                      <div className="relative h-8 mb-4">
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

                      {/* Shifts */}
                      <div className="space-y-4">
                        {employees?.map(employee => (
                          <div key={employee.id} className="relative h-16 border-t border-gray-100 first:border-t-0">
                            <div className="absolute left-0 top-0 bottom-0 w-48 flex items-center pr-4">
                              <div className="truncate">
                                <div className="font-medium">{employee.name}</div>
                                <div className="text-sm text-gray-500">{employee.role}</div>
                              </div>
                            </div>

                            <div className="relative ml-48 h-full bg-gray-50">
                              {/* Time slots background */}
                              <div className="absolute inset-0 grid grid-cols-16 gap-0">
                                {Array.from({ length: 16 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="h-full border-l border-gray-200 first:border-l-0"
                                  />
                                ))}
                              </div>

                              {/* Employee's shifts */}
                              {todaysShifts
                                .filter(shift => shift.employeeId === employee.id)
                                .map(shift => {
                                  const style = calculateShiftStyle(shift);
                                  const isChanged = shiftChanges?.some(
                                    change => change.shiftId === shift.id && change.requestStatus === "pending"
                                  );

                                  return (
                                    <TooltipProvider key={shift.id}>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <div
                                            className={cn(
                                              "absolute top-2 h-12 rounded-md cursor-pointer transition-all",
                                              "flex items-center justify-center text-sm font-medium text-white",
                                              {
                                                "bg-green-500": shift.status === "confirmed",
                                                "bg-yellow-500": isChanged,
                                                "bg-red-500": shift.status === "sick",
                                              }
                                            )}
                                            style={style}
                                            onClick={() => {
                                              setSelectedShift(shift);
                                              setIsChangeDialogOpen(true);
                                            }}
                                          >
                                            <div className="px-2 truncate">
                                              {format(new Date(shift.startTime), "HH:mm")} - 
                                              {format(new Date(shift.endTime), "HH:mm")}
                                            </div>
                                          </div>
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
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Right Panel - AI Recommendations & Actions */}
          <div className="w-80 border-l border-gray-200 bg-[#1E2A4A]/5 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {selectedShift && (
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Schicht Aktionen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setIsChangeDialogOpen(true)}
                        >
                          <ArrowLeftRight className="mr-2 h-4 w-4" />
                          Schicht tauschen
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-red-600"
                          onClick={() => {
                            const note = prompt("Grund der Krankmeldung:");
                            if (note && selectedShift) {
                              reportSick.mutate({ shiftId: selectedShift.id, note });
                            }
                          }}
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Krank melden
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-blue-700">
                      KI-Empfehlungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-blue-600/90">
                        Basierend auf der aktuellen Planung und den Mitarbeiterpräferenzen:
                      </p>
                      {isLoadingAI ? (
                        <div className="rounded-md bg-white/80 backdrop-blur-sm p-3 text-sm border border-blue-100">
                          <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                            <div className="h-4 bg-blue-100 rounded w-1/2"></div>
                            <div className="h-4 bg-blue-100 rounded w-2/3"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto rounded-md bg-white/80 backdrop-blur-sm p-3 text-sm border border-blue-100 whitespace-pre-line">
                          {aiRecommendations || "Keine KI-Empfehlungen verfügbar."}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>

          {/* Shift Change Dialog */}
          <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schicht ändern</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Art der Änderung</Label>
                  <Select
                    onValueChange={(value) => {
                      if (selectedShift) {
                        requestShiftChange.mutate({
                          shiftId: selectedShift.id,
                          type: value as "swap" | "cancel" | "modify",
                          details: {
                            reason: "Änderungsanfrage",
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bitte wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="swap">Schicht tauschen</SelectItem>
                      <SelectItem value="cancel">Schicht absagen</SelectItem>
                      <SelectItem value="modify">Zeit ändern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Grund der Änderung</Label>
                  <Textarea
                    placeholder="Bitte geben Sie den Grund für die Änderung an"
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}