import { useState, useEffect, useMemo } from "react";
import { Trash2, List, Layers, Settings as SettingsIcon, Sun, Moon, Monitor, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { RequestList } from "@/components/RequestList";
import { RequestDetail } from "@/components/RequestDetail";
import { Settings } from "@/components/Settings";
import { SessionsView } from "@/components/SessionsView";
import { useRequestStore } from "@/lib/tanstackdb";
import { useNetworkCapture } from "@/hooks/useNetworkCapture";
import { getSettings, updateSettings, DEFAULT_SETTINGS } from "@/db/settings";
import { useTheme } from "next-themes";

export default function App() {
  const [mainTab, setMainTab] = useState("requests");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [jwtHeaders, setJwtHeaders] = useState<string[]>(DEFAULT_SETTINGS.jwtHeaders);
  const [tokenPrefixes, setTokenPrefixes] = useState<string[]>(DEFAULT_SETTINGS.tokenPrefixes);
  const [sessionRetentionHours, setSessionRetentionHours] = useState<number>(DEFAULT_SETTINGS.sessionRetentionHours);
  const { theme, setTheme } = useTheme();

  const {
    requests,
    selectedRequest,
    setSelectedRequest,
    addRequest,
    onNavigate,
    clearRequests,
    clearDomain,
    clearPage,
    cleanupOldSessions,
    groupedRequests,
    domainGroups,
    currentPageUrl,
  } = useRequestStore();

  useNetworkCapture(addRequest, onNavigate);

  useEffect(() => {
    getSettings().then((settings) => {
      setJwtHeaders(settings.jwtHeaders);
      setTokenPrefixes(settings.tokenPrefixes ?? DEFAULT_SETTINGS.tokenPrefixes);
      setSessionRetentionHours(settings.sessionRetentionHours);
      // Initial cleanup on load
      cleanupOldSessions(settings.sessionRetentionHours);
    });
  }, [cleanupOldSessions]);

  // Periodic cleanup every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupOldSessions(sessionRetentionHours);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sessionRetentionHours, cleanupOldSessions]);

  const handleSaveSettings = async (settings: { jwtHeaders: string[]; tokenPrefixes: string[]; sessionRetentionHours: number }) => {
    await updateSettings(settings);
    setJwtHeaders(settings.jwtHeaders);
    setTokenPrefixes(settings.tokenPrefixes);
    setSessionRetentionHours(settings.sessionRetentionHours);
    setMainTab("requests");
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold">Requests Visualizer</h1>
          <span className="text-xs text-muted-foreground">
            {requests.length} requests
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === "grouped" ? "flat" : "grouped")}
            title={viewMode === "grouped" ? "Switch to flat view" : "Switch to grouped view"}
          >
            {viewMode === "grouped" ? <List className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRequests}
            title="Clear all requests"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")}
            title={theme === "system" ? "Using system theme (click for light)" : theme === "light" ? "Light mode (click for dark)" : "Dark mode (click for system)"}
          >
            {theme === "system" ? <Monitor className="w-4 h-4" /> : theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMainTab(mainTab === "settings" ? "requests" : "settings")}
            title="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <Tabs value={mainTab} onValueChange={setMainTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 w-fit">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="sessions">
            <Globe className="w-4 h-4 mr-1" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="flex-1 overflow-hidden mt-0">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={40} minSize={25}>
              <RequestList
                groups={groupedRequests}
                requests={requests}
                selectedRequest={selectedRequest}
                onSelectRequest={setSelectedRequest}
                jwtHeaders={jwtHeaders}
                viewMode={viewMode}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={30}>
              {selectedRequest ? (
                <RequestDetail request={selectedRequest} jwtHeaders={jwtHeaders} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a request to view details
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 overflow-hidden mt-0">
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel defaultSize={40} minSize={25}>
              <SessionsView
                domainGroups={domainGroups}
                onSelectRequest={setSelectedRequest}
                selectedRequest={selectedRequest}
                onClearDomain={clearDomain}
                onClearPage={clearPage}
                jwtHeaders={jwtHeaders}
                tokenPrefixes={tokenPrefixes}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={60} minSize={30}>
              {selectedRequest ? (
                <RequestDetail request={selectedRequest} jwtHeaders={jwtHeaders} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a request to view details
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 overflow-hidden mt-0">
          <Settings 
            jwtHeaders={jwtHeaders}
            tokenPrefixes={tokenPrefixes}
            sessionRetentionHours={sessionRetentionHours}
            onSave={handleSaveSettings} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
