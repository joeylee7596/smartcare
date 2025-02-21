import { Patient } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Heart, Phone, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface PatientGridProps {
  patients: Patient[];
}

export function PatientGrid({ patients }: PatientGridProps) {
  const { toast } = useToast();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {patients.map((patient) => (
        <motion.div key={patient.id} variants={item}>
          <Card className="group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex justify-between items-center">
                <span>{patient.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                    Pflegegrad {patient.careLevel}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm bg-muted/50 p-2 rounded-lg transition-colors group-hover:bg-muted">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <span>{patient.address}</span>
                </div>
                <div className="flex items-center text-sm bg-muted/50 p-2 rounded-lg transition-colors group-hover:bg-muted">
                  <Phone className="h-4 w-4 mr-2 text-primary" />
                  <span>{patient.emergencyContact}</span>
                </div>
                <div className="flex items-center text-sm bg-muted/50 p-2 rounded-lg transition-colors group-hover:bg-muted">
                  <Heart className="h-4 w-4 mr-2 text-primary" />
                  <span>{patient.insuranceProvider}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-white hover:bg-primary/5"
                    onClick={() => {
                      window.location.href = `/documentation?patient=${patient.id}`;
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    Dokumentation
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 bg-white hover:bg-primary/5"
                    onClick={() => {
                      window.location.href = `/tours/new?patient=${patient.id}`;
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    Termine
                  </Button>
                </div>
              </div>

              {patient.lastVisit && (
                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                  Letzter Besuch: {format(new Date(patient.lastVisit), "dd. MMMM yyyy", { locale: de })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}