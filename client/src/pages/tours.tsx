import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmartWorkflow } from "@/components/workflow/smart-workflow";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour, WorkflowTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, RotateCw, Clock, Users, Route, Brain, Sparkles } from "lucide-react";
import { AddTourDialog } from "@/components/tours/add-tour-dialog";

export default function Tours() {
  const [date, setDate] = useState<Date>(new Date());
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });
  const { data: workflows = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/workflows"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );

  // Simulated AI optimization function
  const optimizeRoute = () => {
    console.log("Optimizing routes with AI...");
  };

  const defaultWorkflow = {
    id: 1,
    name: "Standard Pflegetour",
    description: "Standardisierter Ablauf für Pflegebesuche",
    steps: [
      {
        order: 1,
        action: "Vitalzeichenkontrolle",
        duration: 10,
        required: true,
      },
      {
        order: 2,
        action: "Medikamentengabe",
        duration: 15,
        required: true,
      },
      {
        order: 3,
        action: "Grundpflege",
        duration: 30,
        required: true,
      },
      {
        order: 4,
        action: "Dokumentation",
        duration: 10,
        required: true,
      },
    ],
    aiOptimized: true,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tourenplanung</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>KI-optimierte Routenplanung & Zeitmanagement</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={optimizeRoute}>
                <Brain className="mr-2 h-4 w-4" />
                KI-Optimierung
              </Button>
              <AddTourDialog />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-[300px,1fr,300px]">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    locale={de}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Statistiken</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Touren heute</span>
                    <span className="font-medium">{todaysTours.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Patienten</span>
                    <span className="font-medium">
                      {todaysTours.reduce((acc, tour) => acc + tour.patientIds.length, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Zeitaufwand</span>
                    <span className="font-medium">4.5h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">KI-Optimierungen</span>
                    <span className="font-medium text-primary">3 Vorschläge</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="row-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    Touren am {format(date, "dd. MMMM yyyy", { locale: de })}
                  </h2>
                  <Button variant="outline" size="sm">
                    <RotateCw className="mr-2 h-4 w-4" />
                    Aktualisieren
                  </Button>
                </div>

                {todaysTours.length === 0 ? (
                  <div className="text-center py-12">
                    <Route className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Keine Touren für diesen Tag geplant
                    </p>
                    <Button variant="outline" className="mt-4">
                      Tour planen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todaysTours.map((tour) => (
                      <div
                        key={tour.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                      >
                        <div className="p-2 rounded-full bg-primary/10">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              Tour #{tour.id}
                            </p>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(tour.date), "HH:mm")}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {tour.patientIds.length} Patienten
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {tour.optimizedRoute?.totalDistance.toFixed(1) || "2.5"} km
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              ~{tour.optimizedRoute?.estimatedDuration || 45} min
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Details</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <SmartWorkflow
                workflow={defaultWorkflow}
                tour={todaysTours[0]}
                onOptimize={optimizeRoute}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}