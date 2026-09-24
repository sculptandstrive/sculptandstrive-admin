import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, User, Camera, Scale, HeartPulse, ClipboardList, Shield } from "lucide-react";

interface ClientSummary {
  user_id: string;
  profile_id?: string;
  full_name: string;
  email?: string;
  created_at?: string;
  latest_weight: number | null;
  last_updated: string | null;
}

interface MeasurementRow {
  weight_kg: number;
  chest_cm: number;
  waist_cm: number;
  hips_cm: number;
  arms_cm: number;
  thighs_cm: number;
  created_at: string;
}

interface ProgressPhoto {
  id?: string;
  label: string;
  imagePath: string | null;
  taken_at: string;
}


function renderSafeText(val: any, fallback = "None declared."): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim() || fallback;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    if (val.length === 0) return fallback;
    return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof val === "object") {
    const vals = Object.values(val).filter((v) => v !== null && v !== undefined && v !== "");
    if (vals.length === 0) return fallback;
    return vals.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  return String(val);
}

export function AdminClientProgress() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [profileData, setProfileData] = useState<{
    healthHistory: any;
    checkins: any[];
    workoutsSummary: {
      totalCount: number;
      completedCount: number;
      totalCalories: number;
    };
    coaches: Array<{ name: string; role: string }>;
  } | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);

    try {
      const [profilesRes, measurementsRes, checkinsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, full_name, email, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("current_measurements")
          .select("user_id, weight_kg, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("weekly_checkins")
          .select("user_id, weight_kg, checkin_date, created_at")
          .order("created_at", { ascending: false }),
      ]);

      const latestByUser = new Map<string, { weight: number; date: string }>();

      (measurementsRes.data || []).forEach((m: any) => {
        if (!latestByUser.has(m.user_id) && m.weight_kg != null) {
          latestByUser.set(m.user_id, { weight: Number(m.weight_kg), date: m.created_at });
        }
      });

      (checkinsRes.data || []).forEach((c: any) => {
        const existing = latestByUser.get(c.user_id);
        const checkinDate = c.created_at || c.checkin_date;
        if (c.weight_kg != null) {
          if (!existing || (checkinDate && new Date(checkinDate) > new Date(existing.date))) {
            latestByUser.set(c.user_id, { weight: Number(c.weight_kg), date: checkinDate });
          }
        }
      });

      const profiles = profilesRes.data || [];
      const clientList: ClientSummary[] = profiles.map((p) => {
        const uid = p.user_id || p.id;
        const latest = latestByUser.get(uid) || latestByUser.get(p.id) || latestByUser.get(p.user_id);
        return {
          user_id: uid,
          profile_id: p.id,
          full_name: p.full_name || "Unknown Member",
          email: p.email || "",
          created_at: p.created_at || null,
          latest_weight: latest?.weight ?? null,
          last_updated: latest?.date ?? null,
        };
      });

      setClients(clientList);
    } catch (err) {
      console.error("fetchClients error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openClientDetail = async (client: ClientSummary) => {
    setSelectedClient(client);
    setDetailLoading(true);
    setMeasurements([]);
    setPhotos([]);
    setProfileData(null);

    try {
      const [
        healthRes,
        checkinsRes,
        workoutsRes,
        progressRes,
        measurementRes,
        photoRowsRes,
        coachClientsRes,
      ] = await Promise.all([
        supabase
          .from("health_history")
          .select("*")
          .eq("user_id", client.user_id)
          .maybeSingle(),
        supabase
          .from("weekly_checkins")
          .select("*")
          .eq("user_id", client.user_id)
          .order("checkin_date", { ascending: false }),
        supabase
          .from("workouts")
          .select("id, completed, calories_burned")
          .eq("user_id", client.user_id),
        supabase
          .from("workout_progress")
          .select("id, status")
          .eq("user_id", client.user_id),
        supabase
          .from("current_measurements")
          .select("weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, created_at")
          .eq("user_id", client.user_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("progress_photos")
          .select("id, image_path, label, taken_at")
          .eq("user_id", client.user_id)
          .order("taken_at", { ascending: false }),
        supabase
          .from("coach_clients")
          .select("coach_id, client_id, created_at")
          .or(`client_id.eq.${client.profile_id || client.user_id},client_id.eq.${client.user_id}`)
          .order("created_at", { ascending: true }),
      ]);

      const workouts = workoutsRes.data || [];
      const progressLogs = progressRes.data || [];
      const completedProgressLogs = progressLogs.filter((p: any) => p.status === "completed");

      const completedCount = completedProgressLogs.length > 0
        ? completedProgressLogs.length
        : workouts.filter((w: any) => w.completed).length;

      const totalCount = Math.max(workouts.length, progressLogs.length);
      const calories = workouts.reduce((sum: number, w: any) => sum + (w.calories_burned || 0), 0);

      // Resolve coaches if any
      const coachRows = coachClientsRes.data || [];
      const coachIds = coachRows.map((c: any) => c.coach_id).filter(Boolean);
      let coachesList: Array<{ name: string; role: string }> = [];

      if (coachIds.length > 0) {
        const { data: coachProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", coachIds);

        const coachMap = new Map((coachProfiles || []).map((cp: any) => [cp.user_id, cp.full_name]));
        coachesList = coachRows.map((c: any, idx: number) => ({
          name: coachMap.get(c.coach_id) || "Assigned Coach",
          role: idx === 0 ? "Primary Coach" : "Secondary Coach",
        }));
      }

      setProfileData({
        healthHistory: healthRes.data || null,
        checkins: checkinsRes.data || [],
        workoutsSummary: {
          totalCount,
          completedCount,
          totalCalories: calories,
        },
        coaches: coachesList,
      });

      setMeasurements(measurementRes.data || []);

      const photoRows = photoRowsRes.data || [];
      if (photoRows.length > 0) {
        const resolvedPhotos = await Promise.all(
          photoRows.map(async (p: any) => {
            let url: string | null = null;
            if (p.image_path) {
              if (
                p.image_path.startsWith("http://") ||
                p.image_path.startsWith("https://") ||
                p.image_path.startsWith("data:")
              ) {
                url = p.image_path;
              } else {
                try {
                  const { data: signed } = await supabase.storage
                    .from("progress-photos")
                    .createSignedUrl(p.image_path, 60 * 60);
                  if (signed?.signedUrl) {
                    url = signed.signedUrl;
                  }
                } catch (err) {}

                if (!url) {
                  try {
                    const { data: pub } = supabase.storage
                      .from("progress-photos")
                      .getPublicUrl(p.image_path);
                    if (pub?.publicUrl) {
                      url = pub.publicUrl;
                    }
                  } catch (err) {}
                }
              }
            }
            return {
              id: p.id,
              label: p.label || (p.taken_at ? new Date(p.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Progress Photo"),
              imagePath: url,
              taken_at: p.taken_at,
            };
          })
        );
        setPhotos(resolvedPhotos);
      } else {
        setPhotos([]);
      }
    } catch (err) {
      console.error("Error loading client progress details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border border-white/90 shadow-[5px_5px_14px_rgba(168,190,185,0.25),-4px_-4px_12px_rgba(255,255,255,0.95)] rounded-[26px]">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-white/90 shadow-[6px_6px_18px_rgba(145,170,165,0.22),-4px_-4px_14px_rgba(255,255,255,0.95)] rounded-[26px] mt-6">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Client Progress
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a client to view full measurements, health questionnaire, and progress photos
          </p>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground italic">
              No clients with progress data yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {clients.map((client) => (
                <button
                  key={client.user_id}
                  onClick={() => openClientDetail(client)}
                  className="group flex flex-col items-center gap-2.5 p-4 sm:p-5 rounded-2xl bg-white border border-white/90 shadow-[3px_3px_8px_rgba(180,200,196,0.2),-2px_-2px_6px_rgba(255,255,255,0.95)] hover:shadow-[5px_5px_14px_rgba(160,185,180,0.28),-3px_-3px_10px_rgba(255,255,255,0.98)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-center cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0CC194]/15 via-[#08B594]/20 to-[#069D80]/25 border border-white/80 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_5px_rgba(8,169,130,0.12)] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5 text-[#08B594]" />
                  </div>
                  <p className="font-bold text-sm text-[#0F172A] group-hover:text-[#08B594] transition-colors truncate w-full">
                    {client.full_name}
                  </p>
                  {client.latest_weight ? (
                    <span className="text-[11px] font-semibold text-[#7186A0] bg-[#E2ECE9] shadow-[inset_1px_1px_2px_rgba(165,185,180,0.4),inset_-1px_-1px_2px_rgba(255,255,255,0.8)] px-2.5 py-0.5 rounded-full border border-white/50">
                      {client.latest_weight} kg ({parseFloat((client.latest_weight * 2.20462).toFixed(1))} lbs)
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#7186A0]/70 font-medium">No weight logged</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col bg-white border border-white/90 text-foreground shadow-[8px_8px_32px_rgba(145,170,165,0.22),-6px_-6px_24px_rgba(255,255,255,0.98)] rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 overflow-hidden">
          <DialogHeader className="border-b border-[#E2ECE9] pb-4 mb-2 shrink-0 pr-8">
            <DialogTitle className="text-xl font-bold flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0CC194]/20 via-[#08B594]/25 to-[#069D80]/30 border border-white shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),2px_2px_6px_rgba(8,169,130,0.15)] flex items-center justify-center text-base font-black text-[#08B594] shrink-0">
                {(selectedClient?.full_name?.[0] || selectedClient?.email?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <span className="text-[#0F172A] block text-xl font-black tracking-tight">{selectedClient?.full_name || "Client Progress"}</span>
                {selectedClient?.email && (
                  <span className="text-xs text-[#7186A0] font-semibold">{selectedClient.email}</span>
                )}
              </div>
            </DialogTitle>
            <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-[#7186A0]">
              <span className="font-semibold text-[#7186A0]">
                Joined on {selectedClient?.created_at ? new Date(selectedClient.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </span>
              {profileData?.coaches && profileData.coaches.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-[#E2ECE9] px-3.5 py-1.5 rounded-xl border border-white/60 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.35)]">
                  {profileData.coaches.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs">
                      <Shield className="w-3.5 h-3.5 text-[#08B594] shrink-0" />
                      <span className="font-bold text-[#0F172A]">{typeof c?.role === "string" ? c.role : "Role"}:</span>
                      <span className="text-[#08B594] font-bold">{typeof c?.name === "string" ? c.name : "Coach"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-[#08B594]" />
              <p className="text-xs font-bold text-[#7186A0]">Retrieving client record...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-6 pt-2 pr-1">
              {/* Stats Summary Panel */}
              {profileData && (
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#E2ECE9] shadow-[inset_2px_2px_4px_rgba(165,185,180,0.45),inset_-2px_-2px_4px_rgba(255,255,255,0.85)] border border-white/60">
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Workouts Assigned</span>
                    <span className="text-2xl font-black text-[#0F172A] tracking-tight leading-none">
                      {profileData.workoutsSummary.totalCount}
                    </span>
                  </div>
                  <div className="text-center border-x border-white/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Sessions Done</span>
                    <span className="text-2xl font-black text-[#08B594] tracking-tight leading-none">
                      {profileData.workoutsSummary.completedCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Est. Kcal Burned</span>
                    <span className="text-2xl font-black text-amber-500 tracking-tight leading-none">
                      {profileData.workoutsSummary.totalCalories.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* 2-Column Grid: Health Questionnaire & Weekly Check-ins */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Health History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#08B594] uppercase tracking-wider border-b border-[#E2ECE9] pb-1.5 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5" />
                    Health Questionnaire
                  </h4>
                  <div className="space-y-3 bg-[#E2ECE9] shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)] border border-white/60 p-4 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Medical Conditions</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData?.healthHistory?.medical_conditions)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Injuries</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData?.healthHistory?.injuries)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Allergies</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData?.healthHistory?.allergies)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7186A0] block mb-1">Medications</span>
                      <p className="text-[#0F172A] font-semibold bg-white p-3 rounded-xl border border-white shadow-[2px_2px_5px_rgba(180,200,196,0.15)] min-h-[40px]">
                        {renderSafeText(profileData?.healthHistory?.medications)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Column 2: Weekly Check-ins */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#08B594] uppercase tracking-wider border-b border-[#E2ECE9] pb-1.5 flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Weekly Check-in Log
                  </h4>
                  {!profileData?.checkins || profileData.checkins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 bg-[#E2ECE9] rounded-2xl border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)] text-xs text-[#7186A0] font-bold">
                      <ClipboardList className="w-8 h-8 text-[#7186A0]/50 mb-2" />
                      No check-ins submitted yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {profileData.checkins.map((c) => (
                        <div key={c.id} className="p-3.5 rounded-2xl bg-white border border-white shadow-[2px_2px_8px_rgba(145,170,165,0.15)] space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-[#E2ECE9] pb-1.5">
                            <span className="text-xs font-bold text-[#0F172A]">
                              {new Date(c.checkin_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[10px] font-black text-[#08B594] bg-[#E2ECE9] px-2 py-0.5 rounded-lg border border-white/60 shadow-[inset_1px_1px_2px_rgba(165,185,180,0.3)]">
                              {c.weight_kg} kg ({parseFloat((c.weight_kg * 2.20462).toFixed(1))} lbs)
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block">Energy</span>
                              <span className="text-[#0F172A] font-bold">{c.energy_level}/5</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block">Mood</span>
                              <span className="text-[#0F172A] font-bold capitalize">{c.mood}</span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block">Sleep</span>
                              <span className="text-[#0F172A] font-bold">{c.sleep_hours ? `${c.sleep_hours} hrs` : "—"}</span>
                            </div>
                          </div>
                          {c.notes && (
                            <div className="bg-[#E2ECE9] p-2.5 rounded-xl border border-white/60 text-[11px] font-medium text-[#334155]">
                              <span className="text-[10px] font-bold uppercase text-[#7186A0] block mb-0.5">Notes:</span>
                              {c.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Measurement History */}
              <div className="space-y-3 pt-4 border-t border-[#E2ECE9]">
                <h4 className="text-xs font-bold text-[#08B594] uppercase tracking-wider border-b border-[#E2ECE9] pb-1.5 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Measurement History
                </h4>
                {measurements.length === 0 ? (
                  <div className="py-8 text-center bg-[#E2ECE9] rounded-2xl border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)] text-xs text-[#7186A0] font-bold">
                    No measurements logged yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {measurements.map((m, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-3 rounded-xl bg-white border border-white shadow-[2px_2px_6px_rgba(180,200,196,0.15)] text-xs"
                      >
                        <span className="font-bold text-[#0F172A]">
                          {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="text-[#7186A0] font-medium">
                          <strong className="text-[#0F172A] font-bold">{m.weight_kg} kg</strong> ({parseFloat((m.weight_kg * 2.20462).toFixed(1))} lbs)
                          {m.chest_cm ? ` • Chest: ${m.chest_cm}cm` : ""}
                          {m.waist_cm ? ` • Waist: ${m.waist_cm}cm` : ""}
                          {m.hips_cm ? ` • Hips: ${m.hips_cm}cm` : ""}
                          {m.arms_cm ? ` • Arms: ${m.arms_cm}cm` : ""}
                          {m.thighs_cm ? ` • Thighs: ${m.thighs_cm}cm` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Photos */}
              <div className="space-y-3 pt-4 border-t border-[#E2ECE9]">
                <h4 className="text-xs font-bold text-[#08B594] uppercase tracking-wider border-b border-[#E2ECE9] pb-1.5 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Progress Photos
                </h4>
                {photos.length === 0 ? (
                  <div className="py-8 text-center bg-[#E2ECE9] rounded-2xl border border-white/60 shadow-[inset_1.5px_1.5px_3px_rgba(165,185,180,0.35)] text-xs text-[#7186A0] font-bold">
                    No progress photos uploaded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((p, i) => (
                      <div key={i} className="relative rounded-2xl overflow-hidden border border-white bg-white shadow-[3px_3px_10px_rgba(180,200,196,0.2)] flex flex-col group">
                        <div className="aspect-[3/4] w-full overflow-hidden bg-[#E2ECE9] flex items-center justify-center relative">
                          {p.imagePath ? (
                            <img
                              src={p.imagePath}
                              alt={p.label || "Progress photo"}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            style={{ display: p.imagePath ? "none" : "flex" }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-xs text-[#7186A0] gap-1.5 p-3 text-center bg-[#E2ECE9]"
                          >
                            <Camera className="w-6 h-6 text-[#7186A0]/50" />
                            <span className="text-[11px] font-bold">Photo unavailable</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-white text-center text-xs font-semibold text-[#7186A0] border-t border-[#E2ECE9]">
                          <p className="text-[#0F172A] font-bold truncate">{p.label}</p>
                          {p.taken_at && (
                            <p className="text-[10px] text-[#7186A0] mt-0.5 font-medium">
                              {new Date(p.taken_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}