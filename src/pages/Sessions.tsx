import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, Video, Users as UsersIcon,  
  Clock, Plus, Trash2, RefreshCw, Search, Play, Edit3, Image as ImageIcon
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
      // Fetch tutorials and map categories/levels safely (matching user app client-side join)
      const { data: tutData, error } = await supabase
        .from("tutorials")
        .select("*")
        .or("type.eq.fitness,type.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const catMap = new Map((catData || []).map((c: any) => [String(c.id), c]));
      const lvlMap = new Map((lvlData || []).map((l: any) => [String(l.id), l]));

      const enriched = (tutData || []).map((t: any) => ({
        ...t,
        tutorial_categories: catMap.get(String(t.category_id)) || null,
        tutorial_levels: lvlMap.get(String(t.level_id)) || null,
      }));

      setTutorials(enriched);
    } catch (error: any) {
      console.error("Error fetching tutorials:", error);
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

  const handleVideoUpload = async(e: React.ChangeEvent<HTMLInputElement>) => {
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
        duration: prev.duration || formattedDuration
      }));
      toast.success("Video uploaded successfully!");
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
      const { error } = await supabase.from("tutorials").delete().eq("id", id);
      if (error) throw error;
      toast.success("Tutorial deleted successfully!");
      fetchTutorials();
    } catch (error: any) {
      toast.error("Failed to delete tutorial: " + error.message);
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
                        <Label className="text-xs font-semibold text-slate-600">Duration (MM:SS)</Label>
                        <Input
                          value={formData.duration || ""}
                          placeholder="e.g. 15:30"
                          className="border-slate-200 h-9 text-sm"
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        />
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
          <TabsList className="bg-slate-100/80 flex-wrap h-auto gap-2 p-1.5 rounded-xl border border-slate-200/60">
            <TabsTrigger
              value="live"
              className="data-[state=active]:bg-[#07AC7D] data-[state=active]:text-white text-xs sm:text-sm px-4 py-2 rounded-lg font-medium transition-all"
            >
              <Video className="w-4 h-4 mr-2" /> Live Sessions
            </TabsTrigger>
            <TabsTrigger
              value="tutorials"
              className="data-[state=active]:bg-[#07AC7D] data-[state=active]:text-white text-xs sm:text-sm px-4 py-2 rounded-lg font-medium transition-all"
            >
              <Play className="w-4 h-4 mr-2" /> Video Tutorials
            </TabsTrigger>
          </TabsList>
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
              <CardTitle className="text-base font-semibold text-slate-800">
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
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all ${
                          isPast
                            ? "opacity-60 bg-slate-50/50 border-slate-200"
                            : "hover:border-[#07AC7D]/40 hover:bg-[#F1FAF6]/40 border-slate-200"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold text-base text-slate-800 truncate">
                              {session.title}
                            </h4>
                            <div className="flex gap-1.5">
                              {isLive && (
                                <Badge className="bg-[#07AC7D] text-white text-[9px] font-semibold px-2 py-0.5">
                                  LIVE NOW
                                </Badge>
                              )}
                              {isPast && (
                                <Badge variant="secondary" className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5">
                                  PAST
                                </Badge>
                              )}
                              {session.admin_is_mass && (
                                <Badge variant="outline" className="text-[9px] border-emerald-200 text-[#07AC7D] px-2 py-0.5">
                                  PUBLIC
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 font-medium">
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

        {/* Tab 2: Video Tutorials */}
        <TabsContent value="tutorials" className="space-y-6">
          {/* Filters & Add Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tutorials..."
                  value={tutorialSearch}
                  onChange={(e) => setTutorialSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/50"
                />
              </div>

              <Button
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({ ...prev, type: "tutorial" }));
                  setIsModalOpen(true);
                }}
                className="bg-[#07AC7D] hover:bg-[#06966D] text-white h-9 px-4 text-xs font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add Tutorial
              </Button>
            </div>

          {/* Tutorials Cards Grid */}
          {loadingTutorials ? (
            <p className="text-center py-10 text-slate-400 text-sm">Loading video tutorials...</p>
          ) : filteredTutorials.length === 0 ? (
            <Card className="border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center rounded-2xl">
              <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No Video Tutorials Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Start building your video library by adding guided workout tutorials for your clients.
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({ ...prev, type: "tutorial" }));
                  setIsModalOpen(true);
                }}
                className="bg-[#07AC7D] hover:bg-[#06966D] text-white text-xs px-4 h-9 font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Add First Tutorial
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTutorials.map((tut) => (
                <Card key={tut.id} className="border border-slate-200/80 hover:border-[#07AC7D]/40 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group bg-white flex flex-col">
                  {/* Thumbnail / Video Box */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                    {tut.thumbnail_url ? (
                      <img
                        src={tut.thumbnail_url}
                        alt={tut.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Play className="w-10 h-10 stroke-1 text-slate-400 mb-1" />
                        <span className="text-[10px] font-mono uppercase tracking-wider">No Thumbnail</span>
                      </div>
                    )}
                    {tut.duration && (
                      <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-sm">
                        {tut.duration}
                      </span>
                    )}
                    <button
                      onClick={() => window.open(tut.url, "_blank")}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#07AC7D] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </button>
                  </div>

                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="bg-[#F1FAF6] text-[#07AC7D] border-emerald-100 text-[10px] font-semibold px-2 py-0.5">
                          {tut.tutorial_categories?.name || "General"}
                        </Badge>
                        {tut.tutorial_levels?.level && (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            Level {tut.tutorial_levels.level}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold text-base text-slate-800 group-hover:text-[#07AC7D] transition-colors line-clamp-1 mb-1">
                        {tut.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {tut.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {tut.views || 0} views
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-[#07AC7D] hover:bg-[#F1FAF6]"
                          onClick={() => handleEditTutorial(tut)}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteTutorial(tut.id, tut.title)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function StatCard({ title, value, icon, bgColor }: any) {
  return (
    <Card className="border border-slate-200/80 shadow-sm rounded-2xl">
      <CardContent className="pt-5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}