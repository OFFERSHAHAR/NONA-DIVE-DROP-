"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = Array.from(
    { length: getDaysInMonth(currentDate) },
    (_, i) => i + 1
  );
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);

  return (
    <div className="p-6 h-full bg-gradient-to-br from-os-bg to-os-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h1>
        <button className="p-2 bg-os-primary hover:bg-os-primary/80 rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() =>
            setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
          }
          className="p-2 bg-os-hover hover:bg-os-hover/80 rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="flex-1 py-2 bg-os-hover hover:bg-os-hover/80 rounded transition-colors text-sm"
        >
          Today
        </button>
        <button
          onClick={() =>
            setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))
          }
          className="p-2 bg-os-hover hover:bg-os-hover/80 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-xs font-semibold text-gray-400 py-2">
            {day}
          </div>
        ))}

        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}

        {days.map((day) => {
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded text-sm font-medium ${
                isToday
                  ? "bg-os-primary text-white"
                  : "bg-os-hover hover:bg-os-hover/80"
              } transition-colors cursor-pointer`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Upcoming */}
      <div className="mt-6 bg-os-hover rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Upcoming Events</h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p>• Team sync - Today at 3 PM</p>
          <p>• Aur's review - Tomorrow at 2 PM</p>
        </div>
      </div>
    </div>
  );
}
