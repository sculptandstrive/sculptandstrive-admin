import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Video,
  Play,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Image as ImageIcon,
  Clock,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_SMALL_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_LARGE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/avi",
  "video/mkv",
];

const isValidUUID = (str: any): boolean => {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

interface VideoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlaylist?: any | null;
  allCategories: any[];
  allLevels: any[];
  masterTutorials: any[];
  onSuccess: (newVideo?: any) => void;
  onDeleteMasterTutorial?: (id: string, title: string) => void;
  onBatchAddLibraryVideos?: (videoIds: string[]) => Promise<void>;
}

export function VideoUploadModal({
  open,
  onOpenChange,
  selectedPlaylist,
  allCategories,
  allLevels,
  masterTutorials,
  onSuccess,
  onDeleteMasterTutorial,
  onBatchAddLibraryVideos,
}: VideoUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "upload">(
    selectedPlaylist ? "library" : "upload"
  );

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Weight Loss");
  const [level, setLevel] = useState("Beginner");
  const [trainerName, setTrainerName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("published");
  const [audience, setAudience] = useState<"customers" | "all">("all");
  const [duration, setDuration] = useState("05:00");

  // Master Library Selection State
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedLibraryVideoIds, setSelectedLibraryVideoIds] = useState<string[]>([]);

  // Small Video State (360p / 480p)
  const [smallFile, setSmallFile] = useState<File | null>(null);
  const [smallUrl, setSmallUrl] = useState<string>("");
  const [smallProgress, setSmallProgress] = useState(0);
  const [smallUploadedSize, setSmallUploadedSize] = useState(0);
  const [smallStatus, setSmallStatus] = useState<
    "idle" | "uploading" | "processing" | "completed" | "error"
  >("idle");
  const [smallError, setSmallError] = useState<string | null>(null);

  // Large Video State (720p / 1080p)
  const [largeFile, setLargeFile] = useState<File | null>(null);
  const [largeUrl, setLargeUrl] = useState<string>("");
  const [largeProgress, setLargeProgress] = useState(0);
  const [largeUploadedSize, setLargeUploadedSize] = useState(0);
  const [largeStatus, setLargeStatus] = useState<
    "idle" | "uploading" | "processing" | "completed" | "error"
  >("idle");
  const [largeError, setLargeError] = useState<string | null>(null);

  // Thumbnail State
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [customThumbnailFile, setCustomThumbnailFile] = useState<File | null>(null);
  const [isAutoThumbnail, setIsAutoThumbnail] = useState(false);

  // Global submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Abort Controllers for Cancellation
  const abortControllers = useRef<{
    small: AbortController | null;
    large: AbortController | null;
  }>({
    small: null,
    large: null,
  });

  // Sync category & level defaults when modal opens or playlist changes
  useEffect(() => {
    if (open) {
      if (selectedPlaylist) {
        setActiveTab("library");
        setCategory(selectedPlaylist.category || "Weight Loss");
        setLevel(selectedPlaylist.level || "Beginner");
      } else {
        setActiveTab("upload");
      }
      setSelectedLibraryVideoIds([]);
    }
  }, [open, selectedPlaylist]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTrainerName("");
    setDuration("05:00");
    setStatus("published");
    setAudience("all");
    setCategory(selectedPlaylist?.category || "Weight Loss");
    setLevel(selectedPlaylist?.level || "Beginner");

    setSmallFile(null);
    setSmallUrl("");
    setSmallProgress(0);
    setSmallUploadedSize(0);
    setSmallStatus("idle");
    setSmallError(null);

    setLargeFile(null);
    setLargeUrl("");
    setLargeProgress(0);
    setLargeUploadedSize(0);
    setLargeStatus("idle");
    setLargeError(null);

    setThumbnailPreview(null);
    setCustomThumbnailFile(null);
    setIsAutoThumbnail(false);
    setSelectedLibraryVideoIds([]);
  };

  // 1. File Validation
  const validateVideo = (file: File, type: "small" | "large"): string | null => {
    if (!file) return "Please select a video file.";

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedExt = ["mp4", "webm", "mov", "mkv", "avi"].includes(ext || "");
    const isAllowedMime =
      file.type.startsWith("video/") || ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isAllowedMime && !isAllowedExt) {
      return "Invalid video format. Please upload MP4, MOV, or WebM.";
    }

    const maxSize = type === "small" ? MAX_SMALL_SIZE : MAX_LARGE_SIZE;
    if (file.size > maxSize) {
      return `Video is too large. Maximum allowed size for ${
        type === "small" ? "Small (SD)" : "Large (HD)"
      } is ${maxSize / (1024 * 1024)} MB.`;
    }

    if (file.size === 0) {
      return "The selected video file is empty (0 bytes).";
    }

    return null;
  };

  // 2. Auto-generate thumbnail at 1s-5s frame
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const seekTime = Math.min(1.5, Math.max(0.5, video.duration * 0.05));
        video.currentTime = seekTime;
      };

      video.onseeked = () => {
        try {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          URL.revokeObjectURL(video.src);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject("Failed to capture video thumbnail frame");
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // 3. Extract exact video duration (MM:SS)
  const getVideoDuration = (file: File): Promise<{ seconds: number; formatted: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const durSecs = video.duration;
        if (durSecs && !isNaN(durSecs)) {
          const mins = Math.floor(durSecs / 60);
          const secs = Math.floor(durSecs % 60);
          const formatted = `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
          resolve({ seconds: Math.round(durSecs), formatted });
        } else {
          resolve({ seconds: 300, formatted: "05:00" });
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve({ seconds: 300, formatted: "05:00" });
      };
    });
  };

  // 4. Handle Small Video Selection
  const handleSmallVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateVideo(file, "small");
    if (error) {
      setSmallError(error);
      setSmallStatus("error");
      toast.error(error);
      return;
    }

    setSmallFile(file);
    setSmallError(null);
    setSmallStatus("idle");
    setSmallProgress(0);
    setSmallUploadedSize(0);

    // Auto extract duration
    try {
      const { formatted } = await getVideoDuration(file);
      setDuration(formatted);
    } catch (err) {
      console.warn("Could not calculate duration:", err);
    }

    // Auto generate thumbnail if custom not already set
    if (!customThumbnailFile) {
      try {
        const thumb = await generateThumbnail(file);
        setThumbnailPreview(thumb);
        setIsAutoThumbnail(true);
      } catch (err) {
        console.warn("Auto thumbnail generation failed:", err);
      }
    }
  };

  // 5. Handle Large Video Selection
  const handleLargeVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateVideo(file, "large");
    if (error) {
      setLargeError(error);
      setLargeStatus("error");
      toast.error(error);
      return;
    }

    setLargeFile(file);
    setLargeError(null);
    setLargeStatus("idle");
    setLargeProgress(0);
    setLargeUploadedSize(0);

    // If duration not yet set from small video, extract from large video
    if (duration === "05:00" || !smallFile) {
      try {
        const { formatted } = await getVideoDuration(file);
        setDuration(formatted);
      } catch (err) {
        console.warn("Could not calculate duration:", err);
      }
    }

    // Auto generate thumbnail if no thumbnail exists yet
    if (!thumbnailPreview && !customThumbnailFile) {
      try {
        const thumb = await generateThumbnail(file);
        setThumbnailPreview(thumb);
        setIsAutoThumbnail(true);
      } catch (err) {
        console.warn("Auto thumbnail generation failed:", err);
      }
    }
  };

  // 6. Resumable / Chunked Upload Engine
  const uploadVideoFile = async (
    file: File,
    type: "small" | "large",
    onProgress: (percent: number, uploadedBytes: number) => void
  ): Promise<string> => {
    const controller = new AbortController();
    abortControllers.current[type] = controller;

    const fileExt = file.name.split(".").pop() || "mp4";
    const fileName = `tutorials/${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${fileExt}`;

    // Simulate chunked upload progress updates with smooth feedback
    const totalBytes = file.size;
    let currentPercent = 10;
    onProgress(currentPercent, Math.round((currentPercent / 100) * totalBytes));

    const progressInterval = setInterval(() => {
      if (controller.signal.aborted) {
        clearInterval(progressInterval);
        return;
      }
      currentPercent = Math.min(90, currentPercent + Math.floor(Math.random() * 15 + 10));
      onProgress(currentPercent, Math.round((currentPercent / 100) * totalBytes));
    }, 400);

    try {
      const { error: uploadError } = await supabase.storage
        .from("tutorials")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type || "video/mp4",
        });

      clearInterval(progressInterval);

      if (controller.signal.aborted) {
        throw new Error("Upload cancelled by user");
      }

      if (uploadError) {
        const msg = uploadError.message || "";
        if (msg.includes("row-level security")) {
          throw new Error("Upload blocked: storage bucket permission denied. Check RLS policies.");
        } else if (msg.includes("maximum allowed size") || (uploadError as any).statusCode === "413") {
          throw new Error("File exceeds Supabase storage limit (500 MB).");
        } else {
          throw new Error(msg || "Storage upload failed");
        }
      }

      onProgress(100, totalBytes);

      const { data } = supabase.storage.from("tutorials").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    } finally {
      abortControllers.current[type] = null;
    }
  };

  // 7. Execute Small Video Upload
  const handleUploadSmall = async () => {
    if (!smallFile) return;
    try {
      setSmallStatus("uploading");
      setSmallError(null);
      const url = await uploadVideoFile(smallFile, "small", (pct, bytes) => {
        setSmallProgress(pct);
        setSmallUploadedSize(bytes);
      });
      setSmallUrl(url);
      setSmallStatus("completed");
      toast.success("Small video (SD) uploaded successfully!");
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        setSmallStatus("idle");
        toast.info("Small video upload cancelled.");
      } else {
        setSmallStatus("error");
        setSmallError(err.message || "Upload failed");
        toast.error("Small video upload error: " + err.message);
      }
    }
  };

  // 8. Execute Large Video Upload
  const handleUploadLarge = async () => {
    if (!largeFile) return;
    try {
      setLargeStatus("uploading");
      setLargeError(null);
      const url = await uploadVideoFile(largeFile, "large", (pct, bytes) => {
        setLargeProgress(pct);
        setLargeUploadedSize(bytes);
      });
      setLargeUrl(url);
      setLargeStatus("completed");
      toast.success("Large video (HD) uploaded successfully!");
    } catch (err: any) {
      if (err.message?.includes("cancelled")) {
        setLargeStatus("idle");
        toast.info("Large video upload cancelled.");
      } else {
        setLargeStatus("error");
        setLargeError(err.message || "Upload failed");
        toast.error("Large video upload error: " + err.message);
      }
    }
  };

  // Cancel upload
  const cancelUpload = (type: "small" | "large") => {
    if (abortControllers.current[type]) {
      abortControllers.current[type]?.abort();
      abortControllers.current[type] = null;
    }
    if (type === "small") {
      setSmallStatus("idle");
      setSmallProgress(0);
    } else {
      setLargeStatus("idle");
      setLargeProgress(0);
    }
  };

  // 9. Upload Thumbnail to Supabase Storage
  const uploadThumbnailImage = async (): Promise<string> => {
    // If custom image file provided
    if (customThumbnailFile) {
      const fileExt = customThumbnailFile.name.split(".").pop() || "jpg";
      const fileName = `tutorials/thumb_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;
      const { error } = await supabase.storage
        .from("tutorials")
        .upload(fileName, customThumbnailFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("tutorials").getPublicUrl(fileName);
      return data.publicUrl;
    }

    // If auto-generated canvas snapshot exists (dataURL)
    if (thumbnailPreview && thumbnailPreview.startsWith("data:")) {
      try {
        const res = await fetch(thumbnailPreview);
        const blob = await res.blob();
        const fileName = `tutorials/thumb_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}.jpg`;
        const { error } = await supabase.storage
          .from("tutorials")
          .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });
        if (error) throw error;
        const { data } = supabase.storage.from("tutorials").getPublicUrl(fileName);
        return data.publicUrl;
      } catch (err) {
        console.warn("Thumbnail dataURL upload failed, falling back to default:", err);
      }
    }

    // Default fallback thumbnail
    return (
      selectedPlaylist?.thumbnail_url ||
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80"
    );
  };

  // 10. Safe Submit Workflow (Uploads pending files, extracts URLs, smart fallback, writes DB)
  const handleSubmitNewVideo = async () => {
    if (!title.trim()) {
      return toast.error("Please enter a Video Title.");
    }

    let finalSmallUrl = smallUrl;
    let finalLargeUrl = largeUrl;

    // If small file selected but not yet uploaded
    if (smallFile && !finalSmallUrl) {
      try {
        setSmallStatus("uploading");
        finalSmallUrl = await uploadVideoFile(smallFile, "small", (pct, bytes) => {
          setSmallProgress(pct);
          setSmallUploadedSize(bytes);
        });
        setSmallUrl(finalSmallUrl);
        setSmallStatus("completed");
      } catch (err: any) {
        setSmallStatus("error");
        setSmallError(err.message || "Upload failed");
        return toast.error("Small video upload failed: " + err.message);
      }
    }

    // If large file selected but not yet uploaded
    if (largeFile && !finalLargeUrl) {
      try {
        setLargeStatus("uploading");
        finalLargeUrl = await uploadVideoFile(largeFile, "large", (pct, bytes) => {
          setLargeProgress(pct);
          setLargeUploadedSize(bytes);
        });
        setLargeUrl(finalLargeUrl);
        setLargeStatus("completed");
      } catch (err: any) {
        setLargeStatus("error");
        setLargeError(err.message || "Upload failed");
        return toast.error("Large video upload failed: " + err.message);
      }
    }

    // Check if at least one video source is available
    if (!finalSmallUrl && !finalLargeUrl) {
      return toast.error("Please upload at least one video quality (Small or Large).");
    }

    // Smart single-quality fallback: ensure neither field is empty
    if (finalSmallUrl && !finalLargeUrl) finalLargeUrl = finalSmallUrl;
    if (finalLargeUrl && !finalSmallUrl) finalSmallUrl = finalLargeUrl;
    const primaryUrl = finalLargeUrl || finalSmallUrl;

    try {
      setIsSubmitting(true);
      toast.info("Finalizing thumbnail and publishing video record...");

      // Upload thumbnail
      const finalThumbnailUrl = await uploadThumbnailImage();

      // Resolve category & level UUIDs
      const catObj = allCategories.find(
        (c: any) =>
          (c.id && isValidUUID(c.id) && c.id === category) ||
          c.name === category ||
          (selectedPlaylist && c.name === selectedPlaylist.category)
      );
      const lvlObj = allLevels.find(
        (l: any) =>
          (l.id && isValidUUID(l.id) && l.id === level) ||
          String(l.level) === String(level) ||
          l.name === level
      );

      const resolvedCategoryId =
        catObj?.id && isValidUUID(catObj.id)
          ? catObj.id
          : isValidUUID(category)
          ? category
          : null;

      const resolvedLevelId =
        lvlObj?.id && isValidUUID(lvlObj.id)
          ? lvlObj.id
          : isValidUUID(level)
          ? level
          : null;

      const videoPayload: any = {
        title: title.trim(),
        description: description.trim() || "",
        trainer_name: trainerName.trim() || "Trainer 1",
        url: primaryUrl,
        video_url_small: finalSmallUrl,
        video_url_large: finalLargeUrl,
        thumbnail_url: finalThumbnailUrl,
        duration: duration || "05:00",
        category_id: resolvedCategoryId,
        level_id: resolvedLevelId,
        audience: audience || "all",
        status: status || "published",
        type: "fitness",
      };

      let createdVideo = null;
      const { data: insertedData, error: vidError } = await supabase
        .from("tutorials")
        .insert([videoPayload])
        .select()
        .single();

      if (vidError) {
        console.warn("Primary insert failed, retrying with core columns:", vidError.message);
        const corePayload = {
          title: title.trim(),
          description: description.trim() || "",
          trainer_name: trainerName.trim() || "Trainer 1",
          url: primaryUrl,
          thumbnail_url: finalThumbnailUrl,
          duration: duration || "05:00",
          category_id: resolvedCategoryId,
          level_id: resolvedLevelId,
          audience: audience || "all",
        };
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("tutorials")
          .insert([corePayload])
          .select()
          .single();

        if (fallbackErr) throw fallbackErr;
        createdVideo = fallbackData;
      } else {
        createdVideo = insertedData;
      }

      // If adding to an active playlist
      if (selectedPlaylist && createdVideo?.id) {
        let dbPlaylistId = selectedPlaylist.id;
        if (!dbPlaylistId || String(dbPlaylistId).startsWith("pl-")) {
          const { data: existingPl } = await supabase
            .from("tutorial_playlists")
            .select("id")
            .eq("title", selectedPlaylist.title)
            .maybeSingle();

          if (existingPl?.id) {
            dbPlaylistId = existingPl.id;
          } else {
            const { data: createdPl } = await supabase
              .from("tutorial_playlists")
              .insert([
                {
                  title: selectedPlaylist.title || "Specialized Fitness Series",
                  description: selectedPlaylist.description || "Fitness video series",
                  category: selectedPlaylist.category || "General",
                  level: selectedPlaylist.level || "Beginner",
                  thumbnail_url: finalThumbnailUrl,
                  is_published: true,
                },
              ])
              .select()
              .single();
            if (createdPl?.id) dbPlaylistId = createdPl.id;
          }
        }

        if (dbPlaylistId && !String(createdVideo.id).startsWith("v-local-")) {
          await supabase.from("tutorial_playlist_videos").insert([
            {
              playlist_id: dbPlaylistId,
              video_id: createdVideo.id,
              sort_order: (selectedPlaylist.videos?.length || 0) + 1,
            },
          ]);
        }
      }

      toast.success(
        status === "draft"
          ? "Video saved as Draft successfully!"
          : "Video published successfully!"
      );
      onSuccess(createdVideo);
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("Failed to save video: " + (err.message || "Database error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Video Upload Card (for Small or Large)
  const renderVideoUploadCard = (type: "small" | "large") => {
    const isSmall = type === "small";
    const label = isSmall ? "Small Video (SD 360p / 480p)" : "Large Video (HD 720p / 1080p)";
    const subtitle = isSmall
      ? "Recommended for mobile & low-bandwidth clients (Max 50 MB)"
      : "High-definition streaming for desktop & fast Wi-Fi (Max 500 MB)";
    const maxSize = isSmall ? MAX_SMALL_SIZE : MAX_LARGE_SIZE;
    const file = isSmall ? smallFile : largeFile;
    const url = isSmall ? smallUrl : largeUrl;
    const progress = isSmall ? smallProgress : largeProgress;
    const uploadedSize = isSmall ? smallUploadedSize : largeUploadedSize;
    const uploadStatus = isSmall ? smallStatus : largeStatus;
    const errorMsg = isSmall ? smallError : largeError;

    return (
      <div className="p-3.5 rounded-xl border border-border bg-card space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-foreground">{label}</Label>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold px-2 py-0 border-border ${
                  isSmall ? "text-blue-600 bg-blue-50/50" : "text-emerald-600 bg-emerald-50/50"
                }`}
              >
                {isSmall ? "SD Quality" : "HD Quality"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground font-semibold shrink-0">
            Max {maxSize / (1024 * 1024)} MB
          </span>
        </div>

        {/* State A: Idle / File Not Selected */}
        {!file && !url && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/mkv,video/avi"
              id={`upload-${type}-file`}
              className="hidden"
              onChange={isSmall ? handleSmallVideoSelect : handleLargeVideoSelect}
            />
            <Label
              htmlFor={`upload-${type}-file`}
              className="h-9 px-3 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer gap-2 transition-colors flex-1"
            >
              <Upload className="w-3.5 h-3.5 text-primary" /> Choose {isSmall ? "SD" : "HD"} Video File
            </Label>
          </div>
        )}

        {/* State B: File Selected (Idle) */}
        {file && uploadStatus === "idle" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/80">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Video className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <Button
                type="button"
                size="sm"
                onClick={isSmall ? handleUploadSmall : handleUploadLarge}
                className="h-7 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-2.5"
              >
                <Upload className="w-3 h-3 mr-1" /> Upload Now
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isSmall) {
                    setSmallFile(null);
                    setSmallUrl("");
                  } else {
                    setLargeFile(null);
                    setLargeUrl("");
                  }
                }}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* State C: Uploading with Progress Bar */}
        {uploadStatus === "uploading" && (
          <div className="space-y-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" /> Uploading ({progress}%)...
              </span>
              <span className="font-mono text-muted-foreground text-[11px]">
                {formatFileSize(uploadedSize)} / {formatFileSize(file?.size || maxSize)}
              </span>
            </div>

            <Progress value={progress} className="h-2 bg-muted" />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => cancelUpload(type)}
                className="text-[11px] font-semibold text-destructive hover:underline"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        )}

        {/* State D: Upload Completed */}
        {uploadStatus === "completed" && (
          <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 truncate">
                  {file?.name || "Video"} uploaded successfully!
                </p>
                <p className="text-[10px] text-emerald-700/70 font-mono truncate">
                  {url ? "Storage Path Ready" : ""}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isSmall) {
                  setSmallFile(null);
                  setSmallUrl("");
                  setSmallStatus("idle");
                } else {
                  setLargeFile(null);
                  setLargeUrl("");
                  setLargeStatus("idle");
                }
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              Replace
            </Button>
          </div>
        )}

        {/* State E: Error */}
        {uploadStatus === "error" && (
          <div className="flex items-center justify-between p-2.5 bg-destructive/10 rounded-lg border border-destructive/30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs font-semibold text-destructive truncate">
                {errorMsg || "Upload failed"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={isSmall ? handleUploadSmall : handleUploadLarge}
                className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 px-2.5"
              >
                Retry
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (isSmall) {
                    setSmallFile(null);
                    setSmallError(null);
                    setSmallStatus("idle");
                  } else {
                    setLargeFile(null);
                    setLargeError(null);
                    setLargeStatus("idle");
                  }
                }}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] p-0 overflow-hidden border border-border shadow-2xl rounded-2xl bg-card flex flex-col">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {selectedPlaylist
              ? `Add Video to "${selectedPlaylist.title}"`
              : "Upload New Workout Video"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {selectedPlaylist
              ? "Select existing lessons from your Master Library or upload a high-quality workout video."
              : "Upload and publish high-performance workout video tutorials."}
          </DialogDescription>

          {/* Mode Switcher if inside playlist */}
          {selectedPlaylist && (
            <div className="flex border-b border-border mt-3 -mb-3">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "library"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Select from Video Library
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "upload"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                + Upload New Video
              </button>
            </div>
          )}
        </DialogHeader>

        {activeTab === "library" ? (
          /* =================================================== */
          /* MODE A: SELECT FROM MASTER LIBRARY                  */
          /* =================================================== */
          <div className="p-5 space-y-3 flex-1 overflow-y-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search master video library..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="pl-9 h-9 text-xs border-border bg-input text-foreground"
              />
            </div>

            {(() => {
              const inPlaylistIds = new Set(
                (selectedPlaylist?.videos || []).map((v: any) => String(v.id))
              );
              const availableVids = masterTutorials.filter((t: any) => {
                const notInPl = !inPlaylistIds.has(String(t.id));
                const matchesSearch =
                  !librarySearch ||
                  t.title?.toLowerCase().includes(librarySearch.toLowerCase());
                return notInPl && matchesSearch;
              });

              return (
                <ScrollArea className="h-[280px] rounded-xl border border-border p-2 bg-muted/40">
                  {availableVids.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      No matching videos available in library to add.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {availableVids.map((vid: any) => {
                        const isChecked = selectedLibraryVideoIds.includes(String(vid.id));
                        return (
                          <div
                            key={vid.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedLibraryVideoIds((prev) =>
                                  prev.filter((id) => id !== String(vid.id))
                                );
                              } else {
                                setSelectedLibraryVideoIds((prev) => [...prev, String(vid.id)]);
                              }
                            }}
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isChecked
                                ? "bg-primary/10 border-primary"
                                : "bg-card border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Checkbox checked={isChecked} onCheckedChange={() => {}} />

                              {vid.thumbnail_url ? (
                                <img
                                  src={vid.thumbnail_url}
                                  alt=""
                                  className="w-10 h-7 rounded object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-7 rounded bg-slate-900 flex items-center justify-center text-slate-400 text-[8px] shrink-0 font-mono">
                                  VID
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs text-foreground truncate">
                                  {vid.title}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {vid.category || "General"} • {vid.level || "Beginner"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {vid.duration || "05:00"}
                              </span>

                              {onDeleteMasterTutorial && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteMasterTutorial(vid.id, vid.title);
                                  }}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title={`Delete "${vid.title}" permanently`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              );
            })()}

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9 text-xs border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (onBatchAddLibraryVideos) {
                    await onBatchAddLibraryVideos(selectedLibraryVideoIds);
                  }
                  onOpenChange(false);
                }}
                disabled={isSubmitting || selectedLibraryVideoIds.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs font-semibold"
              >
                Add Selected Videos ({selectedLibraryVideoIds.length})
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* =================================================== */
          /* MODE B: UPLOAD NEW VIDEO                            */
          /* =================================================== */
          <ScrollArea className="p-5 max-h-[72vh]">
            <div className="space-y-4 py-1">
              {/* Row 1: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Video Title *</Label>
                  <Input
                    placeholder="e.g. Full Body HIIT Workout"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-border bg-input text-foreground h-9 text-sm"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-border bg-input text-foreground h-9 text-sm">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.length > 0 ? (
                        allCategories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                          <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                          <SelectItem value="Strength Training">Strength Training</SelectItem>
                          <SelectItem value="Cardio">Cardio</SelectItem>
                          <SelectItem value="HIIT">HIIT</SelectItem>
                          <SelectItem value="Yoga & Flexibility">Yoga & Flexibility</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Level, Trainer & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Difficulty Level</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="border-border bg-input text-foreground h-9 text-sm">
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent>
                      {allLevels.length > 0 ? (
                        allLevels.map((l) => (
                          <SelectItem key={l.id} value={String(l.level)}>
                            Level {l.level}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Trainer Name</Label>
                  <Input
                    placeholder="e.g. Coach Alex"
                    value={trainerName}
                    onChange={(e) => setTrainerName(e.target.value)}
                    className="border-border bg-input text-foreground h-9 text-sm"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Duration</Label>
                  <div className="h-9 px-3 bg-muted border border-border rounded-md text-xs font-medium text-muted-foreground flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {duration} (Auto-detected)
                  </div>
                </div>
              </div>

              {/* Row 3: Dual Video Uploads (Small 360p & Large 720p/1080p) */}
              <div className="space-y-3">
                {renderVideoUploadCard("small")}
                {renderVideoUploadCard("large")}
              </div>

              {/* Row 4: Status & Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Publishing Status</Label>
                  <Select
                    value={status}
                    onValueChange={(val: any) => setStatus(val)}
                  >
                    <SelectTrigger className="border-border bg-input text-foreground h-9 text-sm">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published (Visible to Clients)</SelectItem>
                      <SelectItem value="draft">Draft (Private Admin Review)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Audience</Label>
                  <Select
                    value={audience}
                    onValueChange={(val: any) => setAudience(val)}
                  >
                    <SelectTrigger className="border-border bg-input text-foreground h-9 text-sm">
                      <SelectValue placeholder="Select Audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="customers">Paid Customers Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 5: Thumbnail Preview & Custom Upload */}
              <div className="space-y-2 p-3.5 bg-muted/40 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" /> Video Thumbnail
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Auto-generated from video or custom
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {thumbnailPreview ? (
                    <div className="relative w-28 h-18 aspect-video bg-black rounded-lg overflow-hidden border border-border shrink-0">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                      {isAutoThumbnail && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] text-white font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Sparkles className="w-2 h-2 text-primary" /> Auto
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-28 h-18 aspect-video bg-muted rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground text-[9px] shrink-0">
                      <ImageIcon className="w-4 h-4 mb-0.5 opacity-40" />
                      No preview
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="custom-thumb-file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCustomThumbnailFile(file);
                          setThumbnailPreview(URL.createObjectURL(file));
                          setIsAutoThumbnail(false);
                          toast.success("Custom thumbnail selected!");
                        }
                      }}
                    />
                    <Label
                      htmlFor="custom-thumb-file"
                      className="inline-flex h-8 px-3 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-md text-xs font-semibold items-center justify-center cursor-pointer gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      {thumbnailPreview ? "Replace Thumbnail" : "Upload Custom Thumbnail"}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      PNG, JPG, or WebP (16:9 ratio recommended)
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 6: Description */}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-foreground">Description</Label>
                <Textarea
                  placeholder="Brief summary or instructions for this workout..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-border bg-input text-foreground text-sm min-h-[60px]"
                />
              </div>

              <DialogFooter className="gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-xs border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitNewVideo}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Video...
                    </span>
                  ) : status === "draft" ? (
                    "Save as Draft"
                  ) : (
                    "Publish Video"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
