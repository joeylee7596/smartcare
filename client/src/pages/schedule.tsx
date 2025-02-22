import { useQuery } from "@tanstack/react-query";
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

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterEmployeeType, setFilterEmployeeType] = useState<"all" | "full-time" | "part-time">("all");

  // Fetch employees and shifts
  const { data: employees, isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", selectedDate.toISOString()],
  });

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left Panel - Filters */}
          <div className="w-64 border-r border-gray-200 bg-white/50 p-4">
            <div className="space-y-4">
              <div>
                <Label>Datum</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  locale={de}
                />
              </div>

              <div className="space-y-2">
                <Label>Mitarbeitertyp</Label>
                <div className="flex flex-col gap-2">
                  <Button
                    variant={filterEmployeeType === "all" ? "default" : "outline"}
                    onClick={() => setFilterEmployeeType("all")}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Alle Mitarbeiter
                  </Button>
                  <Button
                    variant={filterEmployeeType === "full-time" ? "default" : "outline"}
                    onClick={() => setFilterEmployeeType("full-time")}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Vollzeit
                  </Button>
                  <Button
                    variant={filterEmployeeType === "part-time" ? "default" : "outline"}
                    onClick={() => setFilterEmployeeType("part-time")}
                    className="justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Teilzeit
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Schedule */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    Dienstplan für {format(selectedDate, "EEEE, d. MMMM yyyy", { locale: de })}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {shifts?.length || 0} Schichten geplant
                  </p>
                </div>
                <Button>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Neue Schicht
                </Button>
              </div>

              {/* Placeholder for Gantt Chart */}
              <div className="relative h-[calc(100%-4rem)] rounded-lg border bg-white p-4">
                <div className="text-center text-gray-500">
                  Schichtplan wird implementiert...
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - AI Recommendations */}
          <div className="w-80 border-l border-gray-200 bg-white/50 p-4">
            <Card className="bg-blue-50 border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-700">KI-Empfehlungen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-blue-600">
                    Basierend auf der aktuellen Planung und den Mitarbeiterpräferenzen:
                  </p>
                  {/* Placeholder for AI recommendations */}
                  <div className="rounded-md bg-white p-3 text-sm">
                    KI-Empfehlungen werden geladen...
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}