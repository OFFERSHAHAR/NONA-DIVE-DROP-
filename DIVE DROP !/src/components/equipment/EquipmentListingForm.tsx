'use client';

import React, { useState } from 'react';
import type { CreateEquipmentListingRequest } from '@/types/equipment';
import { equipmentTypeSchema, equipmentConditionSchema } from '@/lib/equipment/schemas';

interface EquipmentListingFormProps {
  onSubmit: (data: CreateEquipmentListingRequest) => Promise<void>;
  isLoading?: boolean;
}

export function EquipmentListingForm({
  onSubmit,
  isLoading = false,
}: EquipmentListingFormProps) {
  const [formData, setFormData] = useState<CreateEquipmentListingRequest>({
    equipment_type: 'fins',
    description: '',
    condition: 'good',
    available_from: new Date().toISOString(),
    available_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    location_name: '',
    location_lat: 32.087,
    location_lng: 34.767,
    rental_price_per_day: 5000,
    photo_urls: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      await onSubmit(formData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create listing';
      setErrors({ submit: errorMsg });
    }
  };

  const handleLocationClick = async () => {
    // Request geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude,
          }));
        },
        (error) => {
          setErrors((prev) => ({
            ...prev,
            location: `Failed to get location: ${error.message}`,
          }));
        }
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Equipment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Equipment Type
        </label>
        <select
          value={formData.equipment_type}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              equipment_type: e.target.value as any,
            }))
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {equipmentTypeSchema.options.map((type) => (
            <option key={type} value={type}>
              {type.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Brand & Model */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand
          </label>
          <input
            type="text"
            value={formData.brand || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, brand: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <input
            type="text"
            value={formData.model || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, model: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Describe the equipment condition, features, and any notes"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Condition & Year */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Condition *
          </label>
          <select
            value={formData.condition}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, condition: e.target.value as any }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {equipmentConditionSchema.options.map((condition) => (
              <option key={condition} value={condition}>
                {condition.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year Purchased
          </label>
          <input
            type="number"
            value={formData.year_purchased || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                year_purchased: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            min={1950}
            max={new Date().getFullYear()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Size
        </label>
        <input
          type="text"
          value={formData.size || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, size: e.target.value }))
          }
          placeholder="e.g., M, Large, 50L"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Availability */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available From *
          </label>
          <input
            type="datetime-local"
            value={formData.available_from.slice(0, 16)}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                available_from: new Date(e.target.value).toISOString(),
              }))
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Until
          </label>
          <input
            type="datetime-local"
            value={formData.available_until ? formData.available_until.slice(0, 16) : ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                available_until: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Location *
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={formData.location_name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location_name: e.target.value }))
            }
            placeholder="e.g., Tel Aviv, Israel"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleLocationClick}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            📍 Use Current Location
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rental Price Per Day (₪) *
          </label>
          <input
            type="number"
            value={formData.rental_price_per_day / 100}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                rental_price_per_day: parseInt(e.target.value) * 100,
              }))
            }
            min={1}
            step={0.01}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Fee (₪)
          </label>
          <input
            type="number"
            value={formData.delivery_fee ? formData.delivery_fee / 100 : ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                delivery_fee: e.target.value ? parseInt(e.target.value) * 100 : undefined,
              }))
            }
            min={0}
            step={0.01}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Rental Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Rental Days
          </label>
          <input
            type="number"
            value={formData.min_rental_days || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                min_rental_days: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            min={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Rental Days
          </label>
          <input
            type="number"
            value={formData.max_rental_days || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                max_rental_days: e.target.value ? parseInt(e.target.value) : undefined,
              }))
            }
            min={1}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      >
        {isLoading ? 'Creating Listing...' : 'Create Listing'}
      </button>
    </form>
  );
}
