import { Patient } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Heart, Phone, MapPin, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
    <AnimatePresence>
      <motion.div 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {patients.map((patient) => (
          <motion.div 
            key={patient.id} 
            variants={item}
            whileHover={{ 
              scale: 1.02,
              rotateY: 5,
              translateZ: 20
            }}
            style={{ 
              perspective: "1000px",
              transformStyle: "preserve-3d"
            }}
          >
            <Card className="group relative overflow-hidden backdrop-blur-sm bg-white/80 dark:bg-gray-950/80 border-opacity-50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <CardHeader className="pb-4">
                <CardTitle className="flex justify-between items-center">
                  <span className="text-lg font-bold">{patient.name}</span>
                  <div 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary transform transition-transform group-hover:scale-105"
                  >
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Pflegegrad {patient.careLevel}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <motion.div 
                    className="flex items-center text-sm p-3 rounded-lg bg-muted/50 backdrop-blur-sm transition-all duration-300 group-hover:bg-muted/70"
                    whileHover={{ x: 5 }}
                  >
                    <MapPin className="h-4 w-4 mr-3 text-primary" />
                    <span className="flex-1">{patient.address}</span>
                  </motion.div>

                  <motion.div 
                    className="flex items-center text-sm p-3 rounded-lg bg-muted/50 backdrop-blur-sm transition-all duration-300 group-hover:bg-muted/70"
                    whileHover={{ x: 5 }}
                  >
                    <Phone className="h-4 w-4 mr-3 text-primary" />
                    <span className="flex-1">{patient.emergencyContact}</span>
                  </motion.div>

                  <motion.div 
                    className="flex items-center text-sm p-3 rounded-lg bg-muted/50 backdrop-blur-sm transition-all duration-300 group-hover:bg-muted/70"
                    whileHover={{ x: 5 }}
                  >
                    <Heart className="h-4 w-4 mr-3 text-primary" />
                    <span className="flex-1">{patient.insuranceProvider}</span>
                  </motion.div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 hover:bg-primary/5"
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
                      className="flex-1 backdrop-blur-sm bg-white/50 dark:bg-gray-950/50 hover:bg-primary/5"
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
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg backdrop-blur-sm"
                  >
                    Letzter Besuch: {format(new Date(patient.lastVisit), "dd. MMMM yyyy", { locale: de })}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}