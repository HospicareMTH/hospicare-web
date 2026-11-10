"use client";

import { Logout01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SIDEBAR_ITEM_INTERACTION_CLASS_NAME } from "@/components/shared/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { authClient } from "../auth-client";
import { SIGN_IN_PATH } from "../routes";
import { getUserInitials } from "../user-initials";

const SIGN_OUT_ERROR_MESSAGE = "No pudimos cerrar la sesión. Probá de nuevo.";

export function AccountMenu({ userName }: { userName: string }) {
  const router = useRouter();

  async function signOut() {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error(SIGN_OUT_ERROR_MESSAGE);
        return;
      }
    } catch (error) {
      console.error("El cierre de sesión no pudo completarse.", error);
      toast.error(SIGN_OUT_ERROR_MESSAGE);
      return;
    }

    router.replace(SIGN_IN_PATH);
    router.refresh();
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "h-14 gap-3 text-base font-medium data-open:bg-white/12 data-open:text-sidebar-foreground data-open:hover:bg-white/12 data-open:hover:text-sidebar-foreground",
                SIDEBAR_ITEM_INTERACTION_CLASS_NAME,
              )}
            >
              <Avatar className="size-9">
                <AvatarFallback className="bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
                  {getUserInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span>{userName}</span>
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                className="ml-auto size-5"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
          >
            <DropdownMenuItem
              onSelect={signOut}
              className="h-11 gap-3 text-base"
            >
              <HugeiconsIcon
                icon={Logout01Icon}
                className="size-5"
                aria-hidden="true"
              />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
