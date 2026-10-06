import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pad = (n: number) => String(n).padStart(2, "0");
const thisMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
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

const STATUS_COLOR: Record<string, string> = {
  completed: "text-emerald-600", logged: "text-emerald-600",
  missed: "text-red-500", left: "text-red-500",
  skipped: "text-amber-600", scheduled: "text-slate-500",
};

type Row = { date: string; kind: string; title: string; status: string; detail: string };

function UserDetail({ userId, month }: { userId: string; month: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { start, end } = monthRange(month);
      const today = todayIST();
      const out: Row[] = [];
      const bad: string[] = [];
      const join = (...p: any[]) => p.filter((x) => x !== null && x !== undefined && x !== "").join(" · ");

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
          title: `${r.meal_type ? r.meal_type[0].toUpperCase() + r.meal_type.slice(1) : "Meal"}: ${r.meal_name ?? ""}`,
          status: "logged", detail: join(r.calories != null && `${r.calories} kcal`, r.protein_g != null && `${r.protein_g}g protein`) });
      });
      (wt.data ?? []).forEach((r: any) => {
        out.push({ date: String(r.log_date).slice(0, 10), kind: "Water", title: "Water intake", status: "logged", detail: `${r.amount_ml} ml` });
      });
      (wc.data ?? []).forEach((r: any) => {
        out.push({ date: String(r.checkin_date).slice(0, 10), kind: "Check-in", title: "Weekly check-in", status: "logged",
          detail: join(r.weight_kg != null && `${r.weight_kg} kg`, r.mood && `mood: ${r.mood}`, r.notes) });
      });

      // Sessions assigned to this user (attendance is not recorded in the database)
      const sessionIds = (sa.data ?? []).map((x: any) => x.session_id);
      const groupIds = (gm.data ?? []).map((x: any) => x.group_id);
      const rangeFrom = `${start}T00:00:00+05:30`;
      const rangeTo = `${end}T00:00:00+05:30`;
      const sessionQueries: any[] = [];
      if (sessionIds.length)
        sessionQueries.push(supabase.from("sessions").select("id,title,scheduled_at,trainer_name").in("id", sessionIds).gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo));
      if (groupIds.length)
        sessionQueries.push(supabase.from("sessions").select("id,title,scheduled_at,trainer_name").in("group_id", groupIds).gte("scheduled_at", rangeFrom).lt("scheduled_at", rangeTo));
      const seen = new Set<string>();
      for (const q of await Promise.all(sessionQueries)) {
        check("sessions", q);
        (q.data ?? []).forEach((s: any) => {
          if (seen.has(s.id)) return;
          seen.add(s.id);
          out.push({ date: istDate(s.scheduled_at), kind: "Session", title: s.title ?? "Session", status: "scheduled", detail: s.trainer_name ?? "" });
        });
      }

      if (!cancelled) {
        out.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
        setRows(out);
        setBlocked(bad);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, month]);

  const byDay: Record<string, Row[]> = {};
  rows.forEach((r) => (byDay[r.date] ||= []).push(r));
  const days = Object.keys(byDay).sort();

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-[#08B594]" />;

  return (
    <div className="space-y-3">
      {blocked.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          Some data could not be read:
          <ul className="list-disc pl-4">{blocked.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
      {!days.length && <p className="text-sm text-[#7186A0]">No activity recorded this month.</p>}
      {days.map((day) => (
        <div key={day} className="rounded-2xl border border-[#E2ECE9] p-3">
          <div className="font-bold text-sm text-[#0F172A] mb-2">
            {new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
          <ul className="space-y-1 text-sm">
            {byDay[day].map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <b className="text-[#536B83]">{r.kind}:</b> {r.title}
                  {r.detail && <span className="text-[#7186A0]"> ({r.detail})</span>}
                </span>
                <span className={`font-semibold capitalize ${STATUS_COLOR[r.status] ?? ""}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function MemberActivity() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

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
        <CardHeader>
          <button onClick={() => setSelected(null)} className="text-sm text-[#536B83] text-left">← Back to all members</button>
          <CardTitle className="text-[18px] font-bold text-[#0F172A]">{selected.name}</CardTitle>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded-lg px-2 py-1 text-sm w-fit" />
        </CardHeader>
        <CardContent><UserDetail userId={selected.id} month={month} /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px]">
      <CardHeader>
        <CardTitle className="text-[18px] font-bold text-[#0F172A]">Member Activity</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded-lg px-2 py-1 text-sm" />
          <input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded-lg px-2 py-1 text-sm" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-[#08B594]" />
        ) : (
          <ul className="divide-y divide-[#E2ECE9]">
            {filtered.map((m) => (
              <li key={m.user_id} className="py-2">
                <button className="font-semibold text-[#0F172A] hover:underline text-left"
                  onClick={() => setSelected({ id: m.user_id, name: m.full_name || m.email })}>
                  {m.full_name || m.email}
                </button>
                {m.full_name && m.email && <span className="text-xs text-[#7186A0]"> · {m.email}</span>}
              </li>
            ))}
            {!filtered.length && <li className="py-4 text-center text-[#7186A0] text-sm">No members found.</li>}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}