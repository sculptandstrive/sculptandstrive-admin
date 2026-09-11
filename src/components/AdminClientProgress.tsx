import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, User, Camera, Scale } from "lucide-react";

interface ClientSummary {
  user_id: string;
  full_name: string;
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
  label: string;
  imagePath: string | null;
  taken_at: string;
}

export function AdminClientProgress() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);

    const { data: measurementsData } = await supabase
      .from("current_measurements")
      .select("user_id, weight_kg, created_at")
      .order("created_at", { ascending: false });

    if (!measurementsData) {
      setLoading(false);
      return;
    }

    const latestByUser = new Map<string, { weight: number; date: string }>();
    measurementsData.forEach((m: any) => {
      if (!latestByUser.has(m.user_id)) {
        latestByUser.set(m.user_id, { weight: m.weight_kg, date: m.created_at });
      }
    });

    const userIds = [...latestByUser.keys()];
    if (userIds.length === 0) {
      setClients([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.full_name]) || []);

    const clientList: ClientSummary[] = userIds.map((id) => ({
      user_id: id,
      full_name: profileMap.get(id) || "Unknown Member",
      latest_weight: latestByUser.get(id)?.weight ?? null,
      last_updated: latestByUser.get(id)?.date ?? null,
    }));

    setClients(clientList);
    setLoading(false);
  };

  const openClientDetail = async (client: ClientSummary) => {
    setSelectedClient(client);
    setDetailLoading(true);
    setMeasurements([]);
    setPhotos([]);

    const { data: measurementHistory } = await supabase
      .from("current_measurements")
      .select("weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, created_at")
      .eq("user_id", client.user_id)
      .order("created_at", { ascending: false });

    setMeasurements(measurementHistory || []);

    const { data: photoRows } = await supabase
      .from("progress_photos")
      .select("image_path, label, taken_at")
      .eq("user_id", client.user_id)
      .order("taken_at", { ascending: false });

    if (photoRows && photoRows.length > 0) {
      const withSignedUrls = await Promise.all(
        photoRows.map(async (p: any) => {
          const { data: signed } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(p.image_path, 60 * 60);
          return {
            label: p.label,
            imagePath: signed?.signedUrl ?? null,
            taken_at: p.taken_at,
          };
        })
      );
      setPhotos(withSignedUrls);
    }

    setDetailLoading(false);
  };

  if (loading) {
    return (
      <Card className="border border-border rounded-2xl shadow-sm bg-card">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border border-border rounded-2xl shadow-sm bg-card mt-6">
        <CardHeader>
          <CardTitle className="text-[18px] font-semibold text-foreground flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Client Progress
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a client to view full measurements and progress photos
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
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-medium text-sm text-foreground truncate w-full">
                    {client.full_name}
                  </p>
                  {client.latest_weight && (
                    <p className="text-xs text-muted-foreground">
                      {client.latest_weight} kg
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedClient?.full_name}'s Progress</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Measurements */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  Measurement History
                </h4>
                {measurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No measurements logged yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {measurements.map((m, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs border-b border-border/50 pb-2"
                      >
                        <span className="text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                        <span>
                          Weight: {m.weight_kg}kg | Chest: {m.chest_cm}cm | Waist: {m.waist_cm}cm
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Photos */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Progress Photos
                </h4>
                {photos.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No photos uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((p, i) => (
                      <div key={i} className="space-y-1">
                        {p.imagePath ? (
                          <img
                            src={p.imagePath}
                            alt={p.label}
                            className="w-full aspect-[3/4] object-cover rounded-lg border border-border"
                          />
                        ) : (
                          <div className="w-full aspect-[3/4] bg-secondary/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                            Failed to load
                          </div>
                        )}
                        <p className="text-[10px] text-center text-muted-foreground">{p.label}</p>
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