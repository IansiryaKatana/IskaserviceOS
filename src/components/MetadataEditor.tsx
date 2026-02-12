import { useState, useEffect } from "react";
import { getMetadataSchema, applyMetadataDefaults, validateMetadata, type MetadataSchema } from "@/lib/metadata-schemas";

interface MetadataEditorProps {
  businessType: string;
  metadata: any;
  onChange: (metadata: any) => void;
  className?: string;
}

export function MetadataEditor({ businessType, metadata, onChange, className = "" }: MetadataEditorProps) {
  const schema = getMetadataSchema(businessType);
  const [localMetadata, setLocalMetadata] = useState<any>(() => 
    applyMetadataDefaults(metadata || {}, schema)
  );

  useEffect(() => {
    const updated = applyMetadataDefaults(metadata || {}, schema);
    setLocalMetadata(updated);
  }, [businessType, metadata, schema]);

  const handleChange = (key: string, value: any) => {
    const updated = { ...localMetadata, [key]: value };
    setLocalMetadata(updated);
    onChange(updated);
  };

  if (Object.keys(schema).length === 0) {
    return (
      <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
        <p className="text-xs text-muted-foreground">No metadata schema defined for {businessType}.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <p className="text-[11px] font-medium text-muted-foreground">Metadata Configuration</p>
      {Object.entries(schema).map(([key, field]) => {
        const value = localMetadata[key];

        return (
          <div key={key}>
            <label className="text-[11px] font-medium text-muted-foreground">
              {field.label} {!field.optional && <span className="text-destructive">*</span>}
            </label>
            {field.type === "boolean" && (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value || false}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary accent-primary"
                />
                <span className="text-xs text-foreground">{value ? "Yes" : "No"}</span>
              </div>
            )}
            {field.type === "string" && (
              <input
                type="text"
                value={value || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
            )}
            {field.type === "number" && (
              <input
                type="number"
                value={value || ""}
                onChange={(e) => handleChange(key, e.target.value ? parseFloat(e.target.value) : undefined)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              />
            )}
            {field.type === "enum" && field.enum && (
              <select
                value={value || ""}
                onChange={(e) => handleChange(key, e.target.value || undefined)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
              >
                <option value="">Select...</option>
                {field.enum.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {field.type === "array" && (
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add item..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value) {
                        e.preventDefault();
                        const current = Array.isArray(value) ? value : [];
                        handleChange(key, [...current, e.currentTarget.value]);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                  />
                </div>
                {Array.isArray(value) && value.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {value.map((item: string, idx: number) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                      >
                        {item}
                        <button
                          onClick={() => {
                            const updated = [...value];
                            updated.splice(idx, 1);
                            handleChange(key, updated.length > 0 ? updated : undefined);
                          }}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
