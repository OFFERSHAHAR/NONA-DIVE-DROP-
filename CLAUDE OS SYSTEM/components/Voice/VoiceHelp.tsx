"use client";

import React, { useState, useMemo } from "react";
import { X, Search, Keyboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Command {
  id: string;
  name: string;
  command: string;
  description: string;
  descriptionHe: string;
  examples: string[];
  examplesHe: string[];
  category: "navigation" | "task" | "system" | "collaboration" | "search";
}

const COMMANDS: Command[] = [
  {
    id: "open-app",
    name: "Open App",
    command: "open [app name]",
    description: "Open any application",
    descriptionHe: "פתח כל יישום",
    examples: ["open dashboard", "open tasks", "open calendar"],
    examplesHe: ["פתח דשבורד", "פתח משימות", "פתח לוח שנה"],
    category: "navigation",
  },
  {
    id: "create-task",
    name: "Create Task",
    command: "create task [title]",
    description: "Create a new task",
    descriptionHe: "צור משימה חדשה",
    examples: ["create task buy milk", "create task call mom"],
    examplesHe: ["צור משימה קנה חלב", "צור משימה התקשר לאמא"],
    category: "task",
  },
  {
    id: "send-message",
    name: "Send Message",
    command: "send message to [user]",
    description: "Send a message to a user",
    descriptionHe: "שלח הודעה למשתמש",
    examples: ["send message to john", "send hello to alice"],
    examplesHe: ["שלח הודעה ליוחנן", "שלח שלום לאליס"],
    category: "collaboration",
  },
  {
    id: "schedule-event",
    name: "Schedule Event",
    command: "schedule [event] at [time]",
    description: "Schedule an event for a specific time",
    descriptionHe: "תזמן אירוע לשעה מסוימת",
    examples: ["schedule meeting at 3pm", "schedule call tomorrow"],
    examplesHe: ["תזמן פגישה בשעה 3 אחר הצהריים", "תזמן שיחה מחר"],
    category: "task",
  },
  {
    id: "search",
    name: "Search",
    command: "search for [query]",
    description: "Search your workspace",
    descriptionHe: "חפש בחלל העבודה שלך",
    examples: ["search for john", "search for project alpha"],
    examplesHe: ["חפש אחר יוחנן", "חפש פרויקט אלפא"],
    category: "search",
  },
  {
    id: "lock-screen",
    name: "Lock Screen",
    command: "lock screen",
    description: "Lock your screen",
    descriptionHe: "נעל את המסך שלך",
    examples: ["lock screen", "lock"],
    examplesHe: ["נעל מסך", "נעל"],
    category: "system",
  },
  {
    id: "list-tasks",
    name: "List Tasks",
    command: "list tasks",
    description: "Show all your tasks",
    descriptionHe: "הצג את כל המשימות שלך",
    examples: ["list tasks", "show tasks", "my tasks"],
    examplesHe: ["תן רשימת משימות", "הצג משימות", "המשימות שלי"],
    category: "task",
  },
  {
    id: "clear-screen",
    name: "Clear Screen",
    command: "clear screen",
    description: "Close all windows",
    descriptionHe: "סגור את כל החלונות",
    examples: ["clear screen", "clear all"],
    examplesHe: ["נקה מסך", "נקה הכל"],
    category: "system",
  },
  {
    id: "help",
    name: "Help",
    command: "help",
    description: "Show available commands",
    descriptionHe: "הצג פקודות זמינות",
    examples: ["help", "show help", "what can i do"],
    examplesHe: ["עזרה", "הצג עזרה", "מה אני יכול לעשות"],
    category: "system",
  },
  {
    id: "weather",
    name: "Weather",
    command: "what is the weather",
    description: "Get current weather",
    descriptionHe: "קבל את מזג האוויר הנוכחי",
    examples: ["what is the weather", "weather today"],
    examplesHe: ["מה מזג האוויר", "מזג אוויר היום"],
    category: "search",
  },
];

interface VoiceHelpProps {
  isOpen: boolean;
  onClose: () => void;
  language?: "en" | "he";
}

export const VoiceHelp: React.FC<VoiceHelpProps> = ({
  isOpen,
  onClose,
  language = "en",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "he">(language);

  const categories = [
    { id: "navigation", label: "Navigation", labelHe: "ניווט" },
    { id: "task", label: "Tasks", labelHe: "משימות" },
    { id: "system", label: "System", labelHe: "מערכת" },
    { id: "collaboration", label: "Collaboration", labelHe: "שיתוף פעולה" },
    { id: "search", label: "Search", labelHe: "חיפוש" },
  ];

  const filteredCommands = useMemo(() => {
    return COMMANDS.filter((cmd) => {
      const matchesSearch =
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || cmd.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const getLabel = (en: string, he: string) =>
    selectedLanguage === "he" ? he : en;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-os-panel border border-os-border rounded-os-lg shadow-2xl z-50 flex flex-col overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-os-border bg-gradient-to-r from-os-primary/10 to-transparent">
              <div className="flex items-center gap-3">
                <Keyboard className="w-6 h-6 text-os-primary" />
                <h2 className="text-lg font-semibold text-white">
                  {getLabel("Voice Commands", "פקודות קוליות")}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Toggle */}
                <div className="flex gap-1 bg-os-hover rounded-os-md p-1">
                  <button
                    onClick={() => setSelectedLanguage("en")}
                    className={`px-3 py-1 rounded transition-all text-sm ${
                      selectedLanguage === "en"
                        ? "bg-os-primary text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setSelectedLanguage("he")}
                    className={`px-3 py-1 rounded transition-all text-sm ${
                      selectedLanguage === "he"
                        ? "bg-os-primary text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    ע
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-os-hover rounded-os-md transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-os-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={getLabel("Search commands...", "חפש פקודות...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-os-hover border border-os-border rounded-os-md pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-os-primary focus:ring-1 focus:ring-os-primary"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="px-4 pt-4 flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-os-md text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? "bg-os-primary text-white"
                    : "bg-os-hover text-gray-300 hover:bg-os-hover-strong"
                }`}
              >
                {getLabel("All", "הכל")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.id ? null : cat.id
                    )
                  }
                  className={`px-3 py-1.5 rounded-os-md text-sm font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-os-primary text-white"
                      : "bg-os-hover text-gray-300 hover:bg-os-hover-strong"
                  }`}
                >
                  {getLabel(cat.label, cat.labelHe)}
                </button>
              ))}
            </div>

            {/* Commands List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd) => (
                  <motion.div
                    key={cmd.id}
                    className="p-4 bg-os-hover border border-os-border rounded-os-md hover:border-os-primary/50 transition-all"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{cmd.name}</h3>
                        <code className="text-xs bg-black/30 px-2 py-1 rounded text-os-primary-light mt-1 inline-block font-mono">
                          {cmd.command}
                        </code>
                      </div>
                      <span className="text-xs bg-os-primary/20 text-os-primary-light px-2 py-1 rounded-os-sm">
                        {cmd.category}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 mb-2">
                      {selectedLanguage === "he"
                        ? cmd.descriptionHe
                        : cmd.description}
                    </p>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        {getLabel("Examples:", "דוגמאות:")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedLanguage === "he"
                          ? cmd.examplesHe
                          : cmd.examples
                        ).map((example, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-black/40 text-gray-300 px-2.5 py-1 rounded-os-sm italic"
                          >
                            "{example}"
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {getLabel("No commands found", "לא נמצאו פקודות")}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-os-border bg-gradient-to-r from-os-primary/5 to-transparent text-xs text-gray-400">
              {getLabel("💡 Tip: Press Alt+V to activate voice control or hold Spacebar", "💡 טיפ: לחץ Alt+V כדי להפעיל בקרה קולית או החזק Spacebar")}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
