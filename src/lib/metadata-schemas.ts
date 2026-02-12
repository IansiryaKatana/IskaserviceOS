/**
 * Metadata schemas for different business types
 * Used to validate and provide UI hints for metadata fields
 */

export type MetadataFieldType = 'boolean' | 'string' | 'number' | 'array' | 'enum';

export interface MetadataField {
  type: MetadataFieldType;
  label: string;
  default?: any;
  optional?: boolean;
  enum?: string[];
  items?: MetadataFieldType;
}

export interface MetadataSchema {
  [key: string]: MetadataField;
}

export const BUSINESS_METADATA_SCHEMAS: Record<string, MetadataSchema> = {
  mechanic: {
    requires_bay: {
      type: 'boolean',
      label: 'Requires Service Bay',
      default: false,
    },
    requires_lift: {
      type: 'boolean',
      label: 'Requires Lift',
      default: false,
    },
    bay_number: {
      type: 'number',
      label: 'Bay Number',
      optional: true,
    },
    max_vehicle_size: {
      type: 'enum',
      label: 'Max Vehicle Size',
      enum: ['small', 'medium', 'large'],
      optional: true,
    },
  },
  spa: {
    requires_room: {
      type: 'boolean',
      label: 'Requires Private Room',
      default: true,
    },
    gender_preference: {
      type: 'boolean',
      label: 'Gender-Specific Service',
      default: false,
    },
    room_type: {
      type: 'enum',
      label: 'Room Type',
      enum: ['single', 'couples'],
      default: 'single',
    },
  },
  clinic: {
    requires_room: {
      type: 'boolean',
      label: 'Requires Room',
      default: true,
    },
    room_type: {
      type: 'enum',
      label: 'Room Type',
      enum: ['consultation', 'examination', 'procedure'],
      default: 'consultation',
    },
    equipment_required: {
      type: 'array',
      label: 'Equipment Required',
      items: 'string',
      optional: true,
    },
  },
  fitness: {
    max_capacity: {
      type: 'number',
      label: 'Max Capacity',
      default: 20,
    },
    equipment_required: {
      type: 'array',
      label: 'Equipment Required',
      items: 'string',
      optional: true,
    },
    class_type: {
      type: 'enum',
      label: 'Class Type',
      enum: ['group', 'personal', 'both'],
      default: 'group',
    },
  },
  salon: {
    requires_station: {
      type: 'boolean',
      label: 'Requires Station',
      default: true,
    },
    station_type: {
      type: 'enum',
      label: 'Station Type',
      enum: ['barber', 'stylist', 'color'],
      optional: true,
    },
  },
};

/**
 * Get metadata schema for a business type
 */
export function getMetadataSchema(businessType: string): MetadataSchema {
  return BUSINESS_METADATA_SCHEMAS[businessType] || {};
}

/**
 * Validate metadata against schema
 */
export function validateMetadata(metadata: any, schema: MetadataSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, field] of Object.entries(schema)) {
    const value = metadata?.[key];

    // Check required fields
    if (!field.optional && (value === undefined || value === null)) {
      if (field.default !== undefined) {
        continue; // Has default, so it's okay
      }
      errors.push(`${field.label} is required`);
      continue;
    }

    // Type validation
    if (value !== undefined && value !== null) {
      switch (field.type) {
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${field.label} must be a boolean`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push(`${field.label} must be a number`);
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${field.label} must be a string`);
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`${field.label} must be an array`);
          } else if (field.items === 'string' && value.some((v) => typeof v !== 'string')) {
            errors.push(`${field.label} must be an array of strings`);
          }
          break;
        case 'enum':
          if (!field.enum?.includes(value)) {
            errors.push(`${field.label} must be one of: ${field.enum?.join(', ')}`);
          }
          break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Apply default values to metadata
 */
export function applyMetadataDefaults(metadata: any, schema: MetadataSchema): any {
  const result = { ...metadata };

  for (const [key, field] of Object.entries(schema)) {
    if (result[key] === undefined && field.default !== undefined) {
      result[key] = field.default;
    }
  }

  return result;
}
