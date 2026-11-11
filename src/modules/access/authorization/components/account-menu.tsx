"use client";

import { Logout01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  useSidebar,
} from "@/components/ui/sidebar";

import { authClient } from "../../auth/auth-client";
import { SIGN_IN_PATH } from "../../routes";
import { getUserInitials } from "../user-initials";

const SIGN_OUT_ERROR_MESSAGE = "No pudimos cerrar la sesión. Probá de nuevo.";

export function AccountMenu({ userName }: { userName: string }) {
  const router = useRouter();
  const { isMobile } = useSidebar();

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
              className="gap-3 text-base font-medium data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center"
            >
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                  {getUserInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <span className="group-data-[collapsible=icon]:hidden">
                {userName}
              </span>
              <HugeiconsIcon
                icon={UnfoldMoreIcon}
                className="ml-auto size-5 group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
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
