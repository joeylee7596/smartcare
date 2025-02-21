import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, LogOut } from "lucide-react";

export function Header() {
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b border-border/40 bg-gradient-to-r from-blue-600/90 via-blue-500/80 to-blue-400/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="ml-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:scale-105 transition-all duration-300 text-white/90 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-lg animate-pulse">
              3
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-10 w-10 rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-xl"
              >
                <Avatar className="h-10 w-10 border-2 border-white/20 shadow-lg transition-all duration-300">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-medium">
                    {user?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border border-blue-100 shadow-xl animate-in slide-in-from-top-1">
              <DropdownMenuItem className="flex items-center gap-3 p-3 rounded-lg m-1 focus:bg-blue-50">
                <Avatar className="h-10 w-10 border-2 border-blue-100 shadow-md">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-medium">
                    {user?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                  <span className="text-xs text-gray-500">{user?.email}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()} 
                className="flex items-center gap-2 p-2 m-1 rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50 transition-colors duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}