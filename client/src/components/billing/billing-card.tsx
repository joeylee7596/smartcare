import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InsuranceBilling, Patient, BillingStatus, BillingType } from "@shared/schema";
import { format, isValid, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { FileText, Send, CheckCircle, XCircle, Clock, FileEdit, Euro, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BillingCardProps {
  billing: InsuranceBilling;
  patient: Patient;
  onSubmit: () => void;
  onOptimize?: () => void;
}

// Hilfsfunktion für sichere Datumsformatierung
const formatSafeDate = (dateString: string | Date | null | undefined, defaultValue: string = "Nicht verfügbar"): string => {
  if (!dateString) return defaultValue;

  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return isValid(date) ? format(date, "dd. MMMM yyyy", { locale: de }) : defaultValue;
  } catch (error) {
    console.error('Date formatting error:', error);
    return defaultValue;
  }
};

export function BillingCard({ billing, patient, onSubmit, onOptimize }: BillingCardProps) {
  const statusConfig = {
    draft: {
      label: "Entwurf",
      color: "text-gray-600 bg-gray-50",
      icon: FileEdit,
    },
    pending: {
      label: "In Bearbeitung",
      color: "text-yellow-600 bg-yellow-50",
      icon: Clock,
    },
    submitted: {
      label: "Eingereicht",
      color: "text-blue-600 bg-blue-50",
      icon: Send,
    },
    paid: {
      label: "Bezahlt",
      color: "text-green-600 bg-green-50",
      icon: CheckCircle,
    },
    rejected: {
      label: "Abgelehnt",
      color: "text-red-600 bg-red-50",
      icon: XCircle,
    },
  } as const;

  const currentStatus = statusConfig[billing.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  const typeConfig = {
    [BillingType.INSURANCE]: {
      label: "Krankenkasse",
      color: "bg-blue-100 text-blue-800",
    },
    [BillingType.PRIVATE]: {
      label: "Privatrechnung",
      color: "bg-purple-100 text-purple-800",
    },
  };

  const hasAiEnhanced = billing.services.some(service => service.aiEnhanced);

  return (
    <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Type Badge - Top Right */}
      <div className="absolute top-3 right-3">
        <Badge 
          className={cn(
            "px-2 py-1 text-xs font-medium",
            typeConfig[billing.type as keyof typeof typeConfig]?.color
          )}
        >
          {typeConfig[billing.type as keyof typeof typeConfig]?.label}
        </Badge>
      </div>

      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Rechnung #{billing.id}</span>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-full text-sm flex items-center gap-1",
            currentStatus.color
          )}>
            <StatusIcon className="h-4 w-4" />
            <span>{currentStatus.label}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Patient Information */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium">{patient.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versicherung</span>
            <span className="font-medium">{patient.insuranceProvider}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Versicherungsnummer</span>
            <span className="font-medium">{patient.insuranceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Datum</span>
            <span className="font-medium">
              {formatSafeDate(billing.date)}
            </span>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Leistungen</h4>
            {hasAiEnhanced && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Wand2 className="h-3 w-3" />
                      KI-optimiert
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Diese Abrechnung wurde mit KI-Unterstützung optimiert
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="space-y-1">
            {billing.services.map((service, index) => (
              <div key={index} className="flex justify-between text-sm items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span>{service.description}</span>
                    {service.aiEnhanced && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Wand2 className="h-3 w-3 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Diese Beschreibung wurde mit KI optimiert
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">Code: {service.code}</span>
                </div>
                <span className="font-medium ml-4">{service.amount.toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Amount */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Gesamtbetrag</span>
            <span className="text-lg font-bold text-blue-600">{Number(billing.totalAmount).toFixed(2)} €</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {(billing.status === "draft" || billing.status === "pending") && (
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={onSubmit}
                variant={billing.status === "draft" ? "outline" : "default"}
              >
                {billing.status === "draft" ? (
                  <>
                    <FileEdit className="mr-2 h-4 w-4" />
                    Zur Prüfung freigeben
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    An Krankenkasse senden
                  </>
                )}
              </Button>
              {onOptimize && (
                <Button
                  variant="outline"
                  className="px-3"
                  onClick={onOptimize}
                  title="Mit KI optimieren"
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {billing.status === "paid" && billing.responseDate && (
          <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-md p-2">
            <Euro className="h-4 w-4" />
            <span className="text-sm font-medium">
              Bezahlt am {formatSafeDate(billing.responseDate)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}