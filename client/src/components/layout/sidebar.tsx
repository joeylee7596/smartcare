import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  Users,
  CalendarDays,
  ClipboardList,
  Settings,
  Menu,
  ChevronLeft,
  Plus,
  FileText,
  UserPlus,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const primaryNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutGrid },
  { name: "Patienten", href: "/patients", icon: Users },
  { name: "Touren", href: "/tours", icon: CalendarDays },
  { name: "Dokumentation", href: "/documentation", icon: ClipboardList },
];

const secondaryNavigation = [
  { name: "Einstellungen", href: "/settings", icon: Settings },
];

const quickActions = [
  { name: "Patient hinzufügen", href: "/patients/new", icon: UserPlus },
  { name: "Tour planen", href: "/tours/new", icon: Calendar },
  { name: "Dokumentation erstellen", href: "/documentation/new", icon: FileText },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-300 bg-gradient-to-b from-[#1E2A4A] via-[#111827] to-[#1F2937] rounded-r-[2rem] shadow-2xl relative",
        "before:absolute before:inset-0 before:bg-gradient-to-b before:from-blue-500/5 before:to-transparent before:rounded-r-[2rem]",
        "after:absolute after:inset-0 after:bg-gradient-to-r after:from-black/20 after:via-transparent after:to-transparent",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with gradient overlay */}
      <div className="flex h-16 items-center px-4 bg-gradient-to-r from-[#1E2A4A]/90 to-transparent backdrop-blur-sm relative z-10">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-white/90">
            SmartCare
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "ml-auto text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300",
            isCollapsed && "rotate-180"
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-2">
          {!isCollapsed && (
            <div className="px-2 py-2">
              <h3 className="text-xs uppercase text-white/50 tracking-wider">
                Schnellzugriff
              </h3>
              <div className="mt-2 space-y-1">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 group"
                      >
                        <Icon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                        {action.name}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-2 py-2">
            <h3 className={cn(
              "mb-2",
              isCollapsed ? "sr-only" : "text-xs uppercase text-white/50 tracking-wider"
            )}>
              Navigation
            </h3>
            <div className="space-y-1">
              {primaryNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={location === item.href ? "sidebar" : "ghost"}
                      className={cn(
                        "w-full justify-start text-white/70 hover:text-white transition-all duration-300",
                        location === item.href 
                          ? "bg-white/10 text-white shadow-lg shadow-blue-500/10 border border-white/5" 
                          : "hover:bg-white/5 hover:shadow-lg hover:shadow-blue-500/5",
                        isCollapsed && "justify-center p-2"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="ml-2">{item.name}</span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="px-2 py-2">
            <h3 className={cn(
              "mb-2",
              isCollapsed ? "sr-only" : "text-xs uppercase text-white/50 tracking-wider"
            )}>
              System
            </h3>
            <div className="space-y-1">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={location === item.href ? "sidebar" : "ghost"}
                      className={cn(
                        "w-full justify-start text-white/70 hover:text-white transition-all duration-300",
                        location === item.href 
                          ? "bg-white/10 text-white shadow-lg shadow-blue-500/10 border border-white/5" 
                          : "hover:bg-white/5 hover:shadow-lg hover:shadow-blue-500/5",
                        isCollapsed && "justify-center p-2"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && (
                        <span className="ml-2">{item.name}</span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}