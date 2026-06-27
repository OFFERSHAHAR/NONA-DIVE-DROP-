"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black">
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AGENT HUB
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8">
          {["תכונות", "טכנולוגיה", "צור קשר"].map((item) => (
            <Link key={item} href={`#${item}`}>
              <motion.span
                whileHover={{ color: "#60a5fa" }}
            >
              <span className="cursor-pointer transition text-slate-300">{item}</span>
            </motion.span>
            </Link>
          ))}
          <Link href="/contact">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold">
                התחל
              </button>
            </motion.button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden"
        >
          {isOpen ? <X /> : <Menu />}
        </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: isOpen ? "auto" : 0 }}
      >
        <div className="md:hidden overflow-hidden bg-black border-t border-slate-800">
          <div className="flex flex-col gap-4 p-4">
            {["תכונות", "טכנולוגיה", "צור קשר"].map((item) => (
              <Link
                key={item}
                href={`#${item}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="block cursor-pointer">{item}</span>
              </Link>
            ))}
            <Link href="/contact">
              <button className="w-full px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold">
                התחל
              </button>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
