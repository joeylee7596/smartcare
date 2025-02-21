import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour } from "@shared/schema";
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

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

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

          <div className="grid gap-8 md:grid-cols-[300px,1fr]">
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

            {/* Right Column - Tour List and Map */}
            <div className="space-y-8">
              {/* Tour List */}
              <Card className="shadow-lg">
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
                            className="relative"
                          >
                            <div className="flex flex-col bg-white rounded-lg shadow-sm border p-4">
                              <div className="flex items-center gap-4 mb-4">
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
                                </div>
                              </div>

                              {tour.optimizedRoute && (
                                <div className="grid grid-cols-[1fr,300px] gap-4">
                                  {/* Route List */}
                                  <div className="space-y-3">
                                    {tour.optimizedRoute.waypoints.map((waypoint: any, index: number) => (
                                      <div key={index} className="relative">
                                        <div className="flex items-start gap-3">
                                          <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
                                              {index + 1}
                                            </div>
                                            {index < tour.optimizedRoute.waypoints.length - 1 && (
                                              <div className="h-16 w-0.5 bg-blue-100 mt-1" />
                                            )}
                                          </div>
                                          <div className="flex-1 bg-blue-50 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium">
                                                Patient #{waypoint.patientId}
                                              </span>
                                              <span className="text-sm text-muted-foreground">
                                                {formatTime(waypoint.estimatedTime)} Uhr
                                              </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                              <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {waypoint.visitDuration} Min Besuch
                                              </div>
                                              {waypoint.travelTimeToNext > 0 && (
                                                <div className="flex items-center gap-1">
                                                  <MapPin className="h-4 w-4" />
                                                  {waypoint.distanceToNext.toFixed(1)} km
                                                </div>
                                              )}
                                            </div>
                                            {waypoint.travelTimeToNext > 0 && (
                                              <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                                                <Clock className="h-4 w-4" />
                                                {waypoint.travelTimeToNext} Min Fahrt zum nächsten Patienten
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Simulated Map */}
                                  <div className="relative rounded-lg bg-blue-50 border border-blue-100 min-h-[300px]">
                                    <div className="absolute inset-0">
                                      {tour.optimizedRoute.waypoints.map((waypoint: any, index: number) => {
                                        const x = (waypoint.coordinates.lng - 13.3) * 1000;
                                        const y = (52.6 - waypoint.coordinates.lat) * 1000;

                                        return (
                                          <div
                                            key={index}
                                            className="absolute"
                                            style={{
                                              left: `${x}px`,
                                              top: `${y}px`,
                                            }}
                                          >
                                            <div className="w-8 h-8 -mt-4 -ml-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                                              {index + 1}
                                            </div>
                                            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded text-sm shadow">
                                              {waypoint.visitDuration} Min
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}