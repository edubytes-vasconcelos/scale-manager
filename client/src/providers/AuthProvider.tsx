import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

type VolunteerProfile = {
  id: string;
  authUserId: string;
  organizationId: string | null;
  accessLevel: string | null;
  name: string;
  email: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  volunteer: VolunteerProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshVolunteerProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  volunteer: null,
  loading: true,
  signOut: async () => {},
  refreshVolunteerProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchVolunteerProfile = useCallback(async (authUserId: string): Promise<VolunteerProfile | null> => {
    const { data, error } = await supabase
      .from("volunteers")
      .select("id, auth_user_id, organization_id, access_level, name, email")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching volunteer profile:", error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      authUserId: data.auth_user_id,
      organizationId: data.organization_id,
      accessLevel: data.access_level,
      name: data.name,
      email: data.email,
    };
  }, []);

  const claimProfile = useCallback(async () => {
    try {
      await supabase.rpc("claim_profile");
    } catch (error) {
      console.error("Error claiming profile:", error);
    }
  }, []);

  const loadUserData = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      setVolunteer(null);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setUser(currentSession.user);

    await claimProfile();

    const profile = await fetchVolunteerProfile(currentSession.user.id);
    setVolunteer(profile);
    setLoading(false);
  }, [claimProfile, fetchVolunteerProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session);
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSession(null);
      setUser(null);
      setVolunteer(null);
    }
  };

  const refreshVolunteerProfile = async () => {
    if (!user) return;
    
    await claimProfile();
    const profile = await fetchVolunteerProfile(user.id);
    setVolunteer(profile);
  };

  return (
    <AuthContext.Provider value={{ session, user, volunteer, loading, signOut, refreshVolunteerProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
