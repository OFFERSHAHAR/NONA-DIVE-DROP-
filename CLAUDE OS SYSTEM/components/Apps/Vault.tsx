"use client";

import { FileText, FolderOpen, Plus, Search } from "lucide-react";
import { useState } from "react";

export function Vault() {
  const [searchQuery, setSearchQuery] = useState("");

  const notes = [
    {
      id: "1",
      title: "JARVIS ZERO OS - Architecture",
      date: "Today",
      tags: ["system", "design"],
    },
    {
      id: "2",
      title: "Obsidian Integration Plan",
      date: "Yesterday",
      tags: ["integration", "tech"],
    },
    {
      id: "3",
      title: "Database Schema",
      date: "2 days ago",
      tags: ["database", "schema"],
    },
    {
      id: "4",
      title: "Frontend Components",
      date: "3 days ago",
      tags: ["frontend", "react"],
    },
  ];

  return (
    <div className="p-6 h-full bg-gradient-to-br from-os-bg to-os-panel flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vault</h1>
        <button className="p-2 bg-os-primary hover:bg-os-primary/80 rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-os-hover border border-os-hover rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-os-primary transition-colors"
        />
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-os-hover border border-os-hover rounded-lg p-3 hover:border-os-primary transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 mt-1 text-os-accent" />
              <div className="flex-1">
                <p className="text-sm font-medium group-hover:text-os-primary transition-colors">
                  {note.title}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">{note.date}</span>
                  <div className="flex gap-1">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-os-primary/20 text-os-primary px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Folders */}
      <div className="mt-6 pt-4 border-t border-os-hover">
        <h2 className="text-xs font-semibold text-gray-400 mb-2">FOLDERS</h2>
        <div className="space-y-1">
          {["Projects", "Ideas", "Archive"].map((folder) => (
            <div
              key={folder}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-os-hover rounded cursor-pointer transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              {folder}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
