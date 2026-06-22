"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/actions/notifications";
import { toastError } from "@/lib/toast";
import {
  formatNotificationTime,
  getNotificationHref,
  getNotificationIcon,
} from "@/lib/notifications/display";
import { openTaskDrawer } from "@/lib/stores/task-drawer-store";
import type { Notification } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

type NotificationsBellProps = {
  unreadCount: number;
  pendingEmailCount?: number;
  notifications?: Notification[] | null;
};

export function NotificationsBell({
  unreadCount,
  pendingEmailCount = 0,
  notifications: notificationsProp,
}: NotificationsBellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const notifications = notificationsProp ?? [];
  const safeUnreadCount = unreadCount ?? 0;
  const safePendingEmailCount = pendingEmailCount ?? 0;

  function handleMarkAllRead(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();
      if (result.error) {
        toastError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleNotificationClick(notification: Notification) {
    startTransition(async () => {
      if (!notification.read) {
        const result = await markNotificationAsRead(notification.id);
        if (result.error) {
          toastError(result.error);
          return;
        }
      }

      if (notification.entity_type === "task" && notification.entity_id) {
        openTaskDrawer(notification.entity_id);
      } else {
        const href = getNotificationHref(notification);
        if (href) router.push(href);
      }

      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-muted"
        aria-label={`Notifications${safeUnreadCount > 0 ? `, ${safeUnreadCount} unread` : ""}${safePendingEmailCount > 0 ? `, ${safePendingEmailCount} unmatched emails` : ""}`}
      >
        <Bell className="size-5" />
        {safePendingEmailCount > 0 ? (
          <Badge
            className="absolute -bottom-0.5 -left-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-blue-600 p-0 text-[10px] text-white hover:bg-blue-600"
          >
            {safePendingEmailCount > 99 ? "99+" : safePendingEmailCount}
          </Badge>
        ) : null}
        {safeUnreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
          >
            {safeUnreadCount > 99 ? "99+" : safeUnreadCount}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {safeUnreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60",
                        !notification.read && "bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          notification.read
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span
                            className={cn(
                              "text-sm leading-snug",
                              !notification.read && "font-medium",
                            )}
                          >
                            {notification.title}
                          </span>
                          {!notification.read ? (
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                              aria-label="Unread"
                            />
                          ) : null}
                        </span>
                        {notification.body ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                            {notification.body}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
