"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, Zap, Brain, Rocket, Code2 } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Landing/Navbar";

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 300], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <div ref={containerRef} className="bg-black text-white overflow-x-hidden">
      <Navbar />
      <HeroSection y1={y1} y2={y2} />
      <FeaturesSection />
      <StatsSection />
      <TechSection />
      <CTASection />
      <Footer />
    </div>
  );
}

function HeroSection({ y1, y2 }: any) {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0">
        <motion.div style={{ y: y1 }}>
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        </motion.div>
        <motion.div style={{ y: y2 }}>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        </motion.div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              HYPER TEXT
            </span>
            <br />
            <span className="text-white">PARALLAX REVEAL</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="text-xl md:text-2xl text-slate-400 mb-8 max-w-2xl mx-auto">
            עמוד חי, תגובתי, ריאקטיבי. אנימציות משתנות עם כל גלילה.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/contact">
              <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-blue-500/50 transition">
                צור קשר עכשיו
              </button>
            </Link>
            <button className="px-8 py-4 border border-slate-500 rounded-lg font-bold text-lg hover:border-slate-300 transition">
              למד עוד
            </button>
          </div>
        </motion.div>
      </div>

      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
          <ArrowDown className="w-8 h-8 text-blue-400" />
        </div>
      </motion.div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: <Brain className="w-12 h-12" />,
      title: "בינה מיוחדת",
      description: "אלגוריתמים חכמים שלומדים ומשתנים עם הזמן",
    },
    {
      icon: <Zap className="w-12 h-12" />,
      title: "מהירות ברק",
      description: "ביצועים אופטימליים בכל תנאי רשת",
    },
    {
      icon: <Rocket className="w-12 h-12" />,
      title: "שיגור מיידי",
      description: "זמן עלייה שניות בלבד, לא דקות",
    },
    {
      icon: <Code2 className="w-12 h-12" />,
      title: "קוד חדש",
      description: "טכנולוגיה מתקדמת ועתידנית",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-black mb-16 text-center">
            תכונות <span className="text-blue-400">מובילות</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-blue-500 transition">
                <div className="text-blue-400 mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { label: "משתמשים פעילים", value: "50K+" },
    { label: "מדינות", value: "150+" },
    { label: "זמן תגובה", value: "<100ms" },
    { label: "אחוזי העלות", value: "99.9%" },
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black via-slate-900 to-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-center">
                <h3 className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text mb-2">
                  {stat.value}
                </h3>
                <p className="text-slate-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechSection() {
  const technologies = [
    { name: "Next.js", color: "from-white to-slate-400" },
    { name: "React", color: "from-blue-400 to-cyan-400" },
    { name: "Framer Motion", color: "from-purple-400 to-pink-400" },
    { name: "Tailwind", color: "from-cyan-400 to-blue-400" },
    { name: "TypeScript", color: "from-blue-600 to-blue-400" },
    { name: "Resend", color: "from-orange-400 to-red-400" },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-black mb-16 text-center">
            טכנולוגיות <span className="text-purple-400">מתקדמות</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, rotateZ: 2 }}
            >
              <div className={`p-6 rounded-xl bg-gradient-to-br ${tech.color} opacity-10 border border-current backdrop-blur-sm cursor-pointer`}>
                <p className="font-bold text-lg text-white text-center">{tech.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-4 relative">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            מוכנים להתחיל?
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <p className="text-xl text-slate-400 mb-8">
            צרו קשר אתנו היום וגלו איך אנחנו יכולים לעזור לכם להשיג יעדים חדשים.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div>
            <Link href="/contact">
              <button className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition">
                צור קשר עכשיו
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-bold mb-4">Product</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="#" className="hover:text-white transition">Features</Link></li>
              <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
              <li><Link href="#" className="hover:text-white transition">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="#" className="hover:text-white transition">About</Link></li>
              <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="#" className="hover:text-white transition">Privacy</Link></li>
              <li><Link href="#" className="hover:text-white transition">Terms</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Social</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li><Link href="#" className="hover:text-white transition">Twitter</Link></li>
              <li><Link href="#" className="hover:text-white transition">GitHub</Link></li>
              <li><Link href="#" className="hover:text-white transition">LinkedIn</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
          <p>© 2026 Agent Hub Guru. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
