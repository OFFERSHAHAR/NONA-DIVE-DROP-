"use client";

import { useWindowStore } from "@/stores/windowStore";
import { OSWindow } from "@/types/os";
import { X, Minus, Maximize } from "lucide-react";
import { useRef, useEffect, useCallback, memo } from "react";
import clsx from "clsx";

interface WindowComponentProps {
  window: OSWindow;
  children: React.ReactNode;
}

function WindowComponent({ window: osWindow, children }: WindowComponentProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const dragStateRef = useRef({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  const animationRef = useRef<number | null>(null);

  // Get actions from store once
  const actions = useWindowStore(
    useCallback(
      (state) => ({
        focusWindow: state.focusWindow,
        closeWindow: state.closeWindow,
        minimizeWindow: state.minimizeWindow,
        maximizeWindow: state.maximizeWindow,
        moveWindow: state.moveWindow,
        resizeWindow: state.resizeWindow,
      }),
      []
    )
  );

  // Handle title bar mouse down to start dragging
  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag if clicking on buttons (data-no-drag)
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;

    e.preventDefault();
    const state = useWindowStore.getState();
    state.focusWindow(osWindow.id);

    dragStateRef.current.isDragging = true;
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.startY = e.clientY;
    dragStateRef.current.offsetX = osWindow.position.x;
    dragStateRef.current.offsetY = osWindow.position.y;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  }, [osWindow.id, osWindow.position]);

  // Handle resize handle mouse down to start resizing
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const state = useWindowStore.getState();
    state.focusWindow(osWindow.id);

    dragStateRef.current.isResizing = true;
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.startY = e.clientY;
    dragStateRef.current.startWidth = osWindow.size.width;
    dragStateRef.current.startHeight = osWindow.size.height;

    document.body.style.cursor = "se-resize";
    document.body.style.userSelect = "none";
  }, [osWindow.id, osWindow.size]);

  // Handle click to focus window
  const handleWindowClick = useCallback(() => {
    useWindowStore.getState().focusWindow(osWindow.id);
  }, [osWindow.id]);

  // Global mouse move handler - setup once with ref-based state
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;

      if (!state.isDragging && !state.isResizing) return;

      if (state.isDragging) {
        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;

        const newX = state.offsetX + deltaX;
        const newY = state.offsetY + deltaY;

        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }

        animationRef.current = requestAnimationFrame(() => {
          useWindowStore.getState().moveWindow(osWindow.id, newX, newY);
        });
      } else if (state.isResizing) {
        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;

        const newWidth = Math.max(400, state.startWidth + deltaX);
        const newHeight = Math.max(300, state.startHeight + deltaY);

        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current);
        }

        animationRef.current = requestAnimationFrame(() => {
          useWindowStore.getState().resizeWindow(osWindow.id, newWidth, newHeight);
        });
      }
    };

    const handleGlobalMouseUp = () => {
      dragStateRef.current.isDragging = false;
      dragStateRef.current.isResizing = false;

      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    // Only attach listeners when needed
    document.addEventListener("mousemove", handleGlobalMouseMove, { capture: true, passive: false });
    document.addEventListener("mouseup", handleGlobalMouseUp, { capture: true });

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove, true);
      document.removeEventListener("mouseup", handleGlobalMouseUp, true);

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [osWindow.id]);

  if (osWindow.isMinimized) return null;

  const { closeWindow, minimizeWindow, maximizeWindow } = actions;

  return (
    <div
      ref={windowRef}
      onClick={handleWindowClick}
      className={clsx(
        "fixed bg-os-panel border rounded-os-lg shadow-os-lg window-enter",
        "flex flex-col transition-shadow duration-250",
        "touch-none",
        osWindow.isFocused
          ? "border-os-primary/50 shadow-os-focus"
          : "border-os-border"
      )}
      style={{
        left: `${osWindow.position.x}px`,
        top: `${osWindow.position.y}px`,
        width: `${osWindow.size.width}px`,
        height: `${osWindow.size.height}px`,
        zIndex: osWindow.zIndex,
      }}
    >
      <div
        ref={titleBarRef}
        onMouseDown={handleTitleMouseDown}
        className={clsx(
          "flex items-center justify-between cursor-move user-select-none",
          "px-4 py-3 border-b rounded-t-os-lg",
          "transition-colors duration-250",
          osWindow.isFocused
            ? "bg-gradient-os-primary/20 border-os-primary/30"
            : "bg-os-hover border-os-border"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full bg-gradient-os-primary" />
          <h2 className="text-sm font-semibold text-white truncate">
            {osWindow.title}
          </h2>
        </div>

        <div className="flex gap-2 flex-shrink-0" data-no-drag>
          <button
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(osWindow.id);
            }}
            className="p-1.5 hover:bg-os-primary/20 rounded-os-md transition-colors text-gray-300 hover:text-white"
            title="Minimize (Alt+M)"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              maximizeWindow(osWindow.id);
            }}
            className="p-1.5 hover:bg-os-accent/20 rounded-os-md transition-colors text-gray-300 hover:text-white"
            title="Maximize (Alt+X)"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(osWindow.id);
            }}
            className="p-1.5 hover:bg-os-danger/20 rounded-os-md transition-colors text-gray-300 hover:text-os-danger"
            title="Close (Alt+Q)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">{children}</div>

      <div
        ref={resizeRef}
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize group"
        title="Drag to resize"
        style={{ zIndex: osWindow.zIndex + 1 }}
      >
        <div className="w-full h-full border-r-2 border-b-2 border-os-primary/0 group-hover:border-os-primary/50 rounded-bl-os-lg transition-colors" />
      </div>
    </div>
  );
}

// Memoize with custom comparison: only re-render if window data actually changes
export const Window = memo(WindowComponent, (prevProps, nextProps) => {
  // Re-render only if critical window properties change
  return (
    prevProps.window.position.x === nextProps.window.position.x &&
    prevProps.window.position.y === nextProps.window.position.y &&
    prevProps.window.size.width === nextProps.window.size.width &&
    prevProps.window.size.height === nextProps.window.size.height &&
    prevProps.window.zIndex === nextProps.window.zIndex &&
    prevProps.window.isFocused === nextProps.window.isFocused &&
    prevProps.window.isMinimized === nextProps.window.isMinimized &&
    prevProps.window.title === nextProps.window.title &&
    prevProps.children === nextProps.children
  );
});
