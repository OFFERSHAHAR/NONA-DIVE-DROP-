"use client";

import { useWindowStore } from "@/stores/windowStore";
import { Window } from "./Window";
import { Dashboard } from "../Apps/Dashboard";
import { Tasks } from "../Apps/Tasks";
import { Calendar } from "../Apps/Calendar";
import { Vault } from "../Apps/Vault";
import { Collaboration } from "../Apps/Collaboration";
import { Settings } from "../Apps/Settings";
import { memo, useMemo } from "react";

const APP_COMPONENTS = {
  dashboard: Dashboard,
  tasks: Tasks,
  calendar: Calendar,
  vault: Vault,
  collaboration: Collaboration,
  settings: Settings,
} as const;

// Memoize the app component selector
const memoizedAppComponents = new Map(Object.entries(APP_COMPONENTS));

function WindowManagerComponent() {
  // Only select visible windows (not minimized) to reduce renders
  const windows = useWindowStore((state) =>
    state.windows.filter((w) => !w.isMinimized)
  );

  // Memoize the window list to prevent unnecessary re-renders
  const renderedWindows = useMemo(
    () =>
      windows.map((osWindow) => {
        const AppComponent = memoizedAppComponents.get(osWindow.app);
        if (!AppComponent) return null;

        return (
          <Window key={osWindow.id} window={osWindow}>
            <AppComponent />
          </Window>
        );
      }),
    [windows]
  );

  return <>{renderedWindows}</>;
}

// Memoize entire component
export const WindowManager = memo(WindowManagerComponent);
