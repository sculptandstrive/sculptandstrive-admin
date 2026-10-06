import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, ChevronLeft, ChevronRight, Dumbbell, Utensils, Droplets,
  CalendarCheck, Video, Flame, ClipboardList, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ---------- helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const thisMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
};
const shiftMonth = (m: string, by: number) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
const monthRange = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  return { start: `${m}-01`, end: `${ny}-${pad(nm)}-01` };
};
const istDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const todayIST = () => istDate(new Date().toISOString());
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const KIND_META: Record<string, { icon: any; tint: string }> = {
  Workout: { icon: Dumbbell, tint: "bg-emerald-50 text-emerald-700" },
  Exercise: { icon: Flame, tint: "bg-orange-50 text-orange-600" },
  Meal: { icon: Utensils, tint: "bg-amber-50 text-amber-600" },
  Water: { icon: Droplets, tint: "bg-sky-50 text-sky-600" },
  "Check-in": { icon: ClipboardList, tint: "bg-violet-50 text-violet-600" },
  Session: { icon: Video, tint: "bg-indigo-50 text-indigo-600" },
};

const STATUS_PILL: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  logged: "bg-emerald-50 text-emerald-700",
  missed: "bg-red-50 text-red-600",
  left: "bg-red-50 text-red-600",
  skipped: "bg-amber-50 text-amber-700",
  scheduled: "bg-slate-100 text-slate-600",
};

type Row = { date: string; kind: string; title: string; status: string; detail: string };

/* ---------- month switcher ---------- */
function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="inline-flex items-center rounded-full border border-[#E2ECE9] bg-white">
      <button aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}
        className="p-2 rounded-l-full hover:bg-[#F1F8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594]">
        <ChevronLeft className="h-4 w-4 text-[#536B83]" />
      </button>
      <span className="px-3 text-sm font-semibold text-[#0F172A] min-w-[130px] text-center">{monthLabel(month)}</span>
      <button aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}
        className="p-2 rounded-r-full hover:bg-[#F1F8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594]">
        <ChevronRight className="h-4 w-4 text-[#536B83]" />
      </button>
    </div>
  );
}

/* ---------- per-user detail ---------- */
function UserDetail({ userId, month }: { userId: string; month: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [allSessions, setAllSessions] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { start, end } = monthRange(month);
      const today = todayIST();
      const out: Row[] = [];
      const bad: string[] = [];
      const join = (...p: any[]) =>
        p.filter((x) => x !== null && x !== undefined && x !== "" && x !== "null" && x !== false).join(" · ");

      const [wp, ex, nl, wt, wc, sa, gm] = await Promise.all([
        supabase.from("workout_progress").select("*").eq("user_id", userId).gte("scheduled_date", start).lt("scheduled_date", end),
        supabase.from("exercise_logs").select("*").eq("user_id", userId).gte("scheduled_date", start).lt("scheduled_date", end),
        supabase.from("nutrition_logs").select("*").eq("user_id", userId).gte("log_date", start).lt("log_date", end),
        supabase.from("water_intake").select("*").eq("user_id", userId).gte("log_date", start).lt("log_date", end),
        supabase.from("weekly_checkins").select("*").eq("user_id", userId).gte("checkin_date", start).lt("checkin_date", end),
        supabase.from("session_assignments").select("session_id").eq("client_id", userId),
        supabase.from("group_members").select("group_id").eq("user_id", userId),
      ]);

      const check = (name: string, r: any) => { if (r.error) bad.push(`${name}: ${r.error.message}`); };
      check("workout_progress", wp); check("exercise_logs", ex); check("nutrition_logs", nl);
      check("water_intake", wt); check("weekly_checkins", wc);
      check("session_assignments", sa); check("group_members", gm);

      (wp.data ?? []).forEach((r: any) => {
        const d = String(r.scheduled_date).slice(0, 10);
        const st = !["completed", "skipped"].includes(r.status) && d < today ? "missed" : r.status;
        out.push({ date: d, kind: "Workout", title: r.workout_name ?? "Workout", status: st,
          detail: join(r.duration_minutes && `${r.duration_minutes} min`, r.calories_burned && `${r.calories_burned} kcal`, r.notes) });
      });
      (ex.data ?? []).forEach((r: any) => {
        out.push({ date: String(r.scheduled_date).slice(0, 10), kind: "Exercise", title: r.exercise_name ?? "Exercise",
          status: r.completed ? "completed" : "left",
          detail: join(r.sets_completed != null && `${r.sets_completed} sets`, r.reps_completed != null && `${r.reps_completed} reps`, r.weight_kg != null && `${r.weight_kg} kg`) });
      });
      (nl.data ?? []).forEach((r: any) => {
        out.push({ date: String(r.log_date).slice(0, 10), kind: "Meal",
          title: `${r.meal_type ? r.meal_type.replace(/_/g, " ").replace(/^./, (c: string) => c.toUpperCase()) : "Meal"}: ${r.meal_name ?? ""}`,
          status: "logged", detail: join(r.calories != null && `${r.calories} kcal`, r.protein_g != null && `${r.protein_g}g protein`) });
      });
      (wt.data ?? []).forEach((r: any) => {
        out.push({ date: String(r.log_date).slice(0, 10), kind: "Water", title: "Water intake", status: "logged", detail: `${r.amount_ml} ml` });
      });
      (wc.data ?? []).forEach((r: any) => {
        out.push({ date: String(r.checkin_date).slice(0, 10), kind: "Check-in", title: "Weekly check-in", status: "logged",
          detail: join(r.weight_kg != null && `${r.weight_kg} kg`, r.mood && `mood: ${r.mood}`, r.notes) });
      });

      const sessionIds = (sa.data ?? []).map((x: any) => x.session_id);
      const groupIds = (gm.data ?? []).map((x: any) => x.group_id);
      const rangeFrom = `${start}T00:00:00+05:30`;
      const rangeTo = `${end}T00:00:00+05:30`;
      const sessionQueries: any[] = [];
      if (sessionIds.length)
        sessionQueries.push(supabase.from("sessions").select("id,title,scheduled_at,trainer_name,joined_count").in("id", sessionIds).gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo));
      if (groupIds.length)
        sessionQueries.push(supabase.from("sessions").select("id,title,scheduled_at,trainer_name,joined_count").in("group_id", groupIds).gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo));
      const seen = new Set<string>();
      for (const q of await Promise.all(sessionQueries)) {
        check("sessions", q);
        (q.data ?? []).forEach((s: any) => {
          if (seen.has(s.id)) return;
          seen.add(s.id);
          out.push({
            date: istDate(s.scheduled_at),
            kind: "Session",
            title: s.title ?? "Session",
            status: "scheduled",
            detail: join(s.trainer_name, s.joined_count != null && `${s.joined_count} joined`),
          });
        });
      }

      const allS: any = await supabase.from("sessions")
        .select("id,title,scheduled_at,trainer_name,joined_count,platform")
        .gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo)
        .order("scheduled_at", { ascending: false });
      check("all sessions", allS);

      if (!cancelled) {
        setAllSessions((allS.data ?? []).map((x: any) => ({ ...x, mine: seen.has(x.id) })));
        out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
        setRows(out);
        setBlocked(bad);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, month]);

  useEffect(() => { setFilter("All"); }, [userId, month]);

  const visible = useMemo(() => (filter === "All" ? rows : rows.filter((r) => r.kind === filter)), [rows, filter]);
  const byDay = useMemo(() => {
    const m: Record<string, Row[]> = {};
    visible.forEach((r) => (m[r.date] ||= []).push(r));
    return m;
  }, [visible]);
  const days = Object.keys(byDay).sort().reverse(); // newest first

  const count = (kind: string, status?: string) =>
    rows.filter((r) => r.kind === kind && (!status || r.status === status)).length;
  const workoutsDone = rows.filter((r) => r.kind === "Workout" && r.status === "completed" && r.title !== "Rest Day").length;
  const waterMl = rows.filter((r) => r.kind === "Water").reduce((s, r) => s + (parseInt(r.detail) || 0), 0);
  const activeDays = new Set(rows.map((r) => r.date)).size;

  const summary = [
    { label: "Workouts done", value: workoutsDone, icon: Dumbbell, tint: "bg-emerald-50 text-emerald-700" },
    { label: "Workouts skipped", value: count("Workout", "skipped"), icon: Dumbbell, tint: "bg-amber-50 text-amber-700" },
    { label: "Sessions assigned", value: count("Session"), icon: Video, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Meals logged", value: count("Meal"), icon: Utensils, tint: "bg-amber-50 text-amber-600" },
    { label: "Water", value: waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)} L` : `${waterMl} ml`, icon: Droplets, tint: "bg-sky-50 text-sky-600" },
    { label: "Active days", value: activeDays, icon: CalendarCheck, tint: "bg-teal-50 text-teal-700" },
  ];

  const kinds = ["All", ...Array.from(new Set(rows.map((r) => r.kind)))];

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[#08B594]" />
      </div>
    );

  return (
    <div className="space-y-5">
      {blocked.length > 0 && (
        <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            Some data could not be read:
            <ul className="list-disc pl-4 mt-1">{blocked.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
        </div>
      )}

      {/* summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-[#E2ECE9] bg-white p-3">
            <div className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center ${s.tint}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-bold leading-tight text-[#0F172A]">{s.value}</div>
              <div className="text-xs text-[#7186A0] truncate">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* all live sessions this month */}
      <div className="rounded-2xl border border-[#E2ECE9] bg-white p-3 sm:p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="font-bold text-sm text-[#0F172A]">Live sessions this month</h4>
          <span className="text-xs text-[#7186A0]">{allSessions.length} total</span>
        </div>
        {!allSessions.length ? (
          <p className="text-xs text-[#7186A0]">No live sessions scheduled this month.</p>
        ) : (
          <ul className="divide-y divide-[#EEF4F2]">
            {allSessions.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-2">
                <div className="h-8 w-8 shrink-0 rounded-lg grid place-items-center bg-indigo-50 text-indigo-600">
                  <Video className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#0F172A] truncate">{x.title ?? "Session"}</div>
                  <div className="text-xs text-[#7186A0] truncate">
                    {new Date(x.scheduled_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    {x.trainer_name ? ` · ${x.trainer_name}` : ""}
                    {x.joined_count != null ? ` · ${x.joined_count} joined` : ""}
                  </div>
                </div>
                {x.mine && (
                  <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-600">Assigned</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* filter chips */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594] ${
                filter === k ? "bg-[#08B594] border-[#08B594] text-white" : "bg-white border-[#E2ECE9] text-[#536B83] hover:bg-[#F1F8F6]"
              }`}>
              {k}
            </button>
          ))}
        </div>
      )}

      {/* timeline */}
      {!days.length ? (
        <div className="rounded-2xl border border-dashed border-[#CFE3DE] py-10 text-center">
          <CalendarCheck className="h-8 w-8 mx-auto text-[#9DB5B0]" />
          <p className="mt-2 text-sm font-semibold text-[#0F172A]">No activity this month</p>
          <p className="text-xs text-[#7186A0]">Try another month using the arrows above.</p>
        </div>
      ) : (
        <div className="relative space-y-4 pl-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[#E2ECE9]">
          {days.map((day) => {
            const d = new Date(day + "T00:00:00");
            return (
              <section key={day} className="relative">
                <span className="absolute -left-5 top-3 h-3.5 w-3.5 rounded-full border-2 border-[#08B594] bg-white" />
                <div className="rounded-2xl border border-[#E2ECE9] bg-white p-3 sm:p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <h4 className="font-bold text-sm text-[#0F172A]">
                      {d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                    </h4>
                    <span className="text-xs text-[#7186A0]">{byDay[day].length} item{byDay[day].length > 1 ? "s" : ""}</span>
                  </div>
                  <ul className="divide-y divide-[#EEF4F2]">
                    {byDay[day].map((r, i) => {
                      const meta = KIND_META[r.kind] ?? KIND_META.Workout;
                      return (
                        <li key={i} className="flex items-center gap-3 py-2">
                          <div className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center ${meta.tint}`}>
                            <meta.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[#0F172A] truncate">{r.title}</div>
                            <div className="text-xs text-[#7186A0] truncate">
                              {r.kind}{r.detail ? ` · ${r.detail}` : ""}
                            </div>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_PILL[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {r.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- member list ---------- */
export default function MemberActivity() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState<{ id: string; name: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("user_id, full_name, email").order("full_name", { ascending: true })
      .then(({ data }) => { setMembers((data ?? []).filter((p: any) => p.user_id)); setLoading(false); });
  }, []);

  const filtered = useMemo(
    () => members.filter((m) => `${m.full_name ?? ""} ${m.email ?? ""}`.toLowerCase().includes(search.toLowerCase())),
    [members, search]
  );

  if (selected) {
    return (
      <Card className="rounded-[28px]">
        <CardHeader className="space-y-4">
          <button onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1 text-sm font-medium text-[#536B83] hover:text-[#0F172A] w-fit">
            <ChevronLeft className="h-4 w-4" /> All members
          </button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-full bg-[#08B594] text-white grid place-items-center font-bold">
                {initials(selected.name)}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-[18px] font-bold text-[#0F172A] truncate">{selected.name}</CardTitle>
                {selected.email && <p className="text-xs text-[#7186A0] truncate">{selected.email}</p>}
              </div>
            </div>
            <MonthNav month={month} onChange={setMonth} />
          </div>
        </CardHeader>
        <CardContent><UserDetail userId={selected.id} month={month} /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px]">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[18px] font-bold text-[#0F172A]">Member Activity</CardTitle>
            <p className="text-xs text-[#7186A0] mt-1">Pick a member to see their daily workouts, meals, water and sessions.</p>
          </div>
          <MonthNav month={month} onChange={setMonth} />
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9DB5B0]" />
          <input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-[#E2ECE9] bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#08B594]/40" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#08B594]" /></div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {filtered.map((m) => {
              const name = m.full_name || m.email || "Unknown";
              return (
                <li key={m.user_id}>
                  <button
                    onClick={() => setSelected({ id: m.user_id, name, email: m.full_name ? m.email : undefined })}
                    className="w-full flex items-center gap-3 rounded-2xl border border-[#E2ECE9] bg-white p-3 text-left transition-colors hover:border-[#08B594] hover:bg-[#F6FBF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594]">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#E6F7F3] text-[#067A64] grid place-items-center text-sm font-bold">
                      {initials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#0F172A] truncate">{name}</div>
                      {m.full_name && m.email && <div className="text-xs text-[#7186A0] truncate">{m.email}</div>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9DB5B0]" />
                  </button>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="sm:col-span-2 py-8 text-center text-sm text-[#7186A0]">No members match "{search}".</li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}