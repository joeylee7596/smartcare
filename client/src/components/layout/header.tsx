import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, LogOut, Settings, UserCircle, Check, X, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  timestamp: string;
  read: boolean;
}

// Mock notifications - in a real app, this would come from an API
const mockNotifications: Notification[] = [
  {
    id: 1,
    title: "Neue Tour erstellt",
    message: "Eine neue Tour wurde für heute um 14:00 Uhr erstellt.",
    type: "success",
    timestamp: "Vor 5 Minuten",
    read: false
  },
  {
    id: 2,
    title: "Krankmeldung",
    message: "Maria Schmidt hat sich für heute krank gemeldet.",
    type: "error",
    timestamp: "Vor 15 Minuten",
    read: false
  },
  {
    id: 3,
    title: "Dokumentation ausstehend",
    message: "3 Dokumentationen müssen noch vervollständigt werden.",
    type: "info",
    timestamp: "Vor 1 Stunde",
    read: true
  }
];

export function Header() {
  const { user, logoutMutation } = useAuth();
  const isLoading = logoutMutation.isPending;
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-red-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Care Assistant
          </span>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative group hover:scale-105 transition-all duration-300 hover:bg-blue-50 rounded-xl"
              >
                <Bell className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-lg group-hover:animate-bounce"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-80 mt-2 rounded-xl border border-blue-100 shadow-xl bg-white"
              onCloseAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                if (!notificationOpen) return;
                e.preventDefault();
                setNotificationOpen(false);
              }}
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <span className="font-medium">Benachrichtigungen</span>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-blue-600 hover:text-blue-700"
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  >
                    Alle als gelesen markieren
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[300px]">
                <AnimatePresence initial={false}>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer",
                        !notification.read && "bg-blue-50/50"
                      )}
                      onClick={() => {
                        markAsRead(notification.id);
                        // Keep the dropdown open after clicking
                        e.stopPropagation();
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <span className="text-xs text-gray-500">{notification.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-10 w-10 rounded-xl hover:scale-105 transition-all duration-300 hover:bg-blue-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Skeleton className="h-10 w-10 rounded-xl" />
                ) : (
                  <Avatar className="h-10 w-10 border-2 border-blue-100 shadow-lg transition-all duration-300 group-hover:border-blue-200">
                    <AvatarImage src={user?.profileImage} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white font-medium">
                      {user?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-64 mt-2 rounded-xl border border-blue-100 shadow-xl animate-in slide-in-from-top-1 duration-200"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10 border-2 border-blue-100 shadow-md">
                  <AvatarImage src={user?.profileImage} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-800 text-white font-medium">
                    {user?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                  <span className="text-xs text-gray-500">{user?.username}</span>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem className="flex items-center gap-2 p-2 m-1 rounded-lg focus:bg-blue-50 transition-colors duration-200">
                <UserCircle className="h-4 w-4 text-blue-600" />
                <span>Profil</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center gap-2 p-2 m-1 rounded-lg focus:bg-blue-50 transition-colors duration-200">
                <Settings className="h-4 w-4 text-blue-600" />
                <span>Einstellungen</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()} 
                disabled={isLoading}
                className="flex items-center gap-2 p-2 m-1 rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>{isLoading ? "Abmelden..." : "Abmelden"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}