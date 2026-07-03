import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { computeStreak, lastNDays, startOfWeek, toISODate } from "@/lib/dates";
import { toast } from "sonner";

type Reflection = { week_start: string; content: string }

function isoWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export default function Insights() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Set<string>>(new Set());
  const [habitId, setHabitId] = useState<string | null>(null);
  const [reflection, setReflection] = useState("");
  const [savedThisWeek, setSavedThisWeek] = useState<string | null>(null);
  const [pastReflections, setPastReflections] = useState<Reflection[]>([]);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);

  const thisWeek = toISODate(startOfWeek());

  const loadReflections = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("reflections")
      .select("week_start,content").eq("user_id", user.id)
      .order("week_start", { ascending: false });
    if (r) {
      const current = r.find(x => x.week_start === thisWeek);
      if (current) { setReflection(current.content); setSavedThisWeek(current.content); }
      setPastReflections(r.filter(x => x.week_start !== thisWeek));
    }
  };

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
      await loadReflections();
    })();
  }, [user]);

  const last30 = lastNDays(30).map(toISODate);
  const done30 = last30.filter((d) => logs.has(d)).length;
  const streak = computeStreak([...logs]);
  const weekDates = lastNDays(7).map(toISODate);
  const doneWeek = weekDates.filter((d) => logs.has(d)).length;

  const saveReflection = async () => {
    if (!user) return;
    const { error } = await supabase.from("reflections")
      .upsert({ user_id: user.id, habit_id: habitId, week_start: thisWeek, content: reflection }, { onConflict: "user_id,week_start" } as any);
    if (error) return toast.error(error.message);
    setSavedThisWeek(reflection);
    toast.success("Reflection saved.");
  };

  const saveEdit = async (weekStart: string) => {
    if (!user) return;
    const { error } = await supabase.from("reflections")
      .upsert({ user_id: user.id, week_start: weekStart, content: editContent }, { onConflict: "user_id,week_start" } as any);
    if (error) return toast.error(error.message);
    setEditingWeek(null);
    await loadReflections();
    toast.success("Reflection updated.");
  };

  const deleteReflection = async (weekStart: string) => {
    if (!confirm("Delete this reflection?")) return;
    if (!user) return;
    const { error } = await supabase.from("reflections")
      .delete().eq("user_id", user.id).eq("week_start", weekStart);
    if (error) return toast.error(error.message);
    setPastReflections(prev => prev.filter(r => r.week_start !== weekStart));
    toast.success("Reflection deleted.");
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
              <div key={d} className={`aspect-square rounded-md ${logs.has(d) ? "bg-done" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">weekly reflection</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Week {isoWeekNumber(thisWeek)}</p>
          <p className="text-sm text-muted-foreground mb-3">What helped this week? What got in the way?</p>
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
            {savedThisWeek === reflection && savedThisWeek ? "Saved" : "Save reflection"}
          </Button>
        </div>

        {pastReflections.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">past reflections</p>
            {pastReflections.map((r) => (
              <div key={r.week_start} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Week {isoWeekNumber(r.week_start)} · {r.week_start}
                  </p>
                  {editingWeek !== r.week_start && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingWeek(r.week_start); setEditContent(r.content); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        edit
                      </button>
                      <button
                        onClick={() => deleteReflection(r.week_start)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        delete
                      </button>
                    </div>
                  )}
                </div>

                {editingWeek === r.week_start ? (
                  <>
                    <Textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="rounded-xl mb-2"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => saveEdit(r.week_start)}
                        disabled={!editContent.trim() || editContent === r.content}
                        className="flex-1 h-9 rounded-xl bg-foreground text-background text-xs"
                      >
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingWeek(null)}
                        className="flex-1 h-9 rounded-xl text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{r.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
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
