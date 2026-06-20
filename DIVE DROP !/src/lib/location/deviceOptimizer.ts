/**
 * Device Optimizer
 * Manages battery and network-aware location tracking adjustments
 */

export interface DeviceMetrics {
  batteryLevel: number; // 0-100
  isCharging: boolean;
  lowPowerMode: boolean;
  networkType: 'wifi' | '4g' | '5g' | 'cellular' | 'unknown';
  deviceMemory?: number; // GB
  cpuUsage?: number; // 0-100
}

export class DeviceOptimizer {
  /**
   * Determine optimal location update interval based on device state
   */
  static getOptimalUpdateInterval(
    baseInterval: number,
    metrics: DeviceMetrics
  ): number {
    let interval = baseInterval;

    // Increase interval on poor network
    if (metrics.networkType === 'cellular' || metrics.networkType === 'unknown') {
      interval *= 1.5; // 50% longer
    }

    // Increase interval on low battery
    if (metrics.batteryLevel < 20) {
      interval *= 2; // 2x longer
    } else if (metrics.batteryLevel < 10) {
      interval *= 3; // 3x longer
    }

    // Decrease interval when charging
    if (metrics.isCharging) {
      interval *= 0.7; // 30% shorter
    }

    // Increase on low power mode
    if (metrics.lowPowerMode) {
      interval *= 2; // 2x longer
    }

    return Math.round(interval);
  }

  /**
   * Determine if high accuracy is feasible
   */
  static shouldUseHighAccuracy(metrics: DeviceMetrics): boolean {
    // Don't use high accuracy on low battery
    if (metrics.batteryLevel < 15) return false;

    // Don't use high accuracy on cellular only
    if (
      metrics.networkType === 'cellular' ||
      metrics.networkType === 'unknown'
    ) {
      return false;
    }

    // High accuracy OK if charging or decent battery
    return metrics.isCharging || metrics.batteryLevel > 30;
  }

  /**
   * Calculate battery impact estimate
   */
  static estimateBatteryImpact(
    updateInterval: number,
    duration: number,
    highAccuracy: boolean
  ): {
    batteryUsage: number; // percentage
    costPerHour: number; // percentage
  } {
    // Base consumption rates (% per hour)
    const highAccuracyRate = 10; // 10% per hour
    const lowAccuracyRate = 3; // 3% per hour

    const rate = highAccuracy ? highAccuracyRate : lowAccuracyRate;

    // Adjust by update frequency
    // More frequent = more battery drain
    const frequencyMultiplier = 10000 / Math.max(updateInterval, 1000);

    const costPerHour = rate * frequencyMultiplier;
    const batteryUsage = (costPerHour * duration) / 3600000;

    return {
      batteryUsage,
      costPerHour,
    };
  }

  /**
   * Get device metrics
   */
  static async getDeviceMetrics(): Promise<DeviceMetrics> {
    const batteryInfo = await this.getBatteryInfo();
    const networkInfo = this.getNetworkInfo();

    return {
      batteryLevel: batteryInfo.level,
      isCharging: batteryInfo.isCharging,
      lowPowerMode: batteryInfo.lowPowerMode,
      networkType: networkInfo,
      deviceMemory: this.getDeviceMemory(),
    };
  }

  /**
   * Get battery information
   */
  private static async getBatteryInfo(): Promise<{
    level: number;
    isCharging: boolean;
    lowPowerMode: boolean;
  }> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          isCharging: battery.charging,
          lowPowerMode: false,
        };
      }
    } catch (e) {
      // Battery API not available
    }

    // Fallback
    return {
      level: 50,
      isCharging: false,
      lowPowerMode: false,
    };
  }

  /**
   * Get network information
   */
  private static getNetworkInfo(): DeviceMetrics['networkType'] {
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const type = connection?.type;

        if (type === 'wifi' || type === 'ethernet') {
          return 'wifi';
        }
        if (type === 'cellular') {
          return 'cellular';
        }

        // Use effective type for fallback
        const effectiveType = connection?.effectiveType;
        if (effectiveType === '4g') return '4g';
        if (effectiveType === '5g') return '5g';
        if (effectiveType === '3g' || effectiveType === '2g') return 'cellular';
      }
    } catch (e) {
      // Connection API not available
    }

    return 'unknown';
  }

  /**
   * Get device memory (if available)
   */
  private static getDeviceMemory(): number | undefined {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory;
    }
    return undefined;
  }

  /**
   * Monitor network changes
   */
  static onNetworkChange(callback: (type: DeviceMetrics['networkType']) => void): () => void {
    const handler = () => {
      const networkType = this.getNetworkInfo();
      callback(networkType);
    };

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', handler);

      return () => {
        connection.removeEventListener('change', handler);
      };
    }

    return () => {};
  }

  /**
   * Monitor battery changes
   */
  static onBatteryChange(
    callback: (battery: { level: number; isCharging: boolean }) => void
  ): () => void {
    (async () => {
      try {
        if ('getBattery' in navigator) {
          const battery = await (navigator as any).getBattery();

          const handler = () => {
            callback({
              level: Math.round(battery.level * 100),
              isCharging: battery.charging,
            });
          };

          battery.addEventListener('levelchange', handler);
          battery.addEventListener('chargingchange', handler);

          return () => {
            battery.removeEventListener('levelchange', handler);
            battery.removeEventListener('chargingchange', handler);
          };
        }
      } catch (e) {
        // Battery API not available
      }
    })();

    return () => {};
  }

  /**
   * Get recommended config for current device
   */
  static async getRecommendedConfig() {
    const metrics = await this.getDeviceMetrics();

    return {
      highAccuracy: this.shouldUseHighAccuracy(metrics),
      driverUpdateInterval: this.getOptimalUpdateInterval(10000, metrics),
      passengerUpdateInterval: this.getOptimalUpdateInterval(5000, metrics),
      metrics,
    };
  }
}

/**
 * Battery-aware configuration preset
 */
export const BATTERY_PRESETS = {
  // Device is charging and has good battery
  charging: {
    highAccuracy: true,
    driverUpdateInterval: 5000, // More frequent
    passengerUpdateInterval: 3000,
    timeout: 10000,
  },

  // Device has good battery (>50%)
  good: {
    highAccuracy: true,
    driverUpdateInterval: 10000,
    passengerUpdateInterval: 5000,
    timeout: 10000,
  },

  // Device has moderate battery (20-50%)
  moderate: {
    highAccuracy: true,
    driverUpdateInterval: 15000,
    passengerUpdateInterval: 10000,
    timeout: 8000,
  },

  // Device has low battery (<20%)
  low: {
    highAccuracy: false, // Reduce accuracy to save power
    driverUpdateInterval: 30000, // Much less frequent
    passengerUpdateInterval: 20000,
    timeout: 5000,
  },

  // Device has critical battery (<10%)
  critical: {
    highAccuracy: false,
    driverUpdateInterval: 60000, // Every minute
    passengerUpdateInterval: 60000,
    timeout: 3000,
  },
};

/**
 * Network-aware configuration preset
 */
export const NETWORK_PRESETS = {
  // High-speed, low-latency (WiFi, 5G)
  fast: {
    highAccuracy: true,
    driverUpdateInterval: 5000,
    passengerUpdateInterval: 3000,
    timeout: 10000,
  },

  // Medium speed (4G)
  medium: {
    highAccuracy: true,
    driverUpdateInterval: 10000,
    passengerUpdateInterval: 5000,
    timeout: 8000,
  },

  // Slow connection (3G, poor signal)
  slow: {
    highAccuracy: false,
    driverUpdateInterval: 20000,
    passengerUpdateInterval: 15000,
    timeout: 5000,
  },

  // Offline mode (queue and sync when online)
  offline: {
    highAccuracy: false,
    driverUpdateInterval: 60000, // Cache locally
    passengerUpdateInterval: 60000,
    timeout: 2000,
  },
};
