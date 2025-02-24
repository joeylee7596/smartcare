import { useQuery } from "@tanstack/react-query";
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
import { format, startOfWeek, endOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import {
  Brain,
  Calendar as CalendarIcon,
  Users,
  Clock,
  Settings2,
  Wand2,
} from "lucide-react";
import type { Employee, Shift, ShiftTemplate } from "@shared/schema";
import { DailyRoster } from "@/components/tours/daily-roster";

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [scheduleMode, setScheduleMode] = useState<"manual" | "auto">("manual");

  // Fetch data
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts = [], isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", {
      start: startOfWeek(selectedDate, { locale: de }).toISOString(),
      end: endOfWeek(selectedDate, { locale: de }).toISOString(),
    }],
  });

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ShiftTemplate[]>({
    queryKey: ["/api/shift-templates"],
  });

  // Loading state
  if (isLoadingEmployees || isLoadingShifts || isLoadingTemplates) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <div className="flex-1 flex">
          {/* Left Panel - Calendar & Controls */}
          <div className="w-80 border-r border-gray-200 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
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
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Mitarbeiter verwalten
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="mr-2 h-4 w-4" />
                      Schichtvorlagen
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Brain className="mr-2 h-4 w-4" />
                      KI-Analyse
                    </Button>
                  </div>
                </div>

                {/* Templates Section */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Schichtvorlagen</Label>
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
          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
            <div className="h-full p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  Dienstplan für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {shifts.length} Schichten • {employees.length} Mitarbeiter
                </p>
              </div>

              <DailyRoster
                employees={employees}
                shifts={shifts}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}