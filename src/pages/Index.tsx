import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Onboarding from "@/components/Onboarding";
import BottomNav from "@/components/BottomNav";
import WeekStrip from "@/components/WeekStrip";
import { computeStreak, today } from "@/lib/dates";
import { parseDurationMinutes, formatTimer } from "@/lib/duration";
import { Check, Flame, Timer, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type Habit = { id: string; name: string; detail: string | null; emoji: string | null };

function isMilestone(n: number) {
  return n === 7 || n === 30 || (n >= 100 && n % 100 === 0);
}

// Same hue family as the heatmap (red→orange→amber→lime→green),
// but darkened so white text stays readable on the large button.
const RATING_COLORS: Record<number, string> = {
  1: "#dc2626", // red-600   (heatmap: bg-red-300)
  2: "#ea580c", // orange-600 (heatmap: bg-orange-300)
  3: "#d97706", // amber-600  (heatmap: bg-yellow-300)
  4: "#65a30d", // lime-600   (heatmap: bg-lime-400)
  5: "#16a34a", // green-600  (heatmap: bg-green-500)
};

function doneBgStyle(rating: number | null): React.CSSProperties {
  if (!rating) return {};
  return { backgroundColor: RATING_COLORS[rating], transition: "background-color 600ms ease" };
}

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [pop, setPop] = useState(false);
  const [todayRating, setTodayRating] = useState<number | null>(null);
  const [pendingUndo, setPendingUndo] = useState(false);
  const undoTimerRef = useRef<number | null>(null);

  // timer state
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  // Clear undo timer on unmount
  useEffect(() => {
    return () => { if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current); };
  }, []);

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
        .select("log_date,rating")
        .eq("habit_id", h.id);
      setLogs(new Set((l ?? []).map((r) => r.log_date as string)));
      const tl = (l ?? []).find(r => r.log_date === today());
      setTodayRating(tl ? (tl as any).rating ?? null : null);
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

  // Streak-scaled celebration: milestone days get a bigger multi-burst
  const celebrate = useCallback((newStreak: number) => {
    const milestone = isMilestone(newStreak);

    if (milestone) {
      if ("vibrate" in navigator) navigator.vibrate?.([80, 40, 80, 40, 200, 40, 80, 40, 80]);
      const burst = (x: number, angle: number, count: number) =>
        confetti({
          particleCount: count,
          spread: 90,
          angle,
          origin: { x, y: 0.5 },
          colors: ["#f26419", "#22c55e", "#facc15", "#60a5fa", "#f472b6"],
          scalar: 1.3,
          zIndex: 9999,
        });
      burst(0.3, 130, 120);
      burst(0.7, 50, 120);
      setTimeout(() => { burst(0.5, 90, 100); }, 200);
      setTimeout(() => { burst(0.2, 150, 80); burst(0.8, 30, 80); }, 450);
      setTimeout(() => { burst(0.5, 90, 60); }, 700);
    } else {
      if ("vibrate" in navigator) navigator.vibrate?.([60, 30, 120, 30, 60]);
      const burst = (x: number, angle: number) =>
        confetti({
          particleCount: 80,
          spread: 70,
          angle,
          origin: { x, y: 0.6 },
          colors: ["#f26419", "#22c55e", "#facc15", "#60a5fa", "#f472b6"],
          scalar: 1.1,
          zIndex: 9999,
        });
      burst(0.4, 120);
      burst(0.6, 60);
      setTimeout(() => { burst(0.5, 90); }, 150);
    }
  }, []);

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
    const nextLogs = new Set(logs);
    nextLogs.add(todayISO);
    const newStreak = computeStreak([...nextLogs]);
    setLogs(nextLogs);
    celebrate(newStreak);
    if (silent) toast.success("Time's up. Habit done.");
  }, [habit, user, logs, todayISO, celebrate]);

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

  const saveRating = useCallback(async (val: number) => {
    if (!habit || !user) return;
    setTodayRating(val);
    await supabase.from("habit_logs")
      .update({ rating: val } as any)
      .eq("habit_id", habit.id)
      .eq("log_date", todayISO);
  }, [habit, user, todayISO]);

  const handleBigButton = async () => {
    if (!habit || !user) return;

    if (doneToday) {
      if (pendingUndo) {
        // Second tap within window — actually undo
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        setPendingUndo(false);
        await supabase.from("habit_logs").delete()
          .eq("habit_id", habit.id).eq("log_date", todayISO);
        const next = new Set(logs); next.delete(todayISO); setLogs(next);
        setTodayRating(null);
      } else {
        // First tap — open 3-second undo window
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        setPendingUndo(true);
        undoTimerRef.current = window.setTimeout(() => setPendingUndo(false), 3000);
      }
      return;
    }

    setPop(true); setTimeout(() => setPop(false), 500);

    if (durationMin && timerEndsAt === null) {
      startTimer();
      return;
    }
    if (timerEndsAt !== null) return; // ignore taps while timer running

    const { error } = await supabase.from("habit_logs").insert({
      user_id: user.id, habit_id: habit.id, log_date: todayISO,
    });
    if (error) return toast.error(error.message);
    const next = new Set(logs); next.add(todayISO);
    const newStreak = computeStreak([...next]);
    setLogs(next);
    celebrate(newStreak);
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

  // Button background: mood-tinted when done+rated, dimmed when pending undo
  const buttonBgClass = doneToday
    ? pendingUndo
      ? "text-white shadow-soft"
      : `${todayRating ? "" : "bg-done"} text-white shadow-soft`
    : "bg-ember text-accent-foreground shadow-glow";

  const buttonStyle: React.CSSProperties = doneToday && !pendingUndo && todayRating
    ? doneBgStyle(todayRating)
    : doneToday && pendingUndo
      ? { backgroundColor: "hsl(145deg 30% 55%)", transition: "background-color 200ms ease" }
      : {};

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
            style={buttonStyle}
            className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all overflow-hidden ${buttonBgClass} ${pop ? "animate-pop" : ""} ${running ? "cursor-default" : ""}`}
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
                pendingUndo ? (
                  <>
                    <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-80" strokeWidth={2} />
                    <div className="font-semibold lowercase tracking-wide text-sm opacity-90">tap again to undo</div>
                  </>
                ) : (
                  <>
                    <Check className="w-14 h-14 mx-auto mb-2" strokeWidth={3} />
                    <div className="font-semibold lowercase tracking-wide">done today</div>
                  </>
                )
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

          {doneToday && !pendingUndo && (
            <div className="mt-6 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">how did it feel?</p>
              <div className="flex justify-center gap-4">
                {([["😢",1],["😕",2],["😐",3],["🙂",4],["😊",5]] as [string,number][]).map(([emoji, val]) => (
                  <button
                    key={val}
                    onClick={() => saveRating(val)}
                    className={`text-3xl transition-all duration-150 ${todayRating === val ? "scale-125" : "opacity-40 hover:opacity-100 hover:scale-110"}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
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
