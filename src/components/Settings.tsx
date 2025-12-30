import { useState } from "react";
import { Plus, X, Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsProps {
  jwtHeaders: string[];
  tokenPrefixes: string[];
  sessionRetentionHours: number;
  onSave: (settings: { jwtHeaders: string[]; tokenPrefixes: string[]; sessionRetentionHours: number }) => void;
}

const RETENTION_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "1 week" },
];

export function Settings({ jwtHeaders, tokenPrefixes, sessionRetentionHours, onSave }: SettingsProps) {
  const [headers, setHeaders] = useState<string[]>(jwtHeaders);
  const [prefixes, setPrefixes] = useState<string[]>(tokenPrefixes);
  const [retentionHours, setRetentionHours] = useState(sessionRetentionHours);
  const [newHeader, setNewHeader] = useState("");
  const [newPrefix, setNewPrefix] = useState("");

  const addHeader = () => {
    if (newHeader.trim() && !headers.includes(newHeader.trim())) {
      setHeaders([...headers, newHeader.trim()]);
      setNewHeader("");
    }
  };

  const removeHeader = (header: string) => {
    setHeaders(headers.filter((h) => h !== header));
  };

  const addPrefix = () => {
    if (newPrefix.trim() && !prefixes.includes(newPrefix.trim())) {
      setPrefixes([...prefixes, newPrefix.trim()]);
      setNewPrefix("");
    }
  };

  const removePrefix = (prefix: string) => {
    setPrefixes(prefixes.filter((p) => p !== prefix));
  };

  const handleSave = () => {
    onSave({ jwtHeaders: headers, tokenPrefixes: prefixes, sessionRetentionHours: retentionHours });
  };

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-6 max-w-md">
        <div>
          <h3 className="text-lg font-semibold mb-2">Session Retention</h3>
          <p className="text-sm text-muted-foreground mb-4">
            How long to keep captured request sessions. Older sessions will be automatically cleaned up.
          </p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <select
              value={retentionHours}
              onChange={(e) => setRetentionHours(Number(e.target.value))}
              className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            >
              {RETENTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">JWT Header Configuration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure which HTTP headers should be scanned for JWT tokens.
          </p>

          <div className="space-y-2">
            {headers.map((header) => (
              <div
                key={header}
                className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
              >
                <span className="font-mono text-sm">{header}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeHeader(header)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newHeader}
              onChange={(e) => setNewHeader(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHeader()}
              placeholder="Header name (e.g., X-Auth-Token)"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            />
            <Button variant="outline" size="icon" onClick={addHeader}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Token Prefixes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Prefixes to strip when extracting JWT tokens (e.g., "Bearer", "Token").
          </p>

          <div className="space-y-2">
            {prefixes.map((prefix) => (
              <div
                key={prefix}
                className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
              >
                <span className="font-mono text-sm">{prefix}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removePrefix(prefix)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPrefix()}
              placeholder="Prefix (e.g., ApiKey)"
              className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
            />
            <Button variant="outline" size="icon" onClick={addPrefix}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </ScrollArea>
  );
}
