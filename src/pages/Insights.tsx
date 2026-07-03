import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { computeStreak, lastNDays, startOfWeek, toISODate } from "@/lib/dates";
import { toast } from "sonner";

export default function Insights() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Set<string>>(new Set());
  const [habitId, setHabitId] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [savedThisWeek, setSavedThisWeek] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: h } = await supabase.from("habits")
        .select("id").eq("user_id", user.id).eq("archived", false)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!h) return;
      setHabitId(h.id);
      const { data: l } = await supabase.from("habit_logs").select("log_date").eq("habit_id", h.id);
      setLogs(new Set((l ?? []).map((r) => r.log_date as string)));

      const ws = toISODate(startOfWeek());
      const { data: r } = await supabase.from("reflections")
        .select("content").eq("user_id", user.id).eq("week_start", ws).maybeSingle();
      if (r) { setReflection(r.content); setSavedThisWeek(r.content); }
    })();
  }, [user]);

  const last30 = lastNDays(30).map(toISODate);
  const done30 = last30.filter((d) => logs.has(d)).length;
  const streak = computeStreak([...logs]);
  const weekDates = lastNDays(7).map(toISODate);
  const doneWeek = weekDates.filter((d) => logs.has(d)).length;

  const saveReflection = async () => {
    if (!user) return;
    const ws = toISODate(startOfWeek());
    const { error } = await supabase.from("reflections")
      .upsert({ user_id: user.id, habit_id: habitId, week_start: ws, content: reflection }, { onConflict: "user_id,week_start" } as any);
    if (error) return toast.error(error.message);
    setSavedThisWeek(reflection);
    toast.success("Reflection saved.");
  };

  return (
    <div className="min-h-[100dvh] bg-warm safe-top pb-24">
      <div className="max-w-md mx-auto px-6 pt-10 space-y-6">
        <div className="animate-fade-up">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">your patterns</p>
          <h1 className="display text-4xl font-bold lowercase">insights</h1>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="streak" value={String(streak)} suffix="days" />
          <Stat label="this week" value={`${doneWeek}/7`} />
          <Stat label="last 30" value={`${done30}`} suffix="days" />
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">last 30 days</p>
          <div className="grid grid-cols-10 gap-1.5">
            {last30.map((d) => (
              <div key={d} className={`aspect-square rounded-md ${
                logs.has(d) ? "bg-foreground" : "bg-muted"
              }`} />
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">weekly reflection</p>
          <p className="text-sm text-muted-foreground mb-3">
            What helped this week? What got in the way?
          </p>
          <Textarea
            rows={5}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="A short note to your future self…"
            className="rounded-2xl"
          />
          <Button
            onClick={saveReflection}
            className="mt-3 w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
            disabled={!reflection.trim() || reflection === savedThisWeek}
          >
            {savedThisWeek === reflection ? "Saved" : "Save reflection"}
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="display text-2xl font-bold">{value}</p>
      {suffix && <p className="text-xs text-muted-foreground">{suffix}</p>}
    </div>
  );
}
