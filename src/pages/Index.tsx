import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Onboarding from "@/components/Onboarding";
import BottomNav from "@/components/BottomNav";
import WeekStrip from "@/components/WeekStrip";
import { computeStreak, today } from "@/lib/dates";
import { parseDurationMinutes, formatTimer } from "@/lib/duration";
import { Check, Flame, Timer, X } from "lucide-react";
import { toast } from "sonner";

type Habit = { id: string; name: string; detail: string | null; emoji: string | null };

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [pop, setPop] = useState(false);

  // timer state
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: h } = await supabase
      .from("habits")
      .select("id,name,detail,emoji")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setHabit(h ?? null);
    if (h) {
      const { data: l } = await supabase
        .from("habit_logs")
        .select("log_date")
        .eq("habit_id", h.id);
      setLogs(new Set((l ?? []).map((r) => r.log_date as string)));
    }
    setReady(true);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const todayISO = today();
  const doneToday = logs.has(todayISO);
  const streak = computeStreak([...logs]);

  const durationMin = useMemo(
    () => (habit ? parseDurationMinutes(habit.detail) : null),
    [habit]
  );

  const markDone = useCallback(async (silent = false) => {
    if (!habit || !user) return;
    if (logs.has(todayISO)) return;
    const { error } = await supabase.from("habit_logs").insert({
      user_id: user.id, habit_id: habit.id, log_date: todayISO,
    });
    if (error) {
      if (!silent) toast.error(error.message);
      return;
    }
    setLogs((prev) => {
      const next = new Set(prev); next.add(todayISO); return next;
    });
    toast.success(silent ? "Time's up. Habit done." : "Done. One more day.");
  }, [habit, user, logs, todayISO]);

  // Timer tick
  useEffect(() => {
    if (timerEndsAt === null) return;
    setNow(Date.now());
    tickRef.current = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [timerEndsAt]);

  // Timer completion
  useEffect(() => {
    if (timerEndsAt !== null && now >= timerEndsAt) {
      setTimerEndsAt(null);
      setPop(true); setTimeout(() => setPop(false), 500);
      markDone(true);
      if ("vibrate" in navigator) navigator.vibrate?.([120, 60, 120]);
    }
  }, [now, timerEndsAt, markDone]);

  const startTimer = () => {
    if (!durationMin) return;
    setTimerEndsAt(Date.now() + durationMin * 60 * 1000);
  };

  const cancelTimer = () => {
    setTimerEndsAt(null);
    toast("Timer cancelled.");
  };

  const handleBigButton = async () => {
    if (!habit || !user) return;
    setPop(true); setTimeout(() => setPop(false), 500);
    if (doneToday) {
      // un-mark
      await supabase.from("habit_logs").delete()
        .eq("habit_id", habit.id).eq("log_date", todayISO);
      const next = new Set(logs); next.delete(todayISO); setLogs(next);
      return;
    }
    if (durationMin && timerEndsAt === null) {
      startTimer();
      return;
    }
    if (timerEndsAt !== null) return; // ignore taps while timer running
    const { error } = await supabase.from("habit_logs").insert({
      user_id: user.id, habit_id: habit.id, log_date: todayISO,
    });
    if (error) return toast.error(error.message);
    const next = new Set(logs); next.add(todayISO); setLogs(next);
    toast.success("Done. One more day.");
  };

  if (loading || !ready) {
    return <div className="min-h-[100dvh] bg-warm flex items-center justify-center text-muted-foreground">…</div>;
  }

  if (!habit && user) {
    return <Onboarding userId={user.id} onCreated={load} />;
  }

  if (!habit) return null;

  const remainingSec = timerEndsAt !== null ? Math.max(0, Math.ceil((timerEndsAt - now) / 1000)) : 0;
  const totalSec = (durationMin ?? 0) * 60;
  const progress = timerEndsAt !== null && totalSec > 0
    ? 1 - remainingSec / totalSec
    : 0;
  const running = timerEndsAt !== null;

  return (
    <div className="min-h-[100dvh] bg-warm safe-top pb-24">
      <div className="max-w-md mx-auto px-6 pt-10">
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">today</p>
            <h1 className="display text-4xl font-bold lowercase leading-tight">
              {habit.emoji && <span className="mr-2">{habit.emoji}</span>}
              {habit.name}
              {habit.detail && <span className="text-muted-foreground"> · {habit.detail}</span>}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-10 animate-fade-up">
          <Flame className="w-5 h-5 text-accent" />
          <span className="font-semibold">{streak}</span>
          <span className="text-muted-foreground">day{streak === 1 ? "" : "s"} in a row</span>
        </div>

        {/* The big button */}
        <div className="flex flex-col items-center my-10">
          <button
            onClick={handleBigButton}
            disabled={running}
            className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all overflow-hidden ${
              doneToday
                ? "bg-foreground text-background shadow-soft"
                : "bg-ember text-accent-foreground shadow-glow"
            } ${pop ? "animate-pop" : ""} ${running ? "cursor-default" : ""}`}
          >
            {/* progress ring */}
            {running && (
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="4" />
                <circle
                  cx="50" cy="50" r="46" fill="none"
                  stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 46}`}
                  strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
                  style={{ transition: "stroke-dashoffset 250ms linear" }}
                />
              </svg>
            )}

            <div className="text-center px-6 relative">
              {doneToday ? (
                <>
                  <Check className="w-14 h-14 mx-auto mb-2" strokeWidth={3} />
                  <div className="font-semibold lowercase tracking-wide">done today</div>
                </>
              ) : running ? (
                <>
                  <div className="display text-5xl font-bold tabular-nums leading-none mb-2">
                    {formatTimer(remainingSec)}
                  </div>
                  <div className="text-sm opacity-90 lowercase">stay with it</div>
                </>
              ) : durationMin ? (
                <>
                  <Timer className="w-10 h-10 mx-auto mb-1" strokeWidth={2.5} />
                  <div className="display text-2xl font-bold lowercase leading-tight">
                    start {durationMin} min
                  </div>
                  <div className="text-sm opacity-90 mt-1 lowercase">
                    tap — auto-marks done
                  </div>
                </>
              ) : (
                <>
                  <div className="display text-3xl font-bold lowercase leading-tight mb-1">did you<br/>do it?</div>
                  <div className="text-sm opacity-90 mt-2">tap to mark done</div>
                </>
              )}
            </div>
          </button>

          {running && (
            <button
              onClick={cancelTimer}
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" /> cancel timer
            </button>
          )}
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft animate-fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">this week</p>
          <WeekStrip done={logs} />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10 lowercase">
          one habit. one tap. every day.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
