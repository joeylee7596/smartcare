import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";
import { Tour } from "@shared/schema";

export default function Tours() {
  const [date, setDate] = useState<Date>(new Date());
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ["/api/tours"],
  });

  const todaysTours = tours.filter(
    (tour) => format(new Date(tour.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <h1 className="text-3xl font-bold mb-8">Tourenplanung</h1>

          <div className="grid gap-8 md:grid-cols-[300px,1fr]">
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
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Touren am {format(date, "dd. MMMM yyyy", { locale: de })}
                </h2>
                {todaysTours.length === 0 ? (
                  <p className="text-muted-foreground">
                    Keine Touren für diesen Tag geplant
                  </p>
                ) : (
                  <div className="space-y-4">
                    {todaysTours.map((tour) => (
                      <div
                        key={tour.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Tour #{tour.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {tour.patientIds.length} Patienten
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(tour.date), "HH:mm")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}