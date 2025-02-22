import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users as UsersIcon,
  ClipboardText,
  Path,
  FirstAidKit,
  CaretRight
} from "phosphor-react";
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
      "relative overflow-hidden transition-all duration-500",
      "hover:scale-[1.02] hover:-translate-y-1",
      "rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]",
      "hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.12)]",
      "border border-white/20 backdrop-blur-sm",
      gradient && "bg-gradient-to-br from-blue-500/[0.08] via-blue-400/[0.05] to-transparent",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn(
            "p-4 rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110",
            gradient 
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25" 
              : "bg-white shadow-blue-500/10"
          )}>
            <Icon 
              weight={gradient ? "fill" : "regular"} 
              className={cn(
                "h-8 w-8 transition-all duration-500",
                "group-hover:scale-110 group-hover:rotate-6",
                !gradient && "text-blue-500"
              )} 
            />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {value}
            </div>
            <div className="text-sm text-gray-500 mt-1">{description}</div>
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-medium text-sm text-gray-600">{title}</h3>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const { data: docs = [] } = useQuery<Documentation[]>({
    queryKey: ["/api/docs"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );

  const criticalPatients = patients.filter(patient => patient.careLevel >= 4);
  const pendingDocs = docs.filter(doc => doc.status === "pending");

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-white">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Willkommen zurück, {user?.name}
            </h1>
            <p className="text-lg text-gray-500">
              {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <DashboardCard
              title="Aktive Patienten"
              value={patients.length}
              description={`${criticalPatients.length} kritische Fälle`}
              icon={UsersIcon}
              gradient
            />
            <DashboardCard
              title="Heutige Touren"
              value={todaysTours.length}
              description={`Nächste: ${todaysTours[0] ? format(new Date(todaysTours[0].date), "HH:mm") : '--:--'}`}
              icon={Path}
              gradient
            />
            <DashboardCard
              title="Dokumentation"
              value={pendingDocs.length}
              description="Ausstehende Berichte"
              icon={ClipboardText}
              gradient
            />
            <DashboardCard
              title="Warnungen"
              value={criticalPatients.length}
              description="Kritische Patienten"
              icon={FirstAidKit}
              className="bg-gradient-to-br from-red-500/[0.08] via-red-400/[0.05] to-transparent"
            />
          </div>

          {/* Main Content Area */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Active Tours */}
            <Card className="lg:col-span-2 rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Aktive Touren</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysTours.length === 0 ? (
                    <p className="text-gray-500">Keine Touren für heute geplant</p>
                  ) : (
                    todaysTours.map((tour) => (
                      <div 
                        key={tour.id} 
                        className="p-4 rounded-2xl border border-white/40 bg-white/80 backdrop-blur-sm
                          hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-50/50
                          transition-all duration-500 hover:shadow-lg hover:-translate-y-0.5
                          group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">Tour #{tour.id}</h3>
                            <p className="text-sm text-gray-500">
                              {tour.patientIds.length} Patienten
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-blue-600 group-hover:text-blue-700">
                              {format(new Date(tour.date), "HH:mm")}
                            </p>
                            <p className="text-sm text-gray-500">
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
            <Card className="rounded-2xl border border-white/20 backdrop-blur-sm shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Schnellzugriff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/patients/new">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-14 rounded-xl
                        bg-gradient-to-r from-white to-blue-50/50
                        hover:from-blue-50 hover:to-blue-100/50
                        border border-white/40 hover:border-blue-200
                        hover:shadow-lg hover:-translate-y-0.5
                        transition-all duration-500 group"
                    >
                      <UsersIcon weight="regular" className="mr-3 h-6 w-6 text-blue-500 
                        transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                      <span className="font-medium text-gray-700 flex-1">Patient aufnehmen</span>
                      <CaretRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                        group-hover:translate-x-1 transition-all duration-500" />
                    </Button>
                  </Link>
                  <Link href="/tours/new">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-14 rounded-xl
                        bg-gradient-to-r from-white to-blue-50/50
                        hover:from-blue-50 hover:to-blue-100/50
                        border border-white/40 hover:border-blue-200
                        hover:shadow-lg hover:-translate-y-0.5
                        transition-all duration-500 group"
                    >
                      <Path weight="regular" className="mr-3 h-6 w-6 text-blue-500 
                        transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                      <span className="font-medium text-gray-700 flex-1">Tour planen</span>
                      <CaretRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                        group-hover:translate-x-1 transition-all duration-500" />
                    </Button>
                  </Link>
                  <Link href="/documentation/new">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-14 rounded-xl
                        bg-gradient-to-r from-white to-blue-50/50
                        hover:from-blue-50 hover:to-blue-100/50
                        border border-white/40 hover:border-blue-200
                        hover:shadow-lg hover:-translate-y-0.5
                        transition-all duration-500 group"
                    >
                      <ClipboardText weight="regular" className="mr-3 h-6 w-6 text-blue-500 
                        transition-all duration-500 group-hover:scale-110 group-hover:rotate-6" />
                      <span className="font-medium text-gray-700 flex-1">Dokumentation erstellen</span>
                      <CaretRight className="h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 
                        group-hover:translate-x-1 transition-all duration-500" />
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