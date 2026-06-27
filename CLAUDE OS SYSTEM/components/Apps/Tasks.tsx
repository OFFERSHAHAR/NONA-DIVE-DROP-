"use client";

import { CheckCircle2, Circle, Plus } from "lucide-react";
import { useState } from "react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Setup Obsidian integration",
      completed: true,
      priority: "high",
    },
    {
      id: "2",
      title: "Build frontend OS components",
      completed: false,
      priority: "high",
    },
    { id: "3", title: "Setup Supabase database", completed: false, priority: "high" },
    {
      id: "4",
      title: "Create real-time sync",
      completed: false,
      priority: "medium",
    },
    {
      id: "5",
      title: "Add authentication",
      completed: false,
      priority: "medium",
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      default:
        return "text-green-400";
    }
  };

  return (
    <div className="p-6 h-full bg-gradient-to-br from-os-bg to-os-panel">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button className="p-2 bg-os-primary hover:bg-os-primary/80 rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-os-hover border border-os-hover rounded-lg p-3 flex items-start gap-3 hover:border-os-primary transition-colors group cursor-pointer"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className="mt-1 text-gray-400 group-hover:text-os-primary transition-colors"
            >
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </button>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  task.completed ? "line-through text-gray-500" : ""
                }`}
              >
                {task.title}
              </p>
            </div>
            <span className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
              {task.priority.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
