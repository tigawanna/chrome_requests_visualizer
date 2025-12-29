import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SettingsProps {
  jwtHeaders: string[];
  onSave: (headers: string[]) => void;
}

export function Settings({ jwtHeaders, onSave }: SettingsProps) {
  const [headers, setHeaders] = useState<string[]>(jwtHeaders);
  const [newHeader, setNewHeader] = useState("");

  const addHeader = () => {
    if (newHeader.trim() && !headers.includes(newHeader.trim())) {
      setHeaders([...headers, newHeader.trim()]);
      setNewHeader("");
    }
  };

  const removeHeader = (header: string) => {
    setHeaders(headers.filter((h) => h !== header));
  };

  const handleSave = () => {
    onSave(headers);
  };

  return (
    <ScrollArea className="h-full p-4">
      <div className="space-y-6 max-w-md">
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

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </ScrollArea>
  );
}
