import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Search, ChevronLeft, ChevronRight, Dumbbell, Utensils, Droplets,
  CalendarCheck, CalendarDays, Video, Flame, ClipboardList, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ---------- helpers (all dates follow the viewer's own timezone and locale) ---------- */
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
  return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
const monthRange = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  return { start: `${m}-01`, end: `${ny}-${pad(nm)}-01` };
};
const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayLocal = () => localDate(new Date().toISOString());
const viewerTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
  new Date(2023, 0, 1 + i).toLocaleDateString(undefined, { weekday: "short" })
);
const num = (v: any) => parseFloat(String(v ?? "")) || 0;
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
  ended: "bg-slate-100 text-slate-500",
  attended: "bg-emerald-50 text-emerald-700",
  "not tracked": "bg-slate-100 text-slate-500",
};

type Row = { date: string; kind: string; title: string; status: string; detail: string; mine?: boolean };
type DayStat = { cal: number; protein: number; carbs: number; fats: number; water: number };
type Plans = { summary: any | null; workouts: any[]; diet: any[]; req: any | null; days: Record<string, DayStat> };

/* ---------- month bar: click the month name to open a calendar ---------- */
function MonthNav({ month, onChange, selDay, onPickDay }: {
  month: string; onChange: (m: string) => void; selDay?: string | null; onPickDay?: (d: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(month);
  useEffect(() => { setView(month); }, [month, open]);

  const [y, mo] = view.split("-").map(Number);
  const first = new Date(y, mo - 1, 1).getDay();
  const total = new Date(y, mo, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, i) => `${view}-${pad(i + 1)}`),
  ];
  const today = todayLocal();
  const pick = (date: string) => { onChange(date.slice(0, 7)); onPickDay?.(date); setOpen(false); };

  return (
    <div className="relative inline-block">
      <div className="inline-flex items-center rounded-full border border-[#E2ECE9] bg-white">
        <button aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}
          className="p-2 rounded-l-full hover:bg-[#F1F8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594]">
          <ChevronLeft className="h-4 w-4 text-[#536B83]" />
        </button>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Open calendar"
          className="px-3 py-1.5 text-sm font-semibold text-[#0F172A] min-w-[150px] inline-flex items-center justify-center gap-1.5 hover:bg-[#F1F8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594]">
          <CalendarDays className="h-4 w-4 text-[#08B594]" />
          {monthLabel(month)}
        </button>
        <button aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}
          className="p-2 rounded-r-full hover:bg-[#F1F8F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#08B594]">
          <ChevronRight className="h-4 w-4 text-[#536B83]" />
        </button>
      </div>

      {open && (
        <>
          <button aria-label="Close calendar" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[290px] rounded-2xl border border-[#E2ECE9] bg-white p-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <button aria-label="Previous month" onClick={() => setView(shiftMonth(view, -1))} className="p-1.5 rounded-full hover:bg-[#F1F8F6]">
                <ChevronLeft className="h-4 w-4 text-[#536B83]" />
              </button>
              <span className="text-sm font-bold text-[#0F172A]">{monthLabel(view)}</span>
              <button aria-label="Next month" onClick={() => setView(shiftMonth(view, 1))} className="p-1.5 rounded-full hover:bg-[#F1F8F6]">
                <ChevronRight className="h-4 w-4 text-[#536B83]" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#9DB5B0] mb-1">
              {weekdayLabels.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((date, i) =>
                date ? (
                  <button key={date} onClick={() => pick(date)}
                    className={`h-9 rounded-lg text-sm transition-colors ${
                      date === selDay ? "bg-[#08B594] text-white font-bold" : "text-[#0F172A] hover:bg-[#E6F7F3]"
                    } ${date === today && date !== selDay ? "ring-1 ring-[#08B594] font-bold" : ""}`}>
                    {Number(date.slice(8))}
                  </button>
                ) : <div key={`e${i}`} />
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <button onClick={() => pick(today)} className="text-xs font-semibold text-[#08B594] hover:underline">Today</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- per-user detail ---------- */
function UserDetail({ userId, month, selDay, onSelDay }: {
  userId: string; month: string; selDay: string | null; onSelDay: (d: string | null) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plans>({ summary: null, workouts: [], diet: [], req: null, days: {} });
  const [track, setTrack] = useState<{ ready: boolean; from: string | null }>({ ready: false, from: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { start, end } = monthRange(month);
      const today = todayLocal();
      const out: Row[] = [];
      const bad: string[] = [];
      const join = (...p: any[]) =>
        p.filter((x) => x !== null && x !== undefined && x !== "" && x !== "null" && x !== false).join(" · ");
      const dayOf = (d: any) => String(d).slice(0, 10);

      const [wp, ex, nl, wt, wc, sa, gm, wk] = await Promise.all([
        supabase.from("workout_progress").select("*").eq("user_id", userId).gte("scheduled_date", start).lt("scheduled_date", end),
        supabase.from("exercise_logs").select("*").eq("user_id", userId).gte("scheduled_date", start).lt("scheduled_date", end),
        supabase.from("nutrition_logs").select("*").eq("user_id", userId).gte("log_date", start).lt("log_date", end),
        supabase.from("water_intake").select("*").eq("user_id", userId).gte("log_date", start).lt("log_date", end),
        supabase.from("weekly_checkins").select("*").eq("user_id", userId).gte("checkin_date", start).lt("checkin_date", end),
        supabase.from("session_assignments").select("session_id").eq("client_id", userId),
        supabase.from("group_members").select("group_id").eq("user_id", userId),
        supabase.from("workouts").select("*").eq("user_id", userId).gte("workout_date", start).lt("workout_date", end),
      ]);

      const check = (name: string, r: any) => { if (r.error) bad.push(`${name}: ${r.error.message}`); };
      check("workout_progress", wp); check("exercise_logs", ex); check("nutrition_logs", nl);
      check("water_intake", wt); check("weekly_checkins", wc);
      check("session_assignments", sa); check("group_members", gm); check("workouts", wk);

      (wp.data ?? []).forEach((r: any) => {
        const d = dayOf(r.scheduled_date);
        const st = !["completed", "skipped"].includes(r.status) && d < today ? "missed" : r.status;
        out.push({ date: d, kind: "Workout", title: r.workout_name ?? "Workout", status: st,
          detail: join(r.duration_minutes && `${r.duration_minutes} min`, r.calories_burned && `${r.calories_burned} kcal`, r.notes) });
      });
      (wk.data ?? []).forEach((r: any) => {
        if (!r.workout_date || !r.completed) return;
        const d = dayOf(r.workout_date);
        const title = r.name ?? r.day_name ?? "Workout";
        if (out.some((o) => o.kind === "Workout" && o.date === d && o.title === title)) return;
        out.push({ date: d, kind: "Workout", title, status: "completed",
          detail: join(r.duration_min && `${r.duration_min} min`, r.calories_burned && `${r.calories_burned} kcal`, r.category) });
      });
      (ex.data ?? []).forEach((r: any) => {
        out.push({ date: dayOf(r.scheduled_date), kind: "Exercise", title: r.exercise_name ?? "Exercise",
          status: r.completed ? "completed" : "left",
          detail: join(r.sets_completed != null && `${r.sets_completed} sets`, r.reps_completed != null && `${r.reps_completed} reps`, r.weight_kg != null && `${r.weight_kg} kg`) });
      });
      (nl.data ?? []).forEach((r: any) => {
        out.push({ date: dayOf(r.log_date), kind: "Meal",
          title: `${r.meal_type ? r.meal_type.replace(/_/g, " ").replace(/^./, (c: string) => c.toUpperCase()) : "Meal"}: ${r.meal_name ?? ""}`,
          status: "logged", detail: join(r.calories != null && `${r.calories} kcal`, r.protein_g != null && `${r.protein_g}g protein`) });
      });
      (wt.data ?? []).forEach((r: any) => {
        out.push({ date: dayOf(r.log_date), kind: "Water", title: "Water intake", status: "logged", detail: `${r.amount_ml} ml` });
      });
      (wc.data ?? []).forEach((r: any) => {
        out.push({ date: dayOf(r.checkin_date), kind: "Check-in", title: "Weekly check-in", status: "logged",
          detail: join(r.weight_kg != null && `${r.weight_kg} kg`, r.mood && `mood: ${r.mood}`, r.notes) });
      });

      /* live-session attendance (optional table; the page works without it) */
      const attQ: any = await supabase.from("session_attendance").select("session_id").eq("user_id", userId);
      const firstQ: any = await supabase.from("session_attendance").select("joined_at").order("joined_at", { ascending: true }).limit(1);
      const missingTable = (e: any) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /does not exist|schema cache/i.test(e.message ?? ""));
      const trackReady = !attQ.error;
      if (attQ.error && !missingTable(attQ.error)) check("session_attendance", attQ);
      const joined = new Set<string>((attQ.data ?? []).map((x: any) => x.session_id));
      const trackFrom: string | null = firstQ.data?.[0]?.joined_at ? localDate(firstQ.data[0].joined_at) : null;
      const sessionStatus = (id: string, d: string) =>
        joined.has(id) ? "attended"
        : d >= today ? "scheduled"
        : !trackReady ? "ended"
        : !trackFrom || d < trackFrom ? "not tracked"
        : "missed";

      /* sessions assigned to this member (directly or through a group) */
      const groupIds = (gm.data ?? []).map((x: any) => x.group_id);
      const gs: any = groupIds.length
        ? await supabase.from("group_sessions").select("session_id").in("group_id", groupIds)
        : { data: [] };
      check("group_sessions", gs);
      const sessionIds = Array.from(new Set<string>([
        ...(sa.data ?? []).map((x: any) => x.session_id),
        ...(gs.data ?? []).map((x: any) => x.session_id),
      ]));
      const rangeFrom = new Date(`${start}T00:00:00`).toISOString();
      const rangeTo = new Date(`${end}T00:00:00`).toISOString();
      const cols = "id,title,scheduled_at,trainer_name";
      const sessionQueries: any[] = [];
      if (sessionIds.length)
        sessionQueries.push(supabase.from("sessions").select(cols).in("id", sessionIds).gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo));
      if (groupIds.length)
        sessionQueries.push(supabase.from("sessions").select(cols).in("group_id", groupIds).gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo));
      const seen = new Set<string>();
      for (const q of await Promise.all(sessionQueries)) {
        check("sessions", q);
        (q.data ?? []).forEach((s: any) => {
          if (seen.has(s.id)) return;
          seen.add(s.id);
          const d = localDate(s.scheduled_at);
          out.push({
            date: d, kind: "Session", title: s.title ?? "Session", mine: true,
            status: sessionStatus(s.id, d),
            detail: join(s.trainer_name),
          });
        });
      }

      /* plans, targets and all-time workout summary */
      const [sm, cwa, ump, nr]: any[] = await Promise.all([
        supabase.from("user_workout_summary").select("*").eq("user_id", userId).limit(1),
        supabase.from("client_workout_assignments").select("plan_id,assigned_at,status").eq("client_id", userId).order("assigned_at", { ascending: false }),
        supabase.from("user_meal_plans").select("plan_id,assigned_at").eq("user_id", userId).order("assigned_at", { ascending: false }),
        supabase.from("nutrition_requirements").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(1),
      ]);
      check("user_workout_summary", sm); check("client_workout_assignments", cwa);
      check("user_meal_plans", ump); check("nutrition_requirements", nr);
      const wPlanIds = (cwa.data ?? []).map((x: any) => x.plan_id);
      const mPlanIds = (ump.data ?? []).map((x: any) => x.plan_id);
      const none: any = { data: [] };
      const [wpl, wpe, mpl]: any[] = await Promise.all([
        wPlanIds.length ? supabase.from("workout_plans").select("id,name").in("id", wPlanIds) : Promise.resolve(none),
        wPlanIds.length ? supabase.from("workout_plan_exercises").select("plan_id").in("plan_id", wPlanIds) : Promise.resolve(none),
        mPlanIds.length ? supabase.from("meal_plans").select("*").in("id", mPlanIds) : Promise.resolve(none),
      ]);
      check("workout_plans", wpl); check("workout_plan_exercises", wpe); check("meal_plans", mpl);

      const planWorkouts = (cwa.data ?? []).map((a: any) => ({
        name: (wpl.data ?? []).find((q: any) => q.id === a.plan_id)?.name ?? "Workout plan",
        assigned_at: a.assigned_at,
        status: a.status,
        exercises: (wpe.data ?? []).filter((e: any) => e.plan_id === a.plan_id).length,
      }));
      const planDiet = (ump.data ?? []).map((a: any) => {
        const m = (mpl.data ?? []).find((q: any) => q.id === a.plan_id);
        return m ? { name: m.name ?? "Meal plan", assigned_at: a.assigned_at,
          calories: num(m.calories), protein: num(m.protein), carbs: num(m.carbs), fats: num(m.fats), water: m.water } : null;
      }).filter(Boolean);
      const rq = (nr.data ?? [])[0];
      const requirement = rq ? {
        name: "Saved nutrition requirements",
        calories: num(rq.calories_requirement), protein: num(rq.protein_requirement),
        carbs: num(rq.carbs_requirement), fats: num(rq.fats_requirement), water: rq.water_requirement,
      } : null;

      const dayStats: Record<string, DayStat> = {};
      const stat = (d: any) => (dayStats[dayOf(d)] ||= { cal: 0, protein: 0, carbs: 0, fats: 0, water: 0 });
      (nl.data ?? []).forEach((r: any) => {
        const x = stat(r.log_date);
        x.cal += num(r.calories); x.protein += num(r.protein_g); x.carbs += num(r.carbs_g); x.fats += num(r.fats_g);
      });
      (wt.data ?? []).forEach((r: any) => { stat(r.log_date).water += num(r.amount_ml); });

      const allS: any = await supabase.from("sessions")
        .select("id,title,scheduled_at,trainer_name,platform")
        .gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo)
        .order("scheduled_at", { ascending: false });
      check("all sessions", allS);
      const assignedIds = new Set(seen);
      (allS.data ?? []).forEach((x: any) => {
        if (joined.has(x.id) && !assignedIds.has(x.id)) {
          out.push({ date: localDate(x.scheduled_at), kind: "Session", title: x.title ?? "Session", status: "attended", detail: join(x.trainer_name) });
        }
      });
      const attendeeCount: Record<string, number> = {};
      if (trackReady && (allS.data ?? []).length) {
        const ac: any = await supabase.from("session_attendance").select("session_id").in("session_id", (allS.data ?? []).map((x: any) => x.id));
        (ac.data ?? []).forEach((x: any) => { attendeeCount[x.session_id] = (attendeeCount[x.session_id] || 0) + 1; });
      }

      if (!cancelled) {
        setAllSessions((allS.data ?? []).map((x: any) => {
          const d = localDate(x.scheduled_at);
          const mine = assignedIds.has(x.id);
          return {
            ...x, mine,
            status: mine || joined.has(x.id) ? sessionStatus(x.id, d) : d < today ? "ended" : null,
            attendees: trackFrom && d >= trackFrom ? (attendeeCount[x.id] ?? 0) : null,
          };
        }));
        setTrack({ ready: trackReady, from: trackFrom });
        setPlans({ summary: sm.data?.[0] ?? null, workouts: planWorkouts, diet: planDiet as any[], req: requirement, days: dayStats });
        out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
        setRows(out);
        setBlocked(bad);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, month]);

  useEffect(() => { setFilter("All"); }, [userId, month]);

  const visible = useMemo(
    () => rows.filter((r) => (filter === "All" || r.kind === filter) && (!selDay || r.date === selDay)),
    [rows, filter, selDay]
  );
  const byDay = useMemo(() => {
    const m: Record<string, Row[]> = {};
    visible.forEach((r) => (m[r.date] ||= []).push(r));
    return m;
  }, [visible]);
  const days = Object.keys(byDay).sort().reverse(); // newest first

  const count = (kind: string, status?: string) =>
    rows.filter((r) => r.kind === kind && (!status || r.status === status)).length;
  const waterMl = rows.filter((r) => r.kind === "Water").reduce((s, r) => s + (parseInt(r.detail) || 0), 0);
  const activeDays = new Set(
    rows.filter((r) => ["completed", "logged", "skipped", "attended"].includes(r.status)).map((r) => r.date)
  ).size;

  const summary = [
    { label: "Workouts done", value: count("Workout", "completed"), icon: Dumbbell, tint: "bg-emerald-50 text-emerald-700" },
    { label: "Workouts skipped", value: count("Workout", "skipped"), icon: Dumbbell, tint: "bg-amber-50 text-amber-700" },
    { label: "Sessions attended", value: count("Session", "attended"), icon: Video, tint: "bg-emerald-50 text-emerald-700" },
    { label: "Sessions missed", value: count("Session", "missed"), icon: Video, tint: "bg-red-50 text-red-600" },
    { label: "Sessions assigned", value: rows.filter((r) => r.kind === "Session" && r.mine).length, icon: Video, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Meals logged", value: count("Meal"), icon: Utensils, tint: "bg-amber-50 text-amber-600" },
    { label: "Water", value: waterMl >= 1000 ? `${(waterMl / 1000).toFixed(1)} L` : `${waterMl} ml`, icon: Droplets, tint: "bg-sky-50 text-sky-600" },
    { label: "Active days", value: activeDays, icon: CalendarCheck, tint: "bg-teal-50 text-teal-700" },
  ];

  /* diet: compare daily averages with the assigned plan, or the member's saved requirements */
  const target = plans.diet[0] ?? plans.req;
  const dayList = Object.values(plans.days);
  const mealDays = dayList.filter((d) => d.cal > 0);
  const waterDays = dayList.filter((d) => d.water > 0);
  const avg = (arr: DayStat[], k: keyof DayStat) => (arr.length ? arr.reduce((s, d) => s + d[k], 0) / arr.length : 0);
  const dietRows = target
    ? [
        { label: "Calories", unit: "kcal", goal: target.calories, got: avg(mealDays, "cal") },
        { label: "Protein", unit: "g", goal: target.protein, got: avg(mealDays, "protein") },
        { label: "Carbs", unit: "g", goal: target.carbs, got: avg(mealDays, "carbs") },
        { label: "Fats", unit: "g", goal: target.fats, got: avg(mealDays, "fats") },
      ].filter((r) => r.goal > 0)
    : [];

  const exLogged = count("Exercise");
  const exDone = count("Exercise", "completed");
  const sm = plans.summary;
  const rateRaw = sm ? num(sm.completion_rate) : 0;
  const ratePct = Math.round(rateRaw <= 1 ? rateRaw * 100 : rateRaw);

  const kinds = ["All", ...Array.from(new Set(rows.map((r) => r.kind)))];

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-[#08B594]" />
      </div>
    );

  return (
    <div className="space-y-5">
      {selDay && (
        <div className="flex items-center justify-between rounded-xl bg-[#F1F8F6] px-3 py-2 text-xs">
          <span className="font-semibold text-[#0F172A]">
            Showing {new Date(selDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <button onClick={() => onSelDay(null)} className="font-semibold text-[#08B594] hover:underline">Show whole month</button>
        </div>
      )}

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* workout plan tracking */}
      <div className="rounded-2xl border border-[#E2ECE9] bg-white p-3 sm:p-4 space-y-3">
        <h4 className="font-bold text-sm text-[#0F172A]">Workout plan tracking</h4>
        {sm ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Completed (all time)", sm.completed_workouts ?? 0, "text-emerald-700"],
              ["Missed (all time)", sm.missed_workouts ?? 0, "text-red-600"],
              ["Skipped (all time)", sm.skipped_workouts ?? 0, "text-amber-700"],
              ["Completion rate", `${ratePct}%`, "text-[#0F172A]"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-xl bg-[#F6FBF9] p-2 text-center">
                <div className={`text-lg font-bold ${c}`}>{v}</div>
                <div className="text-xs text-[#7186A0]">{l}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#7186A0]">No workout summary for this member yet.</p>
        )}
        {plans.workouts.length ? (
          <ul className="divide-y divide-[#EEF4F2]">
            {plans.workouts.map((w, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0F172A] truncate">{w.name}</div>
                  <div className="text-xs text-[#7186A0]">
                    {w.exercises} exercise{w.exercises === 1 ? "" : "s"}
                    {w.assigned_at ? ` · assigned ${new Date(w.assigned_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </div>
                </div>
                {w.status && <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize bg-slate-100 text-slate-600">{w.status}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#7186A0]">No workout plan assigned.</p>
        )}
        <p className="text-xs text-[#7186A0]">This month: {exDone} of {exLogged} logged exercises completed.</p>
      </div>

      {/* diet plan tracking */}
      <div className="rounded-2xl border border-[#E2ECE9] bg-white p-3 sm:p-4 space-y-3">
        <h4 className="font-bold text-sm text-[#0F172A]">Diet plan tracking</h4>
        {!target ? (
          <p className="text-xs text-[#7186A0]">No diet plan or nutrition requirements saved for this member.</p>
        ) : (
          <>
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">{target.name}</div>
              <div className="text-xs text-[#7186A0]">
                {plans.diet[0] ? "Assigned meal plan" : "No meal plan assigned, using the member's saved requirements"}
              </div>
            </div>
            {!mealDays.length ? (
              <p className="text-xs text-[#7186A0]">No meals logged this month.</p>
            ) : (
              <div className="space-y-2">
                {dietRows.map((r) => {
                  const pct = Math.round((r.got / r.goal) * 100);
                  return (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#0F172A]">{r.label}</span>
                        <span className="text-[#7186A0]">{Math.round(r.got)} / {Math.round(r.goal)} {r.unit} · {pct}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-[#EEF4F2] overflow-hidden">
                        <div className="h-full rounded-full bg-[#08B594]" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-[#7186A0]">
              Daily average over {mealDays.length} day{mealDays.length === 1 ? "" : "s"} with meals logged.
              {target.water != null && target.water !== "" ? ` Water target as saved: ${target.water}. ` : " "}
              {waterDays.length ? `Average water logged: ${Math.round(avg(waterDays, "water"))} ml on ${waterDays.length} day${waterDays.length === 1 ? "" : "s"}.` : ""}
            </p>
          </>
        )}
      </div>

      {/* all live sessions this month */}
      <div className="rounded-2xl border border-[#E2ECE9] bg-white p-3 sm:p-4">
        <div className="flex items-baseline justify-between mb-1">
          <h4 className="font-bold text-sm text-[#0F172A]">Live sessions this month</h4>
          <span className="text-xs text-[#7186A0]">{allSessions.length} total</span>
        </div>
        <p className="text-xs text-[#7186A0] mb-2">
          Times shown in your timezone ({viewerTZ}).{" "}
          {track.from
            ? `Attendance is tracked from ${new Date(track.from + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}; earlier sessions show "not tracked".`
            : track.ready
              ? "Attendance tracking is on, but no joins are recorded yet."
              : "Attendance tracking is not set up yet, so attended and missed cannot be shown."}
        </p>
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
                    {new Date(x.scheduled_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}
                    {x.trainer_name ? ` · ${x.trainer_name}` : ""}
                    {x.attendees != null ? ` · ${x.attendees} joined` : ""}
                  </div>
                </div>
                {x.status && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_PILL[x.status] ?? "bg-slate-100 text-slate-600"}`}>{x.status}</span>
                )}
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
          <p className="mt-2 text-sm font-semibold text-[#0F172A]">{selDay ? "No activity on this day" : "No activity this month"}</p>
          <p className="text-xs text-[#7186A0]">Click the month name above to pick another date.</p>
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
                      {d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}
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
  const [selDay, setSelDay] = useState<string | null>(null);
  const changeMonth = (m: string) => { setMonth(m); setSelDay(null); };
  const pickDay = (d: string) => { setMonth(d.slice(0, 7)); setSelDay(d); };

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
            <MonthNav month={month} onChange={changeMonth} selDay={selDay} onPickDay={pickDay} />
          </div>
        </CardHeader>
        <CardContent><UserDetail userId={selected.id} month={month} selDay={selDay} onSelDay={setSelDay} /></CardContent>
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
          <MonthNav month={month} onChange={changeMonth} />
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
                    onClick={() => { setSelDay(null); setSelected({ id: m.user_id, name, email: m.full_name ? m.email : undefined }); }}
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