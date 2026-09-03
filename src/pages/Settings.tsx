import { useEffect, useState, useRef } from "react";
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Contrast,
  Trash2,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

export default function Settings() {

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const {setTheme, setFontSize, setContrast, setPrimaryColor, setAccentColor, theme, fontSize, contrast, primaryColor, accentColor} = useTheme();

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Fetch logo error:", error);
          return;
        }

        if (data?.avatar_url) {
          setCurrentLogoUrl(data.avatar_url);
        }
      } catch (err) {
        console.error("Error fetching logo:", err);
      }
    };

    fetchLogo();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, SVG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `logos/${user.id}-${Date.now()}.${fileExt}`;

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingProfile?.avatar_url) {
        const oldFilePath = extractFilePathFromUrl(
          existingProfile.avatar_url,
        );
        if (oldFilePath) {
          await supabase.storage.from("admin-logo").remove([oldFilePath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("admin-logo")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("admin-logo")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      setCurrentLogoUrl(publicUrl);

      toast({
        title: "Logo uploaded",
        description: "Your logo has been successfully uploaded",
      });
    } catch (err) {
      console.error("Upload error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload logo";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteLogo = async () => {
    setUploading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.avatar_url) {
        const filePath = extractFilePathFromUrl(profile.avatar_url);
        if (filePath) {
          await supabase.storage.from("admin-logo").remove([filePath]);
        }
      }

      await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: { avatar_url: "" },
        });

      setCurrentLogoUrl(null);

      toast({
        title: "Logo deleted",
        description: "Your custom logo has been removed",
      });
    } catch (err) {
      console.error("Delete error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete logo";
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const extractFilePathFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/admin-logo/");
      return pathParts[1] || null;
    } catch {
      return null;
    }
  };


  const displayLogo = currentLogoUrl || logo;
  const isCustomLogo = currentLogoUrl !== null;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your platform settings and preferences."
      />

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-[10px]">
          <TabsTrigger
            value="branding"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-[8px] text-sm font-semibold"
          >
            <Palette className="w-4 h-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger
            value="display"
            className="data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-[8px] text-sm font-semibold"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Display
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 animate-fade-in">
          <Card className="border border-border rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
            <CardHeader>
              <CardTitle className="text-[20px] font-semibold text-[#111827]">App Branding</CardTitle>
              <CardDescription className="text-sm font-normal text-[#526581]">
                Customize your platform's look and feel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[#64748B]">Current Logo</Label>
                  <div className="relative w-24 h-24 rounded-[14px] bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                    {uploading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    )}
                    <img
                      src={displayLogo}
                      alt="Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {isCustomLogo && !uploading && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteLogo}
                      className="w-full rounded-[8px] text-sm font-semibold"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo-upload" className="text-xs font-medium text-[#64748B]">Upload New Logo</Label>
                    <Input
                      ref={fileInputRef}
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="cursor-pointer rounded-[8px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-normal text-[#64748B]">
                      Recommended: SVG or PNG, minimum 512x512px
                    </p>
                    <p className="text-xs font-normal text-[#64748B]">
                      Maximum file size: 5MB
                    </p>
                    {isCustomLogo && (
                      <p className="text-xs font-medium text-[#059669]">
                        ✓ Custom logo uploaded
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-[#111827]">Theme Colors</Label>
                    <p className="text-xs font-normal text-[#64748B]">Select custom primary and accent brand colors</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPrimaryColor("#07AC7D"); setAccentColor("#F59E0B"); }}
                    className="text-xs font-medium text-[#64748B] hover:text-[#111827]"
                  >
                    Reset Colors
                  </Button>
                </div>

                {/* Preset Palettes */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[#64748B]">Preset Theme Palettes</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: "Teal (#0D9488)", primary: "#0D9488", accent: "#06B6D4" },
                      { name: "Emerald (#07AC7D)", primary: "#07AC7D", accent: "#F59E0B" },
                      { name: "Ocean Blue", primary: "#2563EB", accent: "#06B6D4" },
                      { name: "Royal Purple", primary: "#7C3AED", accent: "#EC4899" },
                      { name: "Sunset Amber", primary: "#D97706", accent: "#EF4444" },
                      { name: "Dark Slate", primary: "#0F172A", accent: "#10B981" },
                    ].map((palette) => (
                      <button
                        key={palette.name}
                        onClick={() => {
                          setPrimaryColor(palette.primary);
                          setAccentColor(palette.accent);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          primaryColor.toLowerCase() === palette.primary.toLowerCase()
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.primary }} />
                        {palette.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color" className="text-xs font-medium text-[#64748B]">Primary Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 rounded-[8px] border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="font-mono rounded-[8px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color" className="text-xs font-medium text-[#64748B]">Accent Color</Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="accent-color"
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-10 rounded-[8px] border border-border cursor-pointer bg-transparent"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="font-mono rounded-[8px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <Card className="border border-border rounded-[14px] shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
              <CardHeader>
                <CardTitle className="text-[20px] font-semibold text-[#111827] flex items-center gap-2">
                  {theme === "light" ? (
                    <Sun className="w-7 h-7 text-accent" />
                  ) : (
                    <Moon className="w-7 h-7 text-accent" />
                  )}
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[#64748B]">Theme</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "light", icon: Sun, label: "Light" },
                      { value: "dark", icon: Moon, label: "Dark" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value as typeof theme)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-3 p-4 rounded-[10px] border transition-all duration-150",
                          theme === option.value
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50",
                        )}
                      >
                        <option.icon
                          className={cn(
                            "w-7 h-7",
                            theme === option.value
                              ? "text-accent"
                              : "text-muted-foreground",
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            theme === option.value
                              ? "text-accent"
                              : "text-muted-foreground",
                          )}
                        >
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                    <Type className="w-4 h-4" />
                    Font Size
                  </Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="rounded-[8px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium (Default)</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
                    <Contrast className="w-4 h-4" />
                    Contrast
                  </Label>
                  <Select value={contrast} onValueChange={setContrast}>
                    <SelectTrigger className="rounded-[8px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Contrast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}