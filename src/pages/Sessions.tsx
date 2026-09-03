import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon, Video, Users as UsersIcon,
  Clock, Plus, Trash2, RefreshCw, Search, Play, Edit3, Image as ImageIcon, Upload
} from "lucide-react";
import { useGoogleLogin } from '@react-oauth/google';
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import SegmentedControl from "@/components/SegmentedControl";

const isValidUUID = (str: any): boolean => {
  if (typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

export default function Sessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "tutorials" | "tutorial">("live");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [sessionType, setSessionType] = useState<"individual" | "group">("individual");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groups, setGroups] = useState<any[]>([]);

  // Video Tutorials State
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [loadingTutorials, setLoadingTutorials] = useState(false);
  const [tutorialSearch, setTutorialSearch] = useState("");
  const [editingTutorial, setEditingTutorial] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allLevels, setAllLevels] = useState<any[]>([]);
  const [tutorialSource, setTutorialSource] = useState<"upload" | "link">("upload");

  // Playlist System State
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<any | null>(null);
  const [playlistCategoryFilter, setPlaylistCategoryFilter] = useState("all");
  const [playlistLevelFilter, setPlaylistLevelFilter] = useState("all");
  const [playlistFormData, setPlaylistFormData] = useState({
    title: "",
    description: "",
    category: "Cardio",
    level: "Beginner",
    thumbnail_url: "",
    is_published: true,
  });

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [addVideoMode, setAddVideoMode] = useState<"library" | "upload">("library");
  const [selectedLibraryVideoIds, setSelectedLibraryVideoIds] = useState<string[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState("all");
  const [libraryLevelFilter, setLibraryLevelFilter] = useState("all");
  const [videoFormData, setVideoFormData] = useState({
    title: "",
    description: "",
    trainer_name: "",
    video_url_small: "",
    video_url_large: "",
    thumbnail_url: "",
    duration: "05:00",
    category: "Weight Loss",
    level: "Beginner",
    status: "published",
    audience: "all",
    is_published: true,
  });

  const { user } = useAuth();

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const today = new Date().toISOString().split('T')[0];

  const sessionRegex = [
    {
      platform: "google_meet",
      regex: /https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/,
    },
    {
      platform: "zoom",
      regex: /^(https?:\/\/)?(www\.)?([a-z0-9-]+\.)?zoom\.us\/(j|wc)\/\d+$/i,
    },
    {
      platform: "whatsapp",
      regex: /^(https?:\/\/)?(www\.)?(wa\.me\/\d+|chat\.whatsapp\.com\/[A-Za-z0-9]+)$/i,
    },
    {
      platform: "youtube",
      regex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      regex2: /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+$/i
    },
  ];

  const getNearestHourTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toTimeString().slice(0, 5);
  };

  const [formData, setFormData] = useState({
    title: "",
    trainer: "",
    platform: "zoom",
    type: "live",
    link: "",
    date: today,
    time: getNearestHourTime(),
    isMass: true,
    selectedClientIds: [] as string[],
    category: "",
    level: "",
    duration: "",
    audience: "all",
    status: "published",
    description: "",
    thumbnail: "" as any,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      trainer: "",
      platform: "zoom",
      type: "live",
      link: "",
      date: today,
      time: getNearestHourTime(),
      isMass: true,
      selectedClientIds: [],
      category: "",
      level: "",
      duration: "",
      audience: "all",
      status: "published",
      description: "",
      thumbnail: "",
    });
    setEditingTutorial(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: roleData, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "user");

      if (roleErr) {
        console.error("Role fetch error:", roleErr);
        return;
      }

      const userIds = roleData.map((r) => r.user_id);

      const [sessRes, clientRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("*, session_assignments(client_id)")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds)
          .order("created_at", { ascending: false }),
      ]);

      if (sessRes.error) throw sessRes.error;
      setSessions(sessRes.data || []);
      if (clientRes.data) setClients(clientRes.data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTutorials = async () => {
    try {
      setLoadingTutorials(true);
      const { data: catData } = await supabase
        .from("tutorial_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setAllCategories(catData || []);

      const { data: lvlData } = await supabase
        .from("tutorial_levels")
        .select("*")
        .order("level");
      setAllLevels(lvlData || []);

      // 1. Fetch raw tutorials
      const { data: tutData } = await supabase
        .from("tutorials")
        .select("*")
        .or("type.eq.fitness,type.is.null")
        .order("created_at", { ascending: false });

      const catMap = new Map((catData || []).map((c: any) => [String(c.id), c]));
      const lvlMap = new Map((lvlData || []).map((l: any) => [String(l.id), l]));

      const enriched = (tutData || []).map((t: any) => ({
        ...t,
        tutorial_categories: catMap.get(String(t.category_id)) || null,
        tutorial_levels: lvlMap.get(String(t.level_id)) || null,
      }));

      setTutorials(enriched);

      // 2. Fetch playlists from tutorial_playlists
      const { data: playlistData, error: playlistErr } = await supabase
        .from("tutorial_playlists")
        .select("*, tutorial_playlist_videos(id, sort_order, tutorials(*))")
        .order("created_at", { ascending: false });

      if (!playlistErr && playlistData && playlistData.length > 0) {
        const formattedPlaylists = playlistData.map((pl: any) => {
          const vids = (pl.tutorial_playlist_videos || [])
            .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((pv: any) => pv.tutorials)
            .filter(Boolean);
          return {
            ...pl,
            videos: vids,
            video_count: vids.length,
          };
        });
        setPlaylists(formattedPlaylists);
      } else {
        // Fallback: group existing tutorials into playlists dynamically
        const groupMap = new Map<string, any>();
        enriched.forEach((t: any) => {
          const catName = t.tutorial_categories?.name || t.category || "General Fitness";
          const lvlName = t.tutorial_levels?.level ? `Level ${t.tutorial_levels.level}` : (t.level || "Beginner");
          const key = `${catName} - ${lvlName}`;
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              id: `pl-fallback-${key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              title: `${catName} Series`,
              description: `Complete ${lvlName} ${catName} workout video collection.`,
              category: catName,
              level: lvlName,
              thumbnail_url: t.thumbnail_url || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
              is_published: true,
              videos: [],
              video_count: 0
            });
          }
          groupMap.get(key).videos.push(t);
          groupMap.get(key).video_count = groupMap.get(key).videos.length;
        });

        const fallbackList = Array.from(groupMap.values());
        setPlaylists(fallbackList);
      }
    } catch (error: any) {
      console.error("Error fetching tutorials/playlists:", error);
    } finally {
      setLoadingTutorials(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from("workout_groups")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
    }
  };

  useEffect(() => {
    const profileSubscription = supabase
      .channel('admin-profile-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    const getProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();

          if (data?.full_name) {
            setFormData(prev => ({ ...prev, trainer: data.full_name }));
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };

    getProfile();
    fetchData();
    fetchTutorials();
    fetchGroups();

    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, []);

  const generateMeetLink = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const toastId = toast.loading("Generating Google Meet link...");
      try {
        const startDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
        const endDate = new Date(`${formData.date}T${formData.time}:00Z`);
        endDate.setHours(endDate.getHours() + 1);
        const endDateTime = endDate.toISOString();

        const response = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              summary: formData.title || "Fitness Session",
              description: `Trainer: ${formData.trainer}`,
              start: { dateTime: startDateTime },
              end: { dateTime: endDateTime },
              conferenceData: {
                createRequest: {
                  requestId: Math.random().toString(36).substring(7),
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              },
            }),
          }
        );

        const data = await response.json();
        if (data.hangoutLink) {
          setFormData(prev => ({ ...prev, link: data.hangoutLink, platform: 'google_meet' }));
          toast.success("Google Meet link ready!", { id: toastId });
        } else {
          toast.error("Google rejected the request.", { id: toastId });
        }
      } catch (error) {
        toast.error("Generation failed.", { id: toastId });
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const getLiveStatus = (scheduledAt: string, type: string) => {
    if (type !== 'live') return false;
    const startTime = new Date(scheduledAt).getTime();
    const now = new Date().getTime();
    const duration = 60 * 60 * 1000;
    return now >= startTime && now <= (startTime + duration);
  };

  const isPastSession = (scheduledAt: string, type: string) => {
    if (type !== 'live') return false;
    const startTime = new Date(scheduledAt).getTime();
    const now = new Date().getTime();
    const duration = 60 * 60 * 1000;
    return now > (startTime + duration);
  };

  const handleToggleClient = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedClientIds: prev.selectedClientIds.includes(clientId)
        ? prev.selectedClientIds.filter(id => id !== clientId)
        : [...prev.selectedClientIds, clientId]
    }));
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = reject;
    });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExt = ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext || '');
    const isAllowedMime = file.type.startsWith('video/') || ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type);

    if (!isAllowedMime && !isAllowedExt) {
      toast.error("Please upload a valid video file (MP4, WebM, MOV)");
      e.target.value = "";
      return;
    }

    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      toast.error("Video size should be less than 200 MB");
      e.target.value = "";
      return;
    }

    let formattedDuration = "00:00";
    try {
      const durSecs = await getVideoDuration(file);
      if (durSecs && !isNaN(durSecs)) {
        const mins = Math.floor(durSecs / 60);
        const secs = Math.floor(durSecs % 60);
        formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    } catch (err) {
      console.warn("Could not calculate video duration:", err);
    }

    setLoading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `sessions/session_vid_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage.from('tutorials').upload(fileName, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('tutorials').getPublicUrl(fileName);
      setFormData(prev => ({
        ...prev,
        link: data.publicUrl,
        duration: formattedDuration
      }));
      toast.success(`Video uploaded successfully! Auto-detected duration: ${formattedDuration}`);
    } catch (err: any) {
      console.error("Video upload error:", err);
      toast.error("Video upload failed: " + (err.message || "Storage error"));
      e.target.value = "";
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail must be an image file (PNG, JPG, WebP)");
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `sessions/thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("tutorials")
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("tutorials").getPublicUrl(fileName);
      setFormData((prev: any) => ({ ...prev, thumbnail: data.publicUrl }));
      toast.success("Thumbnail uploaded successfully!");
    } catch (err: any) {
      console.error("Thumbnail upload error:", err);
      toast.error("Thumbnail upload failed: " + (err.message || "Storage error"));
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail must be an image file (PNG, JPG, WebP)");
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `playlists/thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("tutorials")
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("tutorials").getPublicUrl(fileName);
      setPlaylistFormData((prev: any) => ({ ...prev, thumbnail_url: data.publicUrl }));
      toast.success("Playlist thumbnail uploaded successfully!");
    } catch (err: any) {
      console.error("Thumbnail upload error:", err);
      toast.error("Thumbnail upload failed: " + (err.message || "Storage error"));
    } finally {
      setLoading(false);
    }
  };

  const handleVideoThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Thumbnail must be an image file (PNG, JPG, WebP)");
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `videos/thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage
        .from("tutorials")
        .upload(fileName, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("tutorials").getPublicUrl(fileName);
      setVideoFormData((prev: any) => ({ ...prev, thumbnail_url: data.publicUrl }));
      toast.success("Video thumbnail uploaded successfully!");
    } catch (err: any) {
      console.error("Thumbnail upload error:", err);
      toast.error("Thumbnail upload failed: " + (err.message || "Storage error"));
    } finally {
      setLoading(false);
    }
  };

  const isValidUUID = (str: any) =>
    typeof str === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const handleAddSession = async () => {
    if (formData.type === "live") {
      if (!formData.link || !formData.title) return toast.error("Title and Link are required");
    }
    if (isPublishing) return;

    const scheduledDateTime = new Date(`${formData.date}T${formData.time}:00`);
    const now = new Date();

    if (formData.type === "live" && formData.platform) {
      const platformDetails = sessionRegex.find((p) => p.platform === formData.platform);
      if (platformDetails) {
        const isValid = platformDetails.regex.test(formData.link) || (platformDetails.regex2 && platformDetails.regex2.test(formData.link));
        if (!isValid) {
          toast.error(`Please Give Correct ${formData.platform} Link`);
          return;
        }
      }
    }

    if (formData.type === 'live' && scheduledDateTime <= now) {
      toast.error("Please select a future time for live sessions");
      return;
    }

    setIsPublishing(true);

    try {
      const { data: newSession, error: sessErr } = await supabase.from("sessions").insert([{
        title: formData.title,
        instructor: formData.trainer || "Coach",
        platform: formData.platform,
        type: formData.type,
        meeting_link: formData.link,
        scheduled_at: scheduledDateTime.toISOString(),
        admin_is_mass: formData.isMass,
        admin_status: "upcoming"
      }]).select().single();

      if (sessErr) {
        toast.error(sessErr.message);
        setIsPublishing(false);
        return;
      }

      if (!formData.isMass && formData.selectedClientIds.length > 0 && formData.type === "live") {
        const assignments = formData.selectedClientIds.map(cid => ({
          session_id: newSession.id,
          client_id: cid
        }));

        const notifications = formData.selectedClientIds.map((cid) => ({
          user_id: cid,
          title: `You have a new Session: ${formData.title}`,
          description: `Join the session at ${scheduledDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          notification_date: scheduledDateTime.toISOString().split("T")[0],
          related_id: newSession.id,
        }));

        await supabase.from("notifications").insert(notifications);
        await supabase.from("session_assignments").insert(assignments);
      } else if (formData.isMass && formData.type === "live") {
        const notifications = filteredClients.map((cid) => ({
          user_id: cid.user_id,
          title: `New Session: ${formData.title}`,
          description: `Join the session at ${scheduledDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          notification_date: scheduledDateTime.toISOString().split("T")[0],
          related_id: newSession.id
        }));

        await supabase.from("notifications").insert(notifications);
      }

      await supabase.from("activities").insert([{
        admin_user_name: formData.trainer || "Coach",
        admin_action_detail: `Scheduled ${formData.type} session: ${formData.title}`,
        admin_activity_type: formData.type === 'tutorial' ? 'video' : 'session',
        admin_created_at: new Date().toISOString()
      }]);

      toast.success("Session published successfully!");
      setIsModalOpen(false);
      setSearchTerm("");
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveTutorial = async () => {
    if (!formData.title || !formData.link) {
      toast.error("Title and Video URL/file are required");
      return;
    }

    setIsPublishing(true);

    try {
      const tutorialData = {
        title: formData.title,
        description: formData.description || "",
        url: formData.link,
        thumbnail_url: formData.thumbnail || (editingTutorial ? editingTutorial.thumbnail_url : null),
        category_id: isValidUUID(formData.category) ? formData.category : null,
        level_id: isValidUUID(formData.level) ? formData.level : null,
        duration: formData.duration || "00:00",
        audience: formData.audience || "all",
        status: formData.status || "published",
        views: editingTutorial ? editingTutorial.views || 0 : 0,
        type: "fitness",
      };

      if (editingTutorial) {
        const { error } = await supabase
          .from("tutorials")
          .update(tutorialData)
          .eq("id", editingTutorial.id);

        if (error) throw error;
        toast.success("Tutorial updated successfully!");
      } else {
        const { error } = await supabase
          .from("tutorials")
          .insert([tutorialData]);

        if (error) throw error;
        toast.success("Tutorial created successfully!");
      }

      setIsModalOpen(false);
      resetForm();
      fetchTutorials();
    } catch (error: any) {
      console.error("Error saving tutorial:", error?.message || error);
      toast.error(error?.message || error?.details || "Failed to save tutorial");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: string, title: string, trainer: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const { error } = await supabase.from("sessions").delete().eq("id", id);
    await supabase.from('notifications').delete().eq('related_id', id);
    if (!error) {
      await supabase.from("activities").insert([{
        admin_user_name: trainer || "Coach",
        admin_action_detail: `Deleted session: ${title}`,
        admin_activity_type: "deletion",
        admin_created_at: new Date().toISOString()
      }]);
      toast.success("Session removed");
      fetchData();
    }
  };

  const handleDeleteTutorial = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      if (String(id).startsWith("v-local")) {
        setTutorials((prev) => prev.filter((t) => String(t.id) !== String(id)));
        toast.success("Tutorial deleted successfully!");
        return;
      }
      const { error } = await supabase.from("tutorials").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tutorial deleted successfully!");
      fetchTutorials();
    } catch (error: any) {
      toast.error("Failed to delete tutorial: " + (error.message || "Error deleting tutorial"));
    }
  };

  // --- Playlist System Handlers ---
  const handleSavePlaylist = async () => {
    if (!playlistFormData.title) return toast.error("Playlist Title is required");
    try {
      setIsPublishing(true);
      const payload = {
        title: playlistFormData.title,
        description: playlistFormData.description,
        category: playlistFormData.category || "Cardio",
        level: playlistFormData.level || "Beginner",
        thumbnail_url: playlistFormData.thumbnail_url || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
        is_published: playlistFormData.is_published,
      };

      if (editingPlaylist && !editingPlaylist.id.startsWith("pl-")) {
        const { error } = await supabase.from("tutorial_playlists").update(payload).eq("id", editingPlaylist.id);
        if (error) throw error;
        toast.success("Playlist updated successfully!");
      } else {
        const { data: newPlData, error } = await supabase.from("tutorial_playlists").insert([payload]).select().single();
        if (error || !newPlData) {
          // Local fallback
          const newPl = {
            id: `pl-local-${Date.now()}`,
            ...payload,
            videos: [],
            video_count: 0,
          };
          setPlaylists((prev) => [newPl, ...prev]);
          setSelectedPlaylist(newPl);
          toast.success("Playlist created!");
        } else {
          const newPl = { ...newPlData, videos: [], video_count: 0 };
          setPlaylists((prev) => [newPl, ...prev]);
          setSelectedPlaylist(newPl);
          toast.success("Playlist created successfully!");
        }
      }

      setIsPlaylistModalOpen(false);
      setEditingPlaylist(null);
      setPlaylistFormData({
        title: "",
        description: "",
        category: "Cardio",
        level: "Beginner",
        thumbnail_url: "",
        is_published: true,
      });
      fetchTutorials();
    } catch (err: any) {
      toast.error(err.message || "Failed to save playlist");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeletePlaylist = async (playlist: any) => {
    if (!confirm(`Are you sure you want to delete playlist "${playlist.title}"?`)) return;
    try {
      if (!playlist.id.startsWith("pl-")) {
        await supabase.from("tutorial_playlists").delete().eq("id", playlist.id);
      }
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
      if (selectedPlaylist?.id === playlist.id) {
        setSelectedPlaylist(null);
      }
      toast.success("Playlist deleted!");
    } catch (err: any) {
      toast.error("Failed to delete playlist: " + err.message);
    }
  };

  const handleBatchAddVideosToPlaylist = async (videoIds: string[]) => {
    if (!selectedPlaylist) return toast.error("No playlist selected");
    if (!videoIds.length) return toast.error("Please select at least one video");
    try {
      setIsPublishing(true);
      const existingIds = new Set((selectedPlaylist.videos || []).map((v: any) => String(v.id)));
      const toAddIds = videoIds.filter((id) => !existingIds.has(String(id)));

      if (toAddIds.length === 0) {
        toast.info("Selected videos are already in this playlist.");
        setIsVideoModalOpen(false);
        setSelectedLibraryVideoIds([]);
        return;
      }

      const newVideos = tutorials.filter((t) => toAddIds.includes(String(t.id)));

      if (selectedPlaylist?.id && !selectedPlaylist.id.startsWith("pl-local") && !selectedPlaylist.id.startsWith("pl-fallback") && !selectedPlaylist.id.startsWith("pl-user")) {
        const joinRows = newVideos.map((v, idx) => ({
          playlist_id: selectedPlaylist.id,
          video_id: v.id,
          sort_order: (selectedPlaylist.videos?.length || 0) + idx + 1,
        }));
        await supabase.from("tutorial_playlist_videos").insert(joinRows);
      }

      const updatedVideos = [...(selectedPlaylist.videos || []), ...newVideos];
      const updatedPl = { ...selectedPlaylist, videos: updatedVideos, video_count: updatedVideos.length };
      setSelectedPlaylist(updatedPl);
      setPlaylists((prev) => prev.map((p) => (p.id === updatedPl.id ? updatedPl : p)));

      toast.success(`Added ${newVideos.length} video(s) to playlist!`);
      setIsVideoModalOpen(false);
      setSelectedLibraryVideoIds([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to add videos");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUploadSmallVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 500 MB client-side guard
    const MAX_MB = 500;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum allowed size is ${MAX_MB} MB.`);
      return;
    }
    try {
      toast.info("Uploading small video (360p/480p)...");
      let formattedDuration = "";
      try {
        const durSecs = await getVideoDuration(file);
        if (durSecs && !isNaN(durSecs)) {
          const mins = Math.floor(durSecs / 60);
          const secs = Math.floor(durSecs % 60);
          formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      } catch (durErr) {
        console.warn("Could not extract duration:", durErr);
      }

      const fileExt = file.name.split(".").pop();
      // Must upload into the 'tutorials/' subfolder — bucket RLS policy requires this path
      const fileName = `tutorials/small_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('tutorials')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('tutorials').getPublicUrl(fileName);
      setVideoFormData((prev) => ({
        ...prev,
        video_url_small: data.publicUrl,
        duration: formattedDuration || prev.duration || "05:00"
      }));
      toast.success("Small video uploaded! Duration auto-set: " + (formattedDuration || "auto"));
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("row-level security")) {
        toast.error("Upload blocked: storage permission denied. Please check Supabase bucket RLS policy.");
      } else if (msg.includes("maximum allowed size") || err.statusCode === '413') {
        toast.error("File exceeds Supabase storage limit. Please compress the video or increase the bucket size limit.");
      } else {
        toast.error("Upload failed: " + msg);
      }
    }
  };

  const handleUploadLargeVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 500 MB client-side guard
    const MAX_MB = 500;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum allowed size is ${MAX_MB} MB. Please compress the video first.`);
      return;
    }
    try {
      toast.info("Uploading large video (720p/1080p)... This may take a moment.");
      let formattedDuration = "";
      try {
        const durSecs = await getVideoDuration(file);
        if (durSecs && !isNaN(durSecs)) {
          const mins = Math.floor(durSecs / 60);
          const secs = Math.floor(durSecs % 60);
          formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
      } catch (durErr) {
        console.warn("Could not extract duration:", durErr);
      }

      const fileExt = file.name.split(".").pop();
      // Must upload into the 'tutorials/' subfolder — bucket RLS policy requires this path
      const fileName = `tutorials/large_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('tutorials')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('tutorials').getPublicUrl(fileName);
      setVideoFormData((prev) => ({
        ...prev,
        video_url_large: data.publicUrl,
        duration: formattedDuration || prev.duration || "05:00"
      }));
      toast.success("Large video uploaded! Duration auto-set: " + (formattedDuration || "auto"));
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("row-level security")) {
        toast.error("Upload blocked: storage permission denied. Please check Supabase bucket RLS policy.");
      } else if (msg.includes("maximum allowed size") || err.statusCode === '413') {
        toast.error("File exceeds Supabase storage limit. Please compress the video or increase the bucket size limit in Supabase Dashboard → Storage → tutorials → Edit Bucket.");
      } else {
        toast.error("Upload failed: " + msg);
      }
    }
  };

  const handleSaveVideoToPlaylist = async () => {
    if (!videoFormData.title) return toast.error("Video Title is required");
    if (!selectedPlaylist) return toast.error("No playlist selected");
    try {
      setIsPublishing(true);
      const mainUrl = videoFormData.video_url_large || videoFormData.video_url_small || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

      // Resolve category_id and level_id from allCategories and allLevels, ensuring strictly valid UUID format
      const catObj = allCategories.find(
        (c: any) => (c.id && isValidUUID(c.id) && c.id === videoFormData.category) || c.name === videoFormData.category || c.name === selectedPlaylist.category
      );
      const lvlObj = allLevels.find(
        (l: any) => (l.id && isValidUUID(l.id) && l.id === videoFormData.level) || String(l.level) === String(videoFormData.level) || l.name === videoFormData.level
      );

      const resolvedCategoryId = (catObj?.id && isValidUUID(catObj.id))
        ? catObj.id
        : (isValidUUID(videoFormData.category) ? videoFormData.category : null);

      const resolvedLevelId = (lvlObj?.id && isValidUUID(lvlObj.id))
        ? lvlObj.id
        : (isValidUUID(videoFormData.level) ? videoFormData.level : null);

      const videoPayload: any = {
        title: videoFormData.title,
        description: videoFormData.description || "",
        trainer_name: videoFormData.trainer_name || "Trainer 1",
        url: mainUrl,
        video_url_small: videoFormData.video_url_small || mainUrl,
        video_url_large: videoFormData.video_url_large || mainUrl,
        thumbnail_url: videoFormData.thumbnail_url || selectedPlaylist.thumbnail_url || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
        duration: videoFormData.duration || "05:00",
        category_id: resolvedCategoryId,
        level_id: resolvedLevelId,
        audience: videoFormData.audience || "all",
        status: videoFormData.status || "published",
        type: "fitness",
      };

      let newVideo = null;
      const { data: insertedData, error: vidError } = await supabase
        .from("tutorials")
        .insert([videoPayload])
        .select()
        .single();

      if (vidError) {
        console.warn("Primary tutorial insert failed, retrying with core schema fields:", vidError.message);
        // Fallback retry with core columns only in case of column schema mismatch
        const corePayload = {
          title: videoFormData.title,
          description: videoFormData.description || "",
          trainer_name: videoFormData.trainer_name || "Trainer 1",
          url: mainUrl,
          thumbnail_url: videoFormData.thumbnail_url || selectedPlaylist.thumbnail_url || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
          duration: videoFormData.duration || "05:00",
          category_id: resolvedCategoryId,
          level_id: resolvedLevelId,
          audience: videoFormData.audience || "all",
        };
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("tutorials")
          .insert([corePayload])
          .select()
          .single();

        if (fallbackErr) {
          console.error("Supabase tutorial insert error:", fallbackErr);
          toast.error("Failed to upload video to backend: " + fallbackErr.message);
          throw fallbackErr;
        }
        newVideo = fallbackData;
      } else {
        newVideo = insertedData;
      }

      const createdVid = newVideo;

      // Update tutorials state so it's in the master library as well
      setTutorials((prev) => [createdVid, ...prev]);

      let dbPlaylistId = selectedPlaylist?.id;
      if (!dbPlaylistId || dbPlaylistId.startsWith("pl-")) {
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
            .insert([{
              title: selectedPlaylist.title || "Specialized Fitness Series",
              description: selectedPlaylist.description || "Fitness video series",
              category: selectedPlaylist.category || "General",
              level: selectedPlaylist.level || "Beginner",
              thumbnail_url: selectedPlaylist.thumbnail_url || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
              is_published: true,
            }])
            .select()
            .single();

          if (createdPl?.id) {
            dbPlaylistId = createdPl.id;
          }
        }
      }

      if (dbPlaylistId && createdVid?.id && !String(createdVid.id).startsWith("v-local-")) {
        await supabase.from("tutorial_playlist_videos").insert([{
          playlist_id: dbPlaylistId,
          video_id: createdVid.id,
          sort_order: (selectedPlaylist.videos?.length || 0) + 1,
        }]);
      }

      const updatedVideos = [...(selectedPlaylist.videos || []), createdVid];
      const updatedPl = { ...selectedPlaylist, videos: updatedVideos, video_count: updatedVideos.length };
      setSelectedPlaylist(updatedPl);
      setPlaylists((prev) => prev.map((p) => (p.id === updatedPl.id ? updatedPl : p)));

      toast.success("New video created and added to playlist!");
      setIsVideoModalOpen(false);
      setVideoFormData({
        title: "",
        description: "",
        trainer_name: "",
        video_url_small: "",
        video_url_large: "",
        thumbnail_url: "",
        duration: "05:00",
        category: selectedPlaylist.category || "Weight Loss",
        level: selectedPlaylist.level || "Beginner",
        status: "draft",
        audience: "customers",
        is_published: false,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to add video");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteVideoFromPlaylist = async (videoId: string) => {
    if (!selectedPlaylist) return;
    if (!confirm("Remove this video from playlist? (The video will stay in your Master Library database)")) return;
    try {
      if (!selectedPlaylist.id.startsWith("pl-") && !String(videoId).startsWith("v-local-")) {
        await supabase
          .from("tutorial_playlist_videos")
          .delete()
          .eq("playlist_id", selectedPlaylist.id)
          .eq("video_id", videoId);
      }
      const updatedVideos = (selectedPlaylist.videos || []).filter((v: any) => String(v.id) !== String(videoId));
      const updatedPl = { ...selectedPlaylist, videos: updatedVideos, video_count: updatedVideos.length };
      setSelectedPlaylist(updatedPl);
      setPlaylists((prev) => prev.map((p) => (p.id === updatedPl.id ? updatedPl : p)));
      toast.success("Video removed from playlist (remains in Master Library)");
    } catch (err: any) {
      toast.error("Failed to remove video: " + err.message);
    }
  };

  const handleDeleteAllVideos = async () => {
    if (!window.confirm("Are you sure you want to delete ALL tutorial videos and playlists from the database? This action cannot be undone.")) {
      return;
    }
    try {
      setIsPublishing(true);
      toast.info("Deleting all tutorial videos and playlists...");

      // 1. Delete playlist-video links
      await supabase.from("tutorial_playlist_videos").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // 2. Delete playlists
      await supabase.from("tutorial_playlists").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      // 3. Delete tutorials
      await supabase.from("tutorials").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      setPlaylists([]);
      setTutorials([]);
      setSelectedPlaylist(null);
      toast.success("All tutorial videos and playlists deleted successfully!");
    } catch (err: any) {
      toast.error("Failed to delete videos: " + (err.message || "Database error"));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEditTutorial = (tut: any) => {
    setEditingTutorial(tut);
    setFormData({
      title: tut.title || "",
      trainer: "",
      platform: "zoom",
      type: "tutorial",
      link: tut.url || "",
      date: today,
      time: getNearestHourTime(),
      isMass: true,
      selectedClientIds: [],
      category: tut.category_id || "",
      level: tut.level_id || "",
      duration: tut.duration || "",
      audience: tut.audience || "all",
      status: tut.status || "published",
      description: tut.description || "",
      thumbnail: tut.thumbnail_url || "",
    });
    setIsModalOpen(true);
  };

  const filteredTutorials = tutorials.filter((tut) => {
    const matchesSearch = tut.title?.toLowerCase().includes(tutorialSearch.toLowerCase()) ||
      tut.description?.toLowerCase().includes(tutorialSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Manage your Live workouts and Video Tutorials."
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => { fetchData(); fetchTutorials(); }}
            className="text-slate-400 shrink-0 h-9 w-9 border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading || loadingTutorials ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  if (activeTab === "tutorials" || activeTab === "tutorial") {
                    setFormData(prev => ({ ...prev, type: "tutorial" }));
                  }
                }}
                className="bg-[#07AC7D] hover:bg-[#06966D] text-white shadow-sm whitespace-nowrap text-xs h-9 px-3 font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> {(activeTab === "tutorials" || activeTab === "tutorial") ? "Add Tutorial" : "Add Session"}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-y-auto overflow-x-hidden p-5">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-800">
                  {formData.type === "tutorial"
                    ? editingTutorial ? "Edit Video Tutorial" : "Add New Video Tutorial"
                    : "Schedule New Session"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {formData.type === "tutorial"
                    ? "Fill in the details below to publish or update a video tutorial."
                    : "Fill in the details below to schedule a new live workout session."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Session Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) =>
                        setFormData({ ...formData, type: v })
                      }
                    >
                      <SelectTrigger className="border-slate-200 bg-slate-50/50 h-9 text-sm">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live Streaming</SelectItem>
                        <SelectItem value="tutorial">Video Tutorial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Title</Label>
                    <Input
                      value={formData.title || ""}
                      className="border-slate-200 h-9 text-sm"
                      placeholder={formData.type === "tutorial" ? "e.g. Full Body HIIT Guide" : "e.g. Morning Cardio"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          title: e.target.value.slice(0, 50),
                        })
                      }
                    />
                  </div>
                </div>

                {formData.type === "tutorial" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Category</Label>
                        <Select
                          value={formData.category || ""}
                          onValueChange={(v) => setFormData({ ...formData, category: v })}
                        >
                          <SelectTrigger className="border-slate-200 h-9 text-sm">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {allCategories.length > 0 ? (
                              allCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                                <SelectItem value="Strength Training">Strength Training</SelectItem>
                                <SelectItem value="Cardio">Cardio</SelectItem>
                                <SelectItem value="Yoga & Flexibility">Yoga & Flexibility</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Level</Label>
                        <Select
                          value={formData.level || ""}
                          onValueChange={(v) => setFormData({ ...formData, level: v })}
                        >
                          <SelectTrigger className="border-slate-200 h-9 text-sm">
                            <SelectValue placeholder="Select Level" />
                          </SelectTrigger>
                          <SelectContent>
                            {allLevels.length > 0 ? (
                              allLevels.map((lvl) => (
                                <SelectItem key={lvl.id} value={lvl.id}>Level {lvl.level}</SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="1">Level 1 (Beginner)</SelectItem>
                                <SelectItem value="2">Level 2 (Intermediate)</SelectItem>
                                <SelectItem value="3">Level 3 (Advanced)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Video Source</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={tutorialSource === "upload" ? "default" : "outline"}
                          className={`flex-1 h-8 text-xs ${tutorialSource === "upload" ? "bg-[#07AC7D] hover:bg-[#06966D]" : ""}`}
                          onClick={() => setTutorialSource("upload")}
                        >
                          Upload File
                        </Button>
                        <Button
                          type="button"
                          variant={tutorialSource === "link" ? "default" : "outline"}
                          className={`flex-1 h-8 text-xs ${tutorialSource === "link" ? "bg-[#07AC7D] hover:bg-[#06966D]" : ""}`}
                          onClick={() => setTutorialSource("link")}
                        >
                          From Link
                        </Button>
                      </div>
                    </div>

                    {tutorialSource === "upload" ? (
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Upload Video (MP4 / WebM, max 200MB)</Label>
                        <Input
                          type="file"
                          accept="video/mp4,video/webm"
                          className="border-slate-200 h-9 text-sm cursor-pointer"
                          onChange={handleVideoUpload}
                        />
                        {formData.link && (
                          <p className="text-[11px] text-emerald-600 font-medium truncate">Video uploaded: {formData.link}</p>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Video URL / Embed Link</Label>
                        <Input
                          value={formData.link || ""}
                          placeholder="https://..."
                          className="border-slate-200 h-9 text-sm"
                          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Thumbnail Image</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          className="border-slate-200 h-9 text-sm cursor-pointer"
                          onChange={handleThumbnailUpload}
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-xs font-semibold text-slate-600">Duration</Label>
                        <div className="h-9 px-3 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-600 flex items-center">
                          {formData.duration ? `${formData.duration} (Auto-detected)` : "Auto-calculated on video upload"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Description</Label>
                      <Textarea
                        value={formData.description || ""}
                        placeholder="Brief summary of this video tutorial..."
                        className="border-slate-200 text-sm min-h-[70px]"
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {formData.type === "live" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-slate-600">Date</Label>
                          <Input
                            type="date"
                            min={today}
                            className="border-slate-200 h-9 text-sm"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-slate-600">Time</Label>
                          <Input
                            type="time"
                            className="border-slate-200 h-9 text-sm"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <div>
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                          Visibility Mode
                        </Label>
                        <p className="text-[10px] text-blue-400">
                          Who can see this {formData.type === "live" ? "session" : "library video"}?
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Private</span>
                        <Switch
                          checked={formData.isMass}
                          onCheckedChange={(v) => setFormData({ ...formData, isMass: v })}
                        />
                        <span className="text-[10px] text-slate-600 font-medium">Public (All)</span>
                      </div>
                    </div>

                    {!formData.isMass && (
                      <div className="border rounded-xl p-3 sm:p-4 bg-slate-900/90 border-slate-700 max-w-full overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                          <Label className="text-xs font-semibold text-[#0ea5e9]">
                            Assign to Clients ({formData.selectedClientIds.length})
                          </Label>
                          <div className="relative w-full sm:w-auto sm:flex-1">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            <Input
                              placeholder="Search name..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="h-8 text-xs pl-7 pr-2 border-slate-700 bg-slate-800 text-white w-full placeholder:text-slate-500"
                            />
                          </div>
                        </div>
                        <ScrollArea className="h-[120px] pr-2">
                          {filteredClients.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-4">No matching clients found.</p>
                          ) : (
                            filteredClients.map((client) => (
                              <div
                                key={client.user_id}
                                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 mr-1"
                              >
                                <div className="flex flex-col min-w-0 flex-1 mr-2">
                                  <span className="text-xs font-medium text-white truncate">{client.full_name}</span>
                                  <span className="text-[9px] text-slate-500 uppercase font-mono">{client.user_id.slice(0, 8)}...</span>
                                </div>
                                <Checkbox
                                  checked={formData.selectedClientIds.includes(client.user_id)}
                                  onCheckedChange={() => handleToggleClient(client.user_id)}
                                  className="shrink-0 border-slate-500 data-[state=checked]:bg-[#0ea5e9] data-[state=checked]:border-[#0ea5e9]"
                                />
                              </div>
                            ))
                          )}
                        </ScrollArea>
                      </div>
                    )}

                    {formData.type === "live" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                          <Label className="text-xs text-slate-600">Platform</Label>
                          <Select
                            value={formData.platform}
                            onValueChange={(v) => setFormData({ ...formData, platform: v })}
                          >
                            <SelectTrigger className="border-slate-200 h-9 text-sm">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="zoom">Zoom</SelectItem>
                              <SelectItem value="google_meet">Google Meet</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-slate-600">Video Link</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-6 text-[10px] text-[#0ea5e9] px-2 flex items-center gap-1"
                              onClick={() => generateMeetLink()}
                            >
                              <Video className="w-3 h-3" /> Auto-Meet
                            </Button>
                          </div>
                          <Input
                            className="border-slate-200 h-9 text-sm"
                            placeholder="Paste link here..."
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-slate-600">Choose File</Label>
                        <Input
                          type="file"
                          className="border-slate-200 h-9 text-sm"
                          onChange={handleVideoUpload}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              <DialogFooter className="mt-2">
                <Button
                  onClick={formData.type === "tutorial" ? handleSaveTutorial : handleAddSession}
                  disabled={isPublishing}
                  className="w-full bg-[#07AC7D] hover:bg-[#06966D] text-white font-semibold text-sm h-9"
                >
                  {isPublishing
                    ? "Saving..."
                    : formData.type === "tutorial"
                      ? editingTutorial ? "Update Tutorial" : "Save Tutorial"
                      : "Publish Live Session"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="w-full overflow-x-auto mb-2">
          <SegmentedControl
            options={[
              { label: "Live Sessions", value: "live", icon: <Video className="w-4 h-4" /> },
              { label: "Video Tutorials", value: "tutorials", icon: <Play className="w-4 h-4" /> },
            ]}
            value={activeTab === "tutorial" ? "tutorials" : activeTab}
            onChange={(val) => setActiveTab(val as any)}
            size="md"
          />
        </div>

        {/* Tab 1: Live Sessions */}
        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <StatCard
              title="Live Now"
              value={sessions.filter((s) => getLiveStatus(s.scheduled_at, s.type)).length}
              icon={<Video className="w-4 h-4 text-[#07AC7D]" />}
              bgColor="bg-[#F1FAF6]"
            />
            <StatCard
              title="Total Workouts"
              value={sessions.filter(s => s.type === "live").length}
              icon={<CalendarIcon className="w-4 h-4 text-[#07AC7D]" />}
              bgColor="bg-[#F1FAF6]"
            />
            <StatCard
              title="Active Clients"
              value={clients.length}
              icon={<UsersIcon className="w-4 h-4 text-slate-400" />}
              bgColor="bg-slate-50"
            />
          </div>

          <Card className="border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-[18px] font-semibold text-[#111827]">
                Live Workout Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-4">
              <div className="space-y-3">
                {loading ? (
                  <p className="text-center py-6 text-slate-400 text-sm">Syncing database...</p>
                ) : sessions.filter(s => s.type === "live").length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-sm">No live sessions scheduled.</p>
                ) : (
                  sessions.filter(s => s.type === "live").map((session) => {
                    const isLive = getLiveStatus(session.scheduled_at, session.type);
                    const isPast = isPastSession(session.scheduled_at, session.type);
                    const participantCount = session.admin_is_mass
                      ? "ALL"
                      : session.session_assignments?.length || 0;
                    const sessionTime = new Date(session.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });

                    return (
                      <div
                        key={session.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all ${isPast
                          ? "opacity-60 bg-slate-50/50 border-slate-200"
                          : "hover:border-[#07AC7D]/40 hover:bg-[#F1FAF6]/40 border-slate-200"
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-[#111827] truncate">
                              {session.title}
                            </h4>
                            <div className="flex gap-1.5">
                              {isLive && (
                                <Badge className="bg-[#07AC7D] text-white text-xs font-semibold px-2 py-0.5">
                                  LIVE NOW
                                </Badge>
                              )}
                              {isPast && (
                                <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 font-semibold">
                                  PAST
                                </Badge>
                              )}
                              {session.admin_is_mass && (
                                <Badge variant="outline" className="text-xs border-emerald-200 text-[#07AC7D] px-2 py-0.5 font-semibold">
                                  PUBLIC
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-[#526581] font-normal">
                            Coach {session.instructor}
                          </p>
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 text-[#07AC7D]" />
                            <span>{sessionTime}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold">
                            <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{participantCount} Clients</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#07AC7D] text-sm font-semibold hover:bg-[#F1FAF6] h-9 px-3"
                            onClick={() => window.open(session.meeting_link, "_blank")}
                          >
                            Join / View
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                            onClick={() => handleDelete(session.id, session.title, session.instructor)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Video Tutorials (Playlist Architecture) */}
        <TabsContent value="tutorials" className="space-y-6">
          {selectedPlaylist ? (
            /* =================================================== */
            /* VIEW B: PLAYLIST DETAIL / MANAGE VIDEOS VIEW        */
            /* =================================================== */
            <div className="space-y-5">
              {/* Back Button, Playlist Switcher & Info Bar */}
              <div className="bg-white p-5 sm:p-6 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPlaylist(null)}
                      className="text-[#526581] hover:text-slate-900 hover:bg-slate-100 h-7 text-xs -ml-2 font-medium"
                    >
                      ← Back to Playlists
                    </Button>
                    <span className="text-slate-300 text-xs">|</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-normal text-[#64748B] whitespace-nowrap shrink-0">Switch Playlist:</span>
                      <Select
                        value={String(selectedPlaylist.id)}
                        onValueChange={(val) => {
                          const target = playlists.find((p) => String(p.id) === String(val));
                          if (target) setSelectedPlaylist(target);
                        }}
                      >
                        <SelectTrigger className="h-8 text-[13px] border-slate-200 bg-slate-50/70 min-w-[210px] font-medium text-[#1E293B] hover:bg-slate-100">
                          <SelectValue placeholder="Select Playlist" />
                        </SelectTrigger>
                        <SelectContent>
                          {playlists.map((pl) => (
                            <SelectItem key={pl.id} value={String(pl.id)} className="text-[13px] font-medium">
                              {pl.title} ({pl.video_count || pl.videos?.length || 0} vids)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-[20px] font-semibold text-[#111827] leading-snug">{selectedPlaylist.title}</h2>
                    <Badge variant="secondary" className="bg-[#F1FAF6] text-[#07AC7D] border border-emerald-100 hover:bg-[#E8F8F8] hover:text-[#06966D] text-xs font-semibold px-2.5 py-0.5">
                      {selectedPlaylist.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold px-2.5 py-0.5">
                      {selectedPlaylist.level}
                    </Badge>
                    <Badge className="bg-slate-900 text-white text-xs font-semibold px-2.5 py-0.5">
                      {selectedPlaylist.videos?.length || 0} Videos
                    </Badge>
                  </div>

                  <p className="text-sm font-normal text-[#526581] max-w-2xl leading-relaxed">
                    {selectedPlaylist.description || "Manage video lessons inside this workout playlist."}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => {
                      setEditingPlaylist(selectedPlaylist);
                      setPlaylistFormData({
                        title: selectedPlaylist.title || "",
                        description: selectedPlaylist.description || "",
                        category: selectedPlaylist.category || "Cardio",
                        level: selectedPlaylist.level || "Beginner",
                        thumbnail_url: selectedPlaylist.thumbnail_url || "",
                        is_published: selectedPlaylist.is_published ?? true,
                      });
                      setIsPlaylistModalOpen(true);
                    }}
                    variant="outline"
                    className="border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-[13px] h-8 font-semibold px-3"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Playlist
                  </Button>

                  <Button
                    onClick={() => {
                      setAddVideoMode("library");
                      setIsVideoModalOpen(true);
                    }}
                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-[13px] h-8 px-3.5 font-semibold shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add Video
                  </Button>
                </div>
              </div>

              {/* SECTION 1: Videos in Selected Playlist */}
              <Card className="border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-[20px] font-semibold text-[#111827] flex items-center gap-2">
                    <Play className="w-4 h-4 text-[#07AC7D]" />
                    Videos in "{selectedPlaylist.title}"
                  </CardTitle>
                  <Button
                    onClick={() => {
                      setAddVideoMode("library");
                      setIsVideoModalOpen(true);
                    }}
                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-sm h-8 px-3 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Video
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {(!selectedPlaylist.videos || selectedPlaylist.videos.length === 0) ? (
                    <div className="text-center py-8 px-4">
                      <Video className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <h3 className="text-base font-semibold text-slate-900">No Videos in this Playlist</h3>
                      <p className="text-sm font-normal text-[#64748B] mt-0.5 mb-3">Click below to select or upload videos for this playlist.</p>
                      <Button
                        onClick={() => {
                          setAddVideoMode("library");
                          setIsVideoModalOpen(true);
                        }}
                        className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-sm h-8 px-3 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Select / Add Video
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                            <th className="py-2.5 px-3 text-center">Plan ID</th>
                            <th className="py-2.5 px-4">Title</th>
                            <th className="py-2.5 px-3 text-center">Category</th>
                            <th className="py-2.5 px-3 text-center">Trainer</th>
                            <th className="py-2.5 px-3 text-center">Video Small (360p)</th>
                            <th className="py-2.5 px-3 text-center">Video Large (720p)</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Audience</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPlaylist.videos.map((vid: any, index: number) => (
                            <tr key={vid.id || index} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 text-xs">
                                {vid.plan_id || index + 1}
                              </td>
                              <td className="py-3 px-4 font-medium text-slate-900">
                                <div className="flex items-center gap-3">
                                  {vid.thumbnail_url ? (
                                    <img src={vid.thumbnail_url} alt="" className="w-12 h-8 rounded object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-12 h-8 rounded bg-slate-900 flex items-center justify-center text-slate-400 text-[8px] shrink-0 font-mono">
                                      VID
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-sm text-slate-900 line-clamp-1">{vid.title}</p>
                                    <p className="text-[12px] font-normal text-[#64748B] line-clamp-1">{vid.description || "No description."}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant="outline" className="text-[11px] py-0.5 px-2 border-slate-200 text-slate-600 bg-slate-50 font-medium">
                                  {vid.category || selectedPlaylist.category || "General"}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-xs font-semibold text-slate-700">
                                  {vid.trainer_name || `Trainer ${vid.plan_id || index + 1}`}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <a
                                  href={vid.video_url_small || vid.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200"
                                >
                                  <Play className="w-3 h-3" /> SD 360p
                                </a>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <a
                                  href={vid.video_url_large || vid.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"
                                >
                                  <Play className="w-3 h-3" /> HD 720p
                                </a>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant="secondary" className={`text-xs font-semibold px-2.5 py-0.5 ${vid.status === "published" ? "bg-[#F1FAF6] text-[#07AC7D] border border-emerald-100" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                                  {vid.status === "published" ? "Published" : "Draft"}
                                </Badge>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge variant="outline" className="text-[11px] py-0.5 px-2 border-slate-200 text-purple-700 bg-purple-50 font-medium capitalize">
                                  {vid.audience || "Customers"}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title="Remove from playlist"
                                  onClick={() => handleDeleteVideoFromPlaylist(vid.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SECTION 2: Available Video Library Section Below */}
              {(() => {
                const inPlaylistIds = new Set((selectedPlaylist.videos || []).map((v: any) => String(v.id)));
                const availableVids = tutorials.filter((t: any) => {
                  const notInPl = !inPlaylistIds.has(String(t.id));
                  const matchesSearch = !librarySearch || t.title?.toLowerCase().includes(librarySearch.toLowerCase()) || t.description?.toLowerCase().includes(librarySearch.toLowerCase());
                  const matchesCat = libraryCategoryFilter === "all" || t.category === libraryCategoryFilter;
                  const matchesLvl = libraryLevelFilter === "all" || t.level === libraryLevelFilter;
                  return notInPl && matchesSearch && matchesCat && matchesLvl;
                });

                return (
                  <Card className="border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden bg-white mt-6">
                    <CardHeader className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-[20px] font-semibold text-[#111827] flex items-center gap-2">
                          <Video className="w-4 h-4 text-[#07AC7D]" />
                          Available Videos in Video Library
                        </CardTitle>
                        <p className="text-sm font-normal text-[#526581] mt-0.5">
                          Select from existing master videos in your database and add them directly into this playlist.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setVideoFormData({
                              title: "",
                              description: "",
                              trainer_name: "",
                              video_url_small: "",
                              video_url_large: "",
                              thumbnail_url: "",
                              duration: "05:00",
                              category: selectedPlaylist?.category || "Weight Loss",
                              level: selectedPlaylist?.level || "Beginner",
                              status: "published",
                              audience: "all",
                              is_published: true,
                            });
                            setIsVideoModalOpen(true);
                          }}
                          className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-sm h-8 px-3 font-semibold shrink-0 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Upload New Video
                        </Button>

                        {selectedLibraryVideoIds.length > 0 && (
                          <Button
                            onClick={() => handleBatchAddVideosToPlaylist(selectedLibraryVideoIds)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-8 px-3 font-semibold shrink-0 flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" /> Add Selected ({selectedLibraryVideoIds.length})
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {/* Filter Bar */}
                    <div className="p-3 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center gap-3">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <Input
                          placeholder="Search available videos..."
                          value={librarySearch}
                          onChange={(e) => setLibrarySearch(e.target.value)}
                          className="pl-9 h-8 text-sm font-normal border-slate-200 bg-white placeholder:text-[#64748B]"
                        />
                      </div>

                      <Select value={libraryCategoryFilter} onValueChange={setLibraryCategoryFilter}>
                        <SelectTrigger className="w-[140px] h-8 text-sm font-medium border-slate-200 bg-white text-[#1E293B] hover:bg-slate-50">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-sm font-medium">All Categories</SelectItem>
                          <SelectItem value="Cardio" className="text-sm font-medium">Cardio</SelectItem>
                          <SelectItem value="Strength Training" className="text-sm font-medium">Strength Training</SelectItem>
                          <SelectItem value="Weight Loss" className="text-sm font-medium">Weight Loss</SelectItem>
                          <SelectItem value="Yoga & Flexibility" className="text-sm font-medium">Yoga & Flexibility</SelectItem>
                          <SelectItem value="HIIT" className="text-sm font-medium">HIIT</SelectItem>
                          <SelectItem value="General" className="text-sm font-medium">General</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={libraryLevelFilter} onValueChange={setLibraryLevelFilter}>
                        <SelectTrigger className="w-[130px] h-8 text-sm font-medium border-slate-200 bg-white text-[#1E293B] hover:bg-slate-50">
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-sm font-medium">All Levels</SelectItem>
                          <SelectItem value="Beginner" className="text-sm font-medium">Beginner</SelectItem>
                          <SelectItem value="Intermediate" className="text-sm font-medium">Intermediate</SelectItem>
                          <SelectItem value="Advanced" className="text-sm font-medium">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <CardContent className="p-0">
                      {availableVids.length === 0 ? (
                        <div className="text-center py-8 text-sm font-normal text-[#64748B]">
                          No available videos match your search or filter criteria.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {availableVids.map((vid: any) => {
                            const isChecked = selectedLibraryVideoIds.includes(String(vid.id));
                            return (
                              <div
                                key={vid.id}
                                className={`p-3 px-4 flex items-center justify-between gap-4 transition-colors ${isChecked ? "bg-emerald-50/40" : "hover:bg-slate-50/70"
                                  }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedLibraryVideoIds((prev) => [...prev, String(vid.id)]);
                                      } else {
                                        setSelectedLibraryVideoIds((prev) => prev.filter((id) => id !== String(vid.id)));
                                      }
                                    }}
                                  />

                                  {vid.thumbnail_url ? (
                                    <img src={vid.thumbnail_url} alt="" className="w-14 h-9 rounded object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-14 h-9 rounded bg-slate-900 flex items-center justify-center text-slate-400 text-[9px] shrink-0 font-mono">
                                      VIDEO
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <p className="font-semibold text-sm text-slate-900 truncate">{vid.title}</p>
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 text-slate-500 font-normal">
                                        {vid.category || "General"}
                                      </Badge>
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-200 text-slate-500 font-normal">
                                        {vid.level || "Beginner"}
                                      </Badge>
                                    </div>
                                    <p className="text-[13px] text-[#64748B] truncate">{vid.description || "No description provided."}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[13px] font-mono font-medium text-[#526581] mr-1">
                                    {vid.duration || "05:00"}
                                  </span>

                                  <Button
                                    size="sm"
                                    onClick={() => handleBatchAddVideosToPlaylist([String(vid.id)])}
                                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-xs h-8 px-3 font-semibold"
                                  >
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTutorial(vid.id, vid.title);
                                    }}
                                    className="h-8 w-8 border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                                    title={`Delete "${vid.title}" permanently from database`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            /* =================================================== */
            /* VIEW A: PLAYLIST CARDS GRID VIEW                   */
            /* =================================================== */
            <div className="space-y-6">
              {/* Filters & Create Playlist Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search playlists..."
                      value={tutorialSearch}
                      onChange={(e) => setTutorialSearch(e.target.value)}
                      className="pl-9 h-9 text-sm font-normal border-slate-200 bg-slate-50/50 placeholder:text-[#64748B]"
                    />
                  </div>

                  <Select value={playlistCategoryFilter} onValueChange={setPlaylistCategoryFilter}>
                    <SelectTrigger className="w-36 h-9 text-sm font-medium border-slate-200 bg-slate-50/50 text-[#1E293B]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-sm font-medium">All Categories</SelectItem>
                      <SelectItem value="Cardio" className="text-sm font-medium">Cardio</SelectItem>
                      <SelectItem value="Strength Training" className="text-sm font-medium">Strength Training</SelectItem>
                      <SelectItem value="Weight Loss" className="text-sm font-medium">Weight Loss</SelectItem>
                      <SelectItem value="Yoga & Flexibility" className="text-sm font-medium">Yoga & Flexibility</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={playlistLevelFilter} onValueChange={setPlaylistLevelFilter}>
                    <SelectTrigger className="w-32 h-9 text-sm font-medium border-slate-200 bg-slate-50/50 text-[#1E293B]">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-sm font-medium">All Levels</SelectItem>
                      <SelectItem value="Beginner" className="text-sm font-medium">Beginner</SelectItem>
                      <SelectItem value="Intermediate" className="text-sm font-medium">Intermediate</SelectItem>
                      <SelectItem value="Advanced" className="text-sm font-medium">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 shrink-0">


                  <Button
                    onClick={() => {
                      setEditingPlaylist(null);
                      setPlaylistFormData({
                        title: "",
                        description: "",
                        category: "Cardio",
                        level: "Beginner",
                        thumbnail_url: "",
                        is_published: true,
                      });
                      setIsPlaylistModalOpen(true);
                    }}
                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white h-9 px-4 text-sm font-semibold shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Create Playlist
                  </Button>
                </div>
              </div>

              {/* Playlists Grid */}
              {loadingTutorials ? (
                <p className="text-center py-10 text-slate-400 text-sm">Loading playlists...</p>
              ) : playlists.filter(p => {
                const matchSearch = p.title.toLowerCase().includes(tutorialSearch.toLowerCase()) || p.description?.toLowerCase().includes(tutorialSearch.toLowerCase());
                const matchCat = playlistCategoryFilter === "all" || p.category === playlistCategoryFilter;
                const matchLvl = playlistLevelFilter === "all" || p.level === playlistLevelFilter;
                return matchSearch && matchCat && matchLvl;
              }).length === 0 ? (
                <Card className="border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center rounded-2xl">
                  <Play className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-700">No Playlists Found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Create workout series playlists to organize your instructional videos for clients.
                  </p>
                  <Button
                    onClick={() => {
                      setEditingPlaylist(null);
                      setIsPlaylistModalOpen(true);
                    }}
                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-xs px-4 h-9 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Create First Playlist
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {playlists.filter(p => {
                    const matchSearch = p.title.toLowerCase().includes(tutorialSearch.toLowerCase()) || p.description?.toLowerCase().includes(tutorialSearch.toLowerCase());
                    const matchCat = playlistCategoryFilter === "all" || p.category === playlistCategoryFilter;
                    const matchLvl = playlistLevelFilter === "all" || p.level === playlistLevelFilter;
                    return matchSearch && matchCat && matchLvl;
                  }).map((pl) => (
                    <Card key={pl.id} className="border border-slate-200/80 hover:border-[#07AC7D]/40 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group bg-white flex flex-col">
                      {/* Playlist Thumbnail Container */}
                      <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => setSelectedPlaylist(pl)}>
                        <img
                          src={pl.thumbnail_url || "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80"}
                          alt={pl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10 shadow-lg">
                          <Play className="w-3 h-3 fill-white" />
                          {pl.video_count || pl.videos?.length || 0} Videos
                        </div>
                      </div>

                      <CardContent className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-[#F1FAF6] text-[#07AC7D] border-emerald-100 text-[10px] font-semibold px-2 py-0.5">
                              {pl.category || "Cardio"}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500 font-medium px-2 py-0.5">
                              {pl.level || "Beginner"}
                            </Badge>
                          </div>

                          <h3
                            onClick={() => setSelectedPlaylist(pl)}
                            className="font-semibold text-[18px] text-[#111827] group-hover:text-[#07AC7D] transition-colors line-clamp-1 mb-1 cursor-pointer"
                          >
                            {pl.title}
                          </h3>
                          <p className="text-sm text-[#526581] line-clamp-2 leading-relaxed font-normal">
                            {pl.description || "No playlist description provided."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                          <span className="text-xs text-[#64748B] font-medium">
                            {pl.video_count || pl.videos?.length || 0} videos • {pl.level}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 px-3"
                              onClick={() => {
                                setEditingPlaylist(pl);
                                setPlaylistFormData({
                                  title: pl.title || "",
                                  description: pl.description || "",
                                  category: pl.category || "Cardio",
                                  level: pl.level || "Beginner",
                                  thumbnail_url: pl.thumbnail_url || "",
                                  is_published: pl.is_published ?? true,
                                });
                                setIsPlaylistModalOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-sm font-semibold bg-[#07AC7D] hover:bg-[#06966D] text-white px-3"
                              onClick={() => setSelectedPlaylist(pl)}
                            >
                              Manage Videos
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeletePlaylist(pl)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* =================================================== */}
      {/* MODAL 1: CREATE / EDIT PLAYLIST DIALOG             */}
      {/* =================================================== */}
      <Dialog open={isPlaylistModalOpen} onOpenChange={setIsPlaylistModalOpen}>
        <DialogContent className="sm:max-w-[500px] border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingPlaylist ? "Edit Video Playlist" : "Create Video Playlist"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Organize video tutorials into a playlist series for your clients.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-700">Playlist Title</Label>
              <Input
                placeholder="e.g. Cardio Basics"
                value={playlistFormData.title}
                onChange={(e) => setPlaylistFormData({ ...playlistFormData, title: e.target.value })}
                className="border-slate-200 h-9 text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <Textarea
                placeholder="Brief summary of what clients will learn in this video series..."
                value={playlistFormData.description}
                onChange={(e) => setPlaylistFormData({ ...playlistFormData, description: e.target.value })}
                className="border-slate-200 text-sm min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-700">Category</Label>
                <Select
                  value={playlistFormData.category}
                  onValueChange={(v) => setPlaylistFormData({ ...playlistFormData, category: v })}
                >
                  <SelectTrigger className="border-slate-200 h-9 text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                    <SelectItem value="Strength Training">Strength Training</SelectItem>
                    <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                    <SelectItem value="Yoga & Flexibility">Yoga & Flexibility</SelectItem>
                    <SelectItem value="HIIT">HIIT</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-700">Level</Label>
                <Select
                  value={playlistFormData.level}
                  onValueChange={(v) => setPlaylistFormData({ ...playlistFormData, level: v })}
                >
                  <SelectTrigger className="border-slate-200 h-9 text-sm">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-slate-700">Thumbnail Image</Label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  placeholder="https://images.unsplash.com/... or upload"
                  value={playlistFormData.thumbnail_url}
                  onChange={(e) => setPlaylistFormData({ ...playlistFormData, thumbnail_url: e.target.value })}
                  className="border-slate-200 h-9 text-sm flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePlaylistThumbnailUpload}
                    className="hidden"
                    id="playlist-thumb-file-upload"
                  />
                  <Label
                    htmlFor="playlist-thumb-file-upload"
                    className="h-9 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md text-xs font-medium flex items-center justify-center cursor-pointer gap-1.5 transition-colors shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </Label>
                </div>
              </div>
              {playlistFormData.thumbnail_url && (
                <div className="mt-1 flex items-center gap-2">
                  <img src={playlistFormData.thumbnail_url} alt="Thumbnail preview" className="w-12 h-8 rounded object-cover border border-slate-200" />
                  <span className="text-[10px] text-emerald-600 font-medium">✓ Thumbnail image set</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsPlaylistModalOpen(false)}
              className="h-9 text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePlaylist}
              disabled={isPublishing}
              className="bg-[#07AC7D] hover:bg-[#06966D] text-white h-9 text-xs font-semibold"
            >
              {isPublishing ? "Saving..." : editingPlaylist ? "Update Playlist" : "Create Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================== */}
      {/* MODAL 2: ADD VIDEO TO PLAYLIST DIALOG              */}
      {/* =================================================== */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="sm:max-w-[560px] border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Add Video to {selectedPlaylist?.title || "Playlist"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Choose existing videos from your Master Video Library or upload a brand new video.
            </DialogDescription>
          </DialogHeader>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 mt-1 mb-3">
            <button
              type="button"
              onClick={() => setAddVideoMode("library")}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${addVideoMode === "library"
                ? "border-[#07AC7D] text-[#07AC7D]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              Select from Video Library
            </button>
            <button
              type="button"
              onClick={() => setAddVideoMode("upload")}
              className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${addVideoMode === "upload"
                ? "border-[#07AC7D] text-[#07AC7D]"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              + Upload New Video
            </button>
          </div>

          {addVideoMode === "library" ? (
            /* MODE A: SELECT FROM MASTER LIBRARY */
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search video library..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-200"
                />
              </div>

              {(() => {
                const inPlaylistIds = new Set((selectedPlaylist?.videos || []).map((v: any) => String(v.id)));
                const availableVids = tutorials.filter((t: any) => {
                  const notInPl = !inPlaylistIds.has(String(t.id));
                  const matchesSearch = !librarySearch || t.title?.toLowerCase().includes(librarySearch.toLowerCase());
                  return notInPl && matchesSearch;
                });

                return (
                  <ScrollArea className="h-[280px] rounded-xl border border-slate-200 p-2 bg-slate-50/40">
                    {availableVids.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">
                        No videos available in library to add.
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
                                  setSelectedLibraryVideoIds((prev) => prev.filter((id) => id !== String(vid.id)));
                                } else {
                                  setSelectedLibraryVideoIds((prev) => [...prev, String(vid.id)]);
                                }
                              }}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${isChecked
                                ? "bg-emerald-50/80 border-[#07AC7D]"
                                : "bg-white border-slate-200/80 hover:border-slate-300"
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => { }}
                                />

                                {vid.thumbnail_url ? (
                                  <img src={vid.thumbnail_url} alt="" className="w-10 h-7 rounded object-cover border border-slate-200 shrink-0" />
                                ) : (
                                  <div className="w-10 h-7 rounded bg-slate-900 flex items-center justify-center text-slate-400 text-[8px] shrink-0 font-mono">
                                    VID
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs text-slate-900 truncate">{vid.title}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{vid.category || "General"} • {vid.level || "Beginner"}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                  {vid.duration || "05:00"}
                                </span>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTutorial(vid.id, vid.title);
                                  }}
                                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title={`Delete "${vid.title}" permanently`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                );
              })()}

              <DialogFooter className="gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="h-9 text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleBatchAddVideosToPlaylist(selectedLibraryVideoIds)}
                  disabled={isPublishing || selectedLibraryVideoIds.length === 0}
                  className="bg-[#07AC7D] hover:bg-[#06966D] text-white h-9 text-xs font-semibold"
                >
                  {isPublishing ? "Adding..." : `Add Selected Videos (${selectedLibraryVideoIds.length})`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* MODE B: UPLOAD NEW VIDEO */
            <ScrollArea className="max-h-[65vh] pr-1">
              <div className="space-y-4 py-1">
                {/* Row 1: Title & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Video Title *</Label>
                    <Input
                      placeholder="e.g. Tutorial 1"
                      value={videoFormData.title}
                      onChange={(e) => setVideoFormData({ ...videoFormData, title: e.target.value })}
                      className="border-slate-200 h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Category *</Label>
                    <Select
                      value={videoFormData.category}
                      onValueChange={(val) => setVideoFormData({ ...videoFormData, category: val })}
                    >
                      <SelectTrigger className="border-slate-200 h-9 text-sm">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                        <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                        <SelectItem value="Strength Training">Strength Training</SelectItem>
                        <SelectItem value="Cardio">Cardio</SelectItem>
                        <SelectItem value="HIIT">HIIT</SelectItem>
                        <SelectItem value="Pilates">Pilates</SelectItem>
                        <SelectItem value="Functional Training">Functional Training</SelectItem>
                        <SelectItem value="Home Workouts">Home Workouts</SelectItem>
                        <SelectItem value="Gym Workouts">Gym Workouts</SelectItem>
                        <SelectItem value="Senior Fitness">Senior Fitness</SelectItem>
                        <SelectItem value="Kids Fitness">Kids Fitness</SelectItem>
                        <SelectItem value="Prenatal & Postnatal Fitness">Prenatal & Postnatal Fitness</SelectItem>
                        <SelectItem value="Yoga & Flexibility">Yoga & Flexibility</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: Trainer & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Trainer</Label>
                    <Input
                      placeholder="e.g. Trainer 1"
                      value={videoFormData.trainer_name}
                      onChange={(e) => setVideoFormData({ ...videoFormData, trainer_name: e.target.value })}
                      className="border-slate-200 h-9 text-sm"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Duration</Label>
                    <div className="h-9 px-3 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-600 flex items-center">
                      {videoFormData.duration ? `${videoFormData.duration} (Auto-detected)` : "Auto-calculated on video upload"}
                    </div>
                  </div>
                </div>

                {/* Row 3: Video Small (360p/480p) & Video Large (720p/1080p) Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Video Small (360p/480p)</span>
                      <span className="text-[10px] text-slate-400 font-normal">SD Resolution</span>
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="URL or Upload..."
                        value={videoFormData.video_url_small}
                        onChange={(e) => setVideoFormData({ ...videoFormData, video_url_small: e.target.value })}
                        className="border-slate-200 h-8 text-xs bg-white"
                      />
                      <Label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-2.5 h-8 rounded-md flex items-center text-xs font-medium shrink-0">
                        Upload
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleUploadSmallVideo(e)}
                        />
                      </Label>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Video Large (720p/1080p)</span>
                      <span className="text-[10px] text-slate-400 font-normal">HD Resolution</span>
                    </Label>
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="URL or Upload..."
                        value={videoFormData.video_url_large}
                        onChange={(e) => setVideoFormData({ ...videoFormData, video_url_large: e.target.value })}
                        className="border-slate-200 h-8 text-xs bg-white"
                      />
                      <Label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-2.5 h-8 rounded-md flex items-center text-xs font-medium shrink-0">
                        Upload
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleUploadLargeVideo(e)}
                        />
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Row 4: Status & Audience */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Status</Label>
                    <Select
                      value={videoFormData.status}
                      onValueChange={(val) => setVideoFormData({ ...videoFormData, status: val, is_published: val === "published" })}
                    >
                      <SelectTrigger className="border-slate-200 h-9 text-sm">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Audience</Label>
                    <Select
                      value={videoFormData.audience}
                      onValueChange={(val) => setVideoFormData({ ...videoFormData, audience: val })}
                    >
                      <SelectTrigger className="border-slate-200 h-9 text-sm">
                        <SelectValue placeholder="Select Audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customers">Customers</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 5: Thumbnail & Description */}
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Thumbnail Image</Label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                      placeholder="https://images.unsplash.com/... or upload"
                      value={videoFormData.thumbnail_url}
                      onChange={(e) => setVideoFormData({ ...videoFormData, thumbnail_url: e.target.value })}
                      className="border-slate-200 h-9 text-sm flex-1"
                    />
                    <div className="relative">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleVideoThumbnailUpload}
                        className="hidden"
                        id="video-thumb-file-upload"
                      />
                      <Label
                        htmlFor="video-thumb-file-upload"
                        className="h-9 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-md text-xs font-medium flex items-center justify-center cursor-pointer gap-1.5 transition-colors shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload File
                      </Label>
                    </div>
                  </div>
                  {videoFormData.thumbnail_url && (
                    <div className="mt-1 flex items-center gap-2">
                      <img src={videoFormData.thumbnail_url} alt="Thumbnail preview" className="w-12 h-8 rounded object-cover border border-slate-200" />
                      <span className="text-[10px] text-emerald-600 font-medium">✓ Thumbnail image set</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Description</Label>
                  <Textarea
                    placeholder="Brief instructions or steps for this video lesson..."
                    value={videoFormData.description}
                    onChange={(e) => setVideoFormData({ ...videoFormData, description: e.target.value })}
                    className="border-slate-200 text-sm min-h-[60px]"
                  />
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsVideoModalOpen(false)}
                    className="h-9 text-xs border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveVideoToPlaylist}
                    disabled={isPublishing}
                    className="bg-[#07AC7D] hover:bg-[#06966D] text-white h-9 text-xs font-semibold"
                  >
                    {isPublishing ? "Adding..." : "Create & Add Video"}
                  </Button>
                </DialogFooter>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({ title, value, icon, bgColor }: any) {
  return (
    <Card className="border border-slate-200/80 shadow-sm rounded-2xl">
      <CardContent className="pt-5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#64748B] mb-1 truncate">{title}</p>
          <p className="text-[30px] sm:text-[32px] font-bold text-[#111827] leading-none">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}