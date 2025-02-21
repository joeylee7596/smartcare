import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Patient, Documentation as Doc } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Mic, Type, Sparkles, Clock } from "lucide-react";
import { useState } from "react";

export default function Documentation() {
  const [isRecording, setIsRecording] = useState(false);
  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  // Simulated AI suggestions based on time and context
  const getAISuggestions = (patientId: number, time: Date) => {
    const hour = time.getHours();
    if (hour >= 6 && hour < 10) {
      return "Morgenpflege durchgeführt, Medikamente verabreicht";
    } else if (hour >= 11 && hour < 14) {
      return "Mittagessen assistiert, Vitalzeichen kontrolliert";
    } else if (hour >= 17 && hour < 20) {
      return "Abendpflege durchgeführt, Medikamente verabreicht";
    }
    return "Routinecheck durchgeführt, keine Besonderheiten";
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Dokumentation</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsRecording(!isRecording)} 
                className={isRecording ? "bg-red-50 text-red-600" : ""}>
                <Mic className="mr-2 h-4 w-4" />
                {isRecording ? "Aufnahme beenden" : "Sprachaufnahme"}
              </Button>
              <Button variant="outline">
                <Type className="mr-2 h-4 w-4" />
                Text eingeben
              </Button>
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                KI-Vorschläge
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient) => {
              const { data: docs = [] } = useQuery<Doc[]>({
                queryKey: ["/api/patients", patient.id, "docs"],
              });

              return (
                <Card key={patient.id} className="relative">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{patient.name}</span>
                      <Button variant="ghost" size="sm" className="text-xs">
                        <Clock className="mr-1 h-3 w-3" />
                        Zeitleiste
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {/* AI Suggestion Card */}
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center text-sm text-blue-700 mb-2">
                            <Sparkles className="h-3 w-3 mr-1" />
                            KI-Vorschlag
                          </div>
                          <p className="text-sm text-blue-900">
                            {getAISuggestions(patient.id, new Date())}
                          </p>
                          <Button variant="ghost" size="sm" className="mt-2 text-xs text-blue-700">
                            Übernehmen
                          </Button>
                        </div>

                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 border rounded-lg space-y-2 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {doc.type}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(doc.date), "dd.MM.yyyy HH:mm", {
                                  locale: de,
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{doc.content}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}