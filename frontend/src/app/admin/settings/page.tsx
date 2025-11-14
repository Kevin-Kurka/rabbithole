"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  GET_ALL_CONFIGURATIONS,
  UPDATE_CONFIGURATION,
  VALIDATE_CONFIGURATION,
  GET_CONFIGURATION_AUDIT_LOG,
  Configuration,
  UpdateConfigurationInput,
  ConfigurationOperationResponse,
  ConfigurationValidationResult,
} from "@/graphql/queries/admin-config";
import {
  Settings,
  Database,
  Cpu,
  FileText,
  HardDrive,
  Search,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  XCircle,
} from "lucide-react";

interface ConfigFormData {
  [key: string]: {
    value: any;
    modified: boolean;
    error?: string;
  };
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("database");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ConfigFormData>({});
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // GraphQL queries and mutations
  const { data, loading, error, refetch } = useQuery(GET_ALL_CONFIGURATIONS, {
    variables: { category: activeTab !== "all" ? activeTab.toUpperCase() : null },
  });

  const [updateConfiguration, { loading: updating }] = useMutation<{
    updateConfiguration: ConfigurationOperationResponse;
  }>(UPDATE_CONFIGURATION);

  // Initialize form data from GraphQL response
  useEffect(() => {
    if (data?.getAllConfigurations) {
      const initialFormData: ConfigFormData = {};
      data.getAllConfigurations.forEach((config: Configuration) => {
        initialFormData[config.key] = {
          value: config.value,
          modified: false,
        };
      });
      setFormData(initialFormData);
    }
  }, [data]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Filter configurations based on search query and active tab
  const filteredConfigurations = React.useMemo(() => {
    if (!data?.getAllConfigurations) return [];

    return data.getAllConfigurations.filter((config: Configuration) => {
      const matchesSearch =
        config.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (config.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesTab =
        activeTab === "all" || config.category === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [data, searchQuery, activeTab]);

  // Handle field value change
  const handleFieldChange = useCallback(
    (key: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [key]: {
          value,
          modified: true,
        },
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Validate field value
  const validateField = (config: Configuration, value: any): string | undefined => {
    if (config.data_type === "number") {
      if (isNaN(Number(value))) {
        return "Must be a valid number";
      }
    } else if (config.data_type === "json") {
      try {
        JSON.parse(value);
      } catch {
        return "Must be valid JSON";
      }
    } else if (config.data_type === "boolean") {
      if (typeof value !== "boolean" && !["true", "false"].includes(String(value).toLowerCase())) {
        return "Must be a boolean value";
      }
    } else if (config.data_type === "url") {
      try {
        new URL(value);
      } catch {
        return "Must be a valid URL";
      }
    }
    return undefined;
  };

  // Save single configuration
  const handleSaveConfig = async (config: Configuration) => {
    const fieldData = formData[config.key];
    if (!fieldData?.modified) return;

    const error = validateField(config, fieldData.value);
    if (error) {
      setFormData((prev) => ({
        ...prev,
        [config.key]: { ...prev[config.key], error },
      }));
      toast({
        title: "Validation Error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updateConfiguration({
        variables: {
          input: {
            key: config.key,
            value: String(fieldData.value),
          },
        },
      });

      if (result.data?.updateConfiguration.success) {
        toast({
          title: "Configuration Updated",
          description: result.data.updateConfiguration.message || `${config.key} has been updated successfully.`,
        });

        setFormData((prev) => ({
          ...prev,
          [config.key]: { ...prev[config.key], modified: false, error: undefined },
        }));

        const modifiedCount = Object.values(formData).filter((f) => f.modified).length;
        if (modifiedCount <= 1) {
          setHasUnsavedChanges(false);
        }

        refetch();
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Save all modified configurations
  const handleSaveAll = async () => {
    const modifiedConfigs = Object.entries(formData)
      .filter(([_, data]) => data.modified);

    if (modifiedConfigs.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no unsaved changes.",
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [key, data] of modifiedConfigs) {
      try {
        const result = await updateConfiguration({
          variables: {
            input: {
              key,
              value: String(data.value),
            },
          },
        });

        if (result.data?.updateConfiguration.success) {
          successCount++;
          setFormData((prev) => ({
            ...prev,
            [key]: { ...prev[key], modified: false, error: undefined },
          }));
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to update ${key}:`, error);
      }
    }

    if (successCount > 0) {
      toast({
        title: "Configurations Updated",
        description: `${successCount} configuration(s) updated successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
      });
      setHasUnsavedChanges(false);
      refetch();
    } else {
      toast({
        title: "Update Failed",
        description: "Failed to update any configurations.",
        variant: "destructive",
      });
    }
  };

  // Reset single configuration
  const handleResetConfig = (config: Configuration) => {
    setFormData((prev) => ({
      ...prev,
      [config.key]: {
        value: config.value,
        modified: false,
        error: undefined,
      },
    }));

    const modifiedCount = Object.values(formData).filter((f) => f.modified).length;
    if (modifiedCount <= 1) {
      setHasUnsavedChanges(false);
    }
  };

  // Reset all configurations
  const handleResetAll = () => {
    if (data?.getAllConfigurations) {
      const resetFormData: ConfigFormData = {};
      data.getAllConfigurations.forEach((config: Configuration) => {
        resetFormData[config.key] = {
          value: config.value,
          modified: false,
        };
      });
      setFormData(resetFormData);
      setHasUnsavedChanges(false);
      toast({
        title: "Changes Discarded",
        description: "All unsaved changes have been discarded.",
      });
    }
  };


  // Render field based on data type
  const renderConfigField = (config: Configuration) => {
    const fieldData = formData[config.key];
    const currentValue = fieldData?.value ?? config.value;
    const isModified = fieldData?.modified ?? false;
    const error = fieldData?.error;

    if (config.data_type === "boolean") {
      const boolValue = currentValue === "true" || currentValue === true;
      return (
        <div className="flex items-center space-x-2">
          <Switch
            id={config.key}
            checked={boolValue}
            onCheckedChange={(checked) => handleFieldChange(config.key, String(checked))}
          />
          <Label htmlFor={config.key}>
            {boolValue ? "Enabled" : "Disabled"}
          </Label>
        </div>
      );
    }

    if (config.is_secret || config.data_type === "secret") {
      return (
        <div className="relative">
          <Input
            type={showSecrets[config.key] ? "text" : "password"}
            value={currentValue || ""}
            onChange={(e) => handleFieldChange(config.key, e.target.value)}
            className={error ? "border-destructive" : ""}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            onClick={() =>
              setShowSecrets((prev) => ({
                ...prev,
                [config.key]: !prev[config.key],
              }))
            }
          >
            {showSecrets[config.key] ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      );
    }

    if (config.data_type === "number") {
      return (
        <Input
          type="number"
          value={currentValue || ""}
          onChange={(e) => handleFieldChange(config.key, e.target.value)}
          className={error ? "border-destructive" : ""}
        />
      );
    }

    if (config.data_type === "json") {
      return (
        <textarea
          value={
            typeof currentValue === "string"
              ? currentValue
              : JSON.stringify(currentValue, null, 2)
          }
          onChange={(e) => handleFieldChange(config.key, e.target.value)}
          className={`w-full min-h-[100px] rounded-md border ${
            error ? "border-destructive" : "border-input"
          } bg-background px-3 py-2 text-sm`}
        />
      );
    }

    return (
      <Input
        type="text"
        value={currentValue || ""}
        onChange={(e) => handleFieldChange(config.key, e.target.value)}
        className={error ? "border-destructive" : ""}
      />
    );
  };

  // Render configuration card
  const renderConfigCard = (config: Configuration) => {
    const fieldData = formData[config.key];
    const isModified = fieldData?.modified ?? false;
    const error = fieldData?.error;

    return (
      <Card key={config.key} className={isModified ? "border-primary" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {config.key}
                {isModified && (
                  <span className="text-xs text-primary font-normal">
                    (Modified)
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {config.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {renderConfigField(config)}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="text-xs text-muted-foreground">
            Type: {config.data_type} | Category: {config.category}
            {config.updated_at && (
              <> | Last updated: {new Date(config.updated_at).toLocaleString()}</>
            )}
            {config.is_system && <span className="ml-2 text-amber-600">(System)</span>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {isModified && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResetConfig(config)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => handleSaveConfig(config)}
            disabled={!isModified || updating}
          >
            {updating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Error Loading Configurations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system configuration and services
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm font-medium">
              You have unsaved changes
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetAll}>
                Discard All
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={updating}
              >
                {updating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="redis" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Redis & RabbitMQ
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            AI Models
          </TabsTrigger>
          <TabsTrigger value="document" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Processing
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Storage & Media
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>
                PostgreSQL database connection and configuration
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4">
            {filteredConfigurations
              .filter((c: Configuration) => c.category.toLowerCase() === "database")
              .map(renderConfigCard)}
          </div>
        </TabsContent>

        {/* Redis & RabbitMQ Tab */}
        <TabsContent value="redis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redis & RabbitMQ Configuration</CardTitle>
              <CardDescription>
                Cache and message queue service configuration
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4">
            {filteredConfigurations
              .filter((c: Configuration) =>
                c.category.toLowerCase() === "redis" ||
                c.category.toLowerCase() === "rabbitmq"
              )
              .map(renderConfigCard)}
          </div>
        </TabsContent>

        {/* AI Models Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Configuration</CardTitle>
              <CardDescription>
                OpenAI and Ollama configuration for embeddings and chat
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4">
            {filteredConfigurations
              .filter((c: Configuration) =>
                c.category.toLowerCase() === "openai" ||
                c.category.toLowerCase() === "ollama"
              )
              .map(renderConfigCard)}
          </div>
        </TabsContent>

        {/* Document Processing Tab */}
        <TabsContent value="document" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Processing</CardTitle>
              <CardDescription>
                Docling and Whisper configuration for document and audio processing
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4">
            {filteredConfigurations
              .filter((c: Configuration) =>
                c.category.toLowerCase() === "docling" ||
                c.category.toLowerCase() === "whisper"
              )
              .map(renderConfigCard)}
          </div>
        </TabsContent>

        {/* Storage & Media Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage & Media Configuration</CardTitle>
              <CardDescription>
                File storage and media processing settings
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4">
            {filteredConfigurations
              .filter((c: Configuration) =>
                c.category.toLowerCase() === "storage" ||
                c.category.toLowerCase() === "media"
              )
              .map(renderConfigCard)}
          </div>
        </TabsContent>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {filteredConfigurations.map(renderConfigCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
