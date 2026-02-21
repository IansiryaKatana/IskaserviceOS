import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Calendar, Clock, MapPin, ChevronLeft, LogOut, Edit2, Check } from "lucide-react";
import { RecordsPagination } from "@/components/RecordsPagination";
import { useFeedback } from "@/hooks/use-feedback";
import { usePagination } from "@/hooks/use-pagination";

type Tab = "bookings" | "profile";

const Account = () => {
  const { showSuccess } = useFeedback();
  const { user, loading, signOut } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("bookings");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: "", phone: "" });

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(name), staff(name), locations(name)")
        .eq("user_id", user!.id)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const bookingsPag = usePagination(bookings, 6);

  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string; phone?: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      showSuccess("Profile updated", "Your profile has been updated.");
      setEditingProfile(false);
    },
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background font-body text-sm text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const startEditProfile = () => {
    setProfileForm({
      display_name: profile?.display_name || "",
      phone: profile?.phone || "",
    });
    setEditingProfile(true);
  };

  const formatTime12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const inputCls = "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm";

  return (
    <div className="min-h-screen bg-background font-body">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <a href="/" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </a>
          <h1 className="font-display text-sm font-bold text-foreground sm:text-base">My Account</h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setTab("bookings")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "bookings" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Calendar className="h-3.5 w-3.5" />Bookings
          </button>
          <button onClick={() => setTab("profile")} className={`flex items-center gap-1.5 text-xs font-medium ${tab === "profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <User className="h-3.5 w-3.5" />Profile
          </button>
          <button onClick={() => signOut()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {tab === "bookings" && (
          <div>
            <h2 className="mb-4 font-display text-lg font-bold text-foreground sm:text-xl">My Bookings</h2>
            {loadingBookings ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !bookings?.length ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
                <a href="/" className="mt-2 inline-block text-xs text-primary underline">Book an appointment</a>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b: any) => (
                  <div key={b.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">
                          {b.services?.name || "Service"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(b.booking_date + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime12(b.booking_time)}
                          </span>
                          {b.staff?.name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {b.staff.name}
                            </span>
                          )}
                          {b.locations?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {b.locations.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          b.status === "confirmed" ? "bg-primary/10 text-primary"
                          : b.status === "cancelled" ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-secondary-foreground"
                        }`}>{b.status}</span>
                        {b.total_price && (
                          <span className="text-xs font-bold text-card-foreground">${Number(b.total_price).toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <RecordsPagination page={bookingsPag.page} totalPages={bookingsPag.totalPages} onPageChange={bookingsPag.setPage} />
              </div>
            )}
          </div>
        )}

        {tab === "profile" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground sm:text-xl">My Profile</h2>
              {!editingProfile && (
                <button onClick={startEditProfile} className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform">
                  <Edit2 className="h-3.5 w-3.5" />Edit
                </button>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              {editingProfile ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Display Name</label>
                    <input type="text" value={profileForm.display_name} onChange={(e) => setProfileForm(f => ({ ...f, display_name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Email</label>
                    <input type="email" value={user.email || ""} disabled className={`${inputCls} opacity-50`} />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateProfile.mutate(profileForm)}
                      disabled={updateProfile.isPending}
                      className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground hover:scale-105 transition-transform disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />Save
                    </button>
                    <button onClick={() => setEditingProfile(false)} className="rounded-full border border-border px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Name</p>
                    <p className="text-sm font-semibold text-card-foreground">{profile?.display_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                    <p className="text-sm text-card-foreground">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Phone</p>
                    <p className="text-sm text-card-foreground">{profile?.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Member since</p>
                    <p className="text-sm text-card-foreground">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Account;
