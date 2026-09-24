import { useEffect, useState, useRef } from "react";
import {
  Palette,
  Trash2,
  Loader2,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

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

      <div className="space-y-6">
        {/* App Branding */}
        <Card className="bg-white border border-white/90 shadow-[5px_5px_14px_rgba(168,190,185,0.25),-4px_-4px_12px_rgba(255,255,255,0.95)] rounded-[26px]">
          <CardHeader>
            <CardTitle className="text-[20px] font-semibold text-foreground flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              App Branding
            </CardTitle>
            <CardDescription className="text-sm font-normal text-muted-foreground">
              Customize your platform's logo and assets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Current Logo</Label>
                <div className="relative w-24 h-24 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
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
                    className="w-full rounded-xl text-sm font-semibold"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-upload" className="text-xs font-medium text-muted-foreground">Upload New Logo</Label>
                  <Input
                    ref={fileInputRef}
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="cursor-pointer rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-normal text-muted-foreground">
                    Recommended: SVG or PNG, minimum 512x512px
                  </p>
                  <p className="text-xs font-normal text-muted-foreground">
                    Maximum file size: 5MB
                  </p>
                  {isCustomLogo && (
                    <p className="text-xs font-medium text-emerald-500">
                      ✓ Custom logo uploaded
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}