import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Users, CalendarDays, ClipboardList, AlertTriangle } from "lucide-react";
import { Patient, Tour, Documentation } from "@shared/schema";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

function DashboardCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  className,
  gradient = false
}: { 
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<any>;
  className?: string;
  gradient?: boolean;
}) {
  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      gradient && "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn(
            "p-2 rounded-lg",
            gradient ? "bg-primary/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "h-8 w-8",
              gradient ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch all required data
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: docs = [] } = useQuery<Documentation[]>({
    queryKey: ["/api/docs"],
  });

  // Calculate important metrics
  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  const criticalPatients = patients.filter(patient => patient.careLevel >= 4);
  const pendingDocs = docs.filter(doc => doc.status === "pending");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Willkommen zurück, {user?.name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <DashboardCard
              title="Aktive Patienten"
              value={patients.length}
              description={`${criticalPatients.length} kritische Fälle`}
              icon={Users}
              gradient
            />
            <DashboardCard
              title="Heutige Touren"
              value={todaysTours.length}
              description={`Nächste: ${todaysTours[0] ? format(new Date(todaysTours[0].date), "HH:mm") : '--:--'}`}
              icon={CalendarDays}
              gradient
            />
            <DashboardCard
              title="Dokumentation"
              value={pendingDocs.length}
              description="Ausstehende Berichte"
              icon={ClipboardList}
              gradient
            />
            <DashboardCard
              title="Warnungen"
              value={criticalPatients.length}
              description="Kritische Patienten"
              icon={AlertTriangle}
              className="bg-red-50 border-red-100"
            />
          </div>

          {/* Main Content Area */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Active Tours */}
            <Card className="lg:col-span-2 border-primary/20">
              <CardHeader>
                <CardTitle>Aktive Touren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysTours.length === 0 ? (
                    <p className="text-muted-foreground">Keine Touren für heute geplant</p>
                  ) : (
                    todaysTours.map((tour) => (
                      <div key={tour.id} className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">Tour #{tour.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tour.patientIds.length} Patienten
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {format(new Date(tour.date), "HH:mm")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tour.status}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Column: Quick Actions */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Schnellzugriff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/patients/new">
                    <Button variant="outline" className="w-full justify-start hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                      <Users className="mr-2 h-4 w-4" />
                      Patient aufnehmen
                    </Button>
                  </Link>
                  <Link href="/tours/new">
                    <Button variant="outline" className="w-full justify-start hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Tour planen
                    </Button>
                  </Link>
                  <Link href="/documentation/new">
                    <Button variant="outline" className="w-full justify-start hover:bg-primary/5 hover:text-primary hover:border-primary/20">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Dokumentation erstellen
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}