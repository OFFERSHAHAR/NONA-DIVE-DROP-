"use client";

import { Activity, TrendingUp, Users, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter, Button, Badge } from "@/components/UI";
import { useState } from "react";

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down" | "stable";
  color: "primary" | "accent" | "success" | "warning";
}

export function DashboardEnhanced() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");

  const stats: StatCard[] = [
    {
      title: "Total Users",
      value: "2,847",
      change: 12.5,
      icon: <Users className="w-5 h-5" />,
      trend: "up",
      color: "primary",
    },
    {
      title: "System Health",
      value: "98.5%",
      change: 2.1,
      icon: <Activity className="w-5 h-5" />,
      trend: "up",
      color: "success",
    },
    {
      title: "Active Sessions",
      value: "342",
      change: -3.2,
      icon: <Zap className="w-5 h-5" />,
      trend: "down",
      color: "accent",
    },
    {
      title: "Avg Response Time",
      value: "142ms",
      change: 0.8,
      icon: <TrendingUp className="w-5 h-5" />,
      trend: "stable",
      color: "warning",
    },
  ];

  const colorMap = {
    primary: "bg-os-primary/10 text-os-primary",
    accent: "bg-os-accent/10 text-os-accent",
    success: "bg-os-success/10 text-os-success",
    warning: "bg-os-warning/10 text-os-warning",
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
          <p className="text-gray-400">Monitor your system performance and activity</p>
        </div>
        <div className="flex gap-2">
          {(["day", "week", "month"] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} variant="default" hover interactive>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-os-lg ${colorMap[stat.color]}`}>
                  {stat.icon}
                </div>
                <Badge
                  variant={stat.trend === "up" ? "success" : stat.trend === "down" ? "danger" : "info"}
                  size="sm"
                >
                  {stat.trend === "up" && "↑"}
                  {stat.trend === "down" && "↓"}
                  {stat.change}%
                </Badge>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <Card variant="elevated" className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-os-primary" />
              Recent Activity
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: "User login", time: "2 minutes ago", status: "success" },
                { action: "System backup completed", time: "15 minutes ago", status: "success" },
                { action: "Configuration updated", time: "1 hour ago", status: "info" },
                { action: "Database maintenance", time: "3 hours ago", status: "warning" },
              ].map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-os-md hover:bg-os-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {activity.status === "success" && (
                      <CheckCircle2 className="w-4 h-4 text-os-success flex-shrink-0" />
                    )}
                    {activity.status === "warning" && (
                      <AlertCircle className="w-4 h-4 text-os-warning flex-shrink-0" />
                    )}
                    {activity.status === "info" && (
                      <div className="w-4 h-4 rounded-full bg-os-info flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                  <Badge variant={activity.status as "success" | "warning" | "info"} size="sm">
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card variant="glass">
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-os-accent" />
              Quick Actions
            </h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="primary" className="w-full justify-start">
              Run System Check
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              View Reports
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Configure Settings
            </Button>
            <Button variant="accent" className="w-full justify-start">
              Export Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card variant="default" className="border-l-4 border-l-os-warning">
        <CardContent className="flex items-start gap-4 py-4">
          <AlertCircle className="w-5 h-5 text-os-warning flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">System Performance Advisory</h3>
            <p className="text-sm text-gray-400">
              CPU usage has been above 80% for the past hour. Consider optimizing resource allocation or scaling infrastructure.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Investigate
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
