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
import { Bell, LogOut, Settings, UserCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const isLoading = logoutMutation.isPending;

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            Care Assistant
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative group hover:scale-105 transition-all duration-300 hover:bg-blue-50 rounded-xl"
          >
            <Bell className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-lg group-hover:animate-bounce">
              3
            </span>
          </Button>

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