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
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";

export default function Tours() {
  const [date, setDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const { sendMessage, subscribe } = useWebSocket();

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: workflows = [] } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/workflows"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );

  const optimizeRoute = () => {
    if (!todaysTours.length) {
      toast({
        title: "Keine Touren vorhanden",
        description: "Erstellen Sie zuerst eine Tour für die KI-Optimierung.",
      });
      return;
    }

    toast({
      title: "KI-Optimierung gestartet",
      description: "Die Routen werden optimiert...",
    });

    sendMessage({
      type: 'OPTIMIZE_TOUR',
      tours: todaysTours,
    });
  };

  // Get dates with tours for calendar highlighting
  const datesWithTours = tours.reduce((acc, tour) => {
    const tourDate = format(new Date(tour.date), "yyyy-MM-dd");
    acc[tourDate] = true;
    return acc;
  }, {} as Record<string, boolean>);

  return (
    <div className="flex min-h-screen bg-gray-50">
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
            {/* Left Column - Calendar and Stats */}
            <div className="space-y-6">
              <Card className="shadow-lg overflow-hidden">
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    locale={de}
                    className="rounded-md"
                    modifiers={{
                      hasTour: (date) => datesWithTours[format(date, "yyyy-MM-dd")] || false,
                    }}
                    modifiersStyles={{
                      hasTour: {
                        backgroundColor: "hsl(220 70% 50% / 0.1)",
                        color: "hsl(220 70% 50%)",
                        fontWeight: "bold",
                      },
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Statistiken</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div 
                    className="flex items-center justify-between p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-sm text-muted-foreground">Touren heute</span>
                    <span className="font-medium">{todaysTours.length}</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-sm text-muted-foreground">Patienten</span>
                    <span className="font-medium">
                      {todaysTours.reduce((acc, tour) => acc + tour.patientIds.length, 0)}
                    </span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center justify-between p-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                    whileHover={{ x: 5 }}
                  >
                    <span className="text-sm text-muted-foreground">Zeitaufwand</span>
                    <span className="font-medium">
                      {todaysTours.reduce((acc, tour) => acc + (tour.optimizedRoute?.estimatedDuration || 0), 0)} min
                    </span>
                  </motion.div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Tour List */}
            <Card className="row-span-2 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    Touren am {format(date, "dd. MMMM yyyy", { locale: de })}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Aktualisieren
                  </Button>
                </div>

                <AnimatePresence>
                  {todaysTours.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12"
                    >
                      <Route className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Keine Touren für diesen Tag geplant
                      </p>
                      <Button variant="outline" className="mt-4">
                        Tour planen
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="space-y-4"
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: { opacity: 0 },
                        show: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.1
                          }
                        }
                      }}
                    >
                      {todaysTours.map((tour) => (
                        <motion.div
                          key={tour.id}
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            show: { opacity: 1, y: 0 }
                          }}
                          className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
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
                              {tour.optimizedRoute && (
                                <>
                                  <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {tour.optimizedRoute.totalDistance.toFixed(1)} km
                                  </div>
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    ~{tour.optimizedRoute.estimatedDuration} min
                                  </div>
                                </>
                              )}
                            </div>
                            {tour.optimizedRoute && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Route className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-700">
                                    Optimierte Route
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {tour.optimizedRoute.waypoints.map((waypoint, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm">
                                        {index + 1}
                                      </div>
                                      <span className="text-sm text-blue-600">
                                        Patient #{waypoint.patientId}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="hover:bg-primary/5"
                          >
                            Details
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Right Column - Workflow */}
            <div className="space-y-6">
              {workflows[0] && todaysTours[0] ? (
                <SmartWorkflow
                  workflow={workflows[0]}
                  tour={todaysTours[0]}
                  onOptimize={optimizeRoute}
                />
              ) : (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Workflow</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center p-6 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Keine aktiven Touren verfügbar</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}