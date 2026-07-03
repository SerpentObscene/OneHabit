import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import {
  enablePushNotifications,
  disablePushNotifications,
  isPushEnabled,
  pushSupported,
} from "@/lib/push";

type Habit = { id: string; name: string; emoji: string | null };

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [habit, setHabit] = useState<Habit | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => { if (!user) navigate("/auth"); }, [user, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      setName(p?.display_name ?? "");
      const { data: h } = await supabase.from("habits").select("id,name,emoji")
        .eq("user_id", user.id).eq("archived", false)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setHabit(h ?? null);
      setPushOn(await isPushEnabled());
    })();
  }, [user]);

  const togglePush = async (next: boolean) => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (next) {
        await enablePushNotifications(user.id);
        setPushOn(true);
        toast.success("Reminders on — morning, lunch, evening.");
      } else {
        await disablePushNotifications();
        setPushOn(false);
        toast.success("Reminders off.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't update reminders");
    } finally {
      setPushBusy(false);
    }
  };

  const changeHabit = async () => {
    if (!habit) return;
    if (!confirm("Archive this habit and start a new one?")) return;
    await supabase.from("habits").update({ archived: true }).eq("id", habit.id);
    navigate("/");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-[100dvh] bg-warm safe-top pb-24">
      <div className="max-w-md mx-auto px-6 pt-10 space-y-6">
        <div className="animate-fade-up">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">you</p>
          <h1 className="display text-4xl font-bold lowercase">profile</h1>
        </div>

        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">signed in as</p>
          <p className="font-medium">{name || user?.email}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {habit && (
          <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">your one habit</p>
            <p className="display text-2xl font-bold lowercase">
              {habit.emoji} {habit.name}
            </p>
            <Button
              variant="outline"
              onClick={changeHabit}
              className="mt-4 w-full h-12 rounded-xl"
            >
              Switch habit
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              You can only track one at a time. That's the point.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-3xl p-5 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-4 h-4 text-accent" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">gentle reminder</p>
              </div>
              <p className="font-medium">a gentle support to keep on track</p>
            </div>
            <Switch
              checked={pushOn}
              onCheckedChange={togglePush}
              disabled={pushBusy || !pushSupported()}
            />
          </div>
          {!pushSupported() && (
            <p className="text-xs text-muted-foreground mt-3">
              On iPhone, install the app to your home screen first to enable push.
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={signOut}
          className="w-full h-12 rounded-xl text-muted-foreground"
        >
          Sign out
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
