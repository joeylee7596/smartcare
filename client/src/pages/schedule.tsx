import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Filter, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import type { Employee, Shift } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterEmployeeType, setFilterEmployeeType] = useState<"all" | "full-time" | "part-time">("all");
  const [isNewShiftDialogOpen, setIsNewShiftDialogOpen] = useState(false);

  // Fetch employees and shifts
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedDate.toISOString()],
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
                    disabled={(date) => date < new Date()}
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
                      <Users className="mr-2 h-4 w-4" />
                      Vollzeit
                    </Button>
                    <Button
                      variant={filterEmployeeType === "part-time" ? "default" : "ghost"}
                      onClick={() => setFilterEmployeeType("part-time")}
                      className="w-full justify-start"
                      size="sm"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Teilzeit
                    </Button>
                  </div>
                </div>
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
                    {shifts?.length || 0} Schichten geplant
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
                      {/* Gantt Chart will be implemented here */}
                      <div className="text-center text-gray-500">
                        Schichtplan wird implementiert...
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Right Panel - AI Recommendations */}
          <div className="w-80 border-l border-gray-200 bg-[#1E2A4A]/5 overflow-y-auto">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
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
        </div>
      </div>
    </div>
  );
}