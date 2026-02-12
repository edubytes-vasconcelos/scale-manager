import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { auditAuthAccessEvent } from "@/lib/auth-access-audit";

/* =========================================================
   Types
========================================================= */

export type MinistryAssignment = {
  ministryId: string;
  isLeader: boolean;
};

export type VolunteerProfile = {
  id: string;
  authUserId: string;
  organizationId: string | null;
  accessLevel: string | null;
  canManagePreachingSchedule?: boolean;
  name: string;
  email: string | null;
  ministry_assignments: MinistryAssignment[];
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  volunteer: VolunteerProfile | null;
  loading: boolean;
  authReady: boolean;
  syncingProfile: boolean;
  signOut: () => Promise<void>;
  refreshVolunteerProfile: () => Promise<void>;
};

/* =========================================================
   Context
========================================================= */

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  volunteer: null,
  loading: true,
  authReady: false,
  syncingProfile: false,
  signOut: async () => {},
  refreshVolunteerProfile: async () => {},
});

/* =========================================================
   Provider
========================================================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [volunteer, setVolunteer] = useState<VolunteerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const lastLoggedInSession = useRef<string | null>(null);

  const { toast } = useToast();

  /* ---------------------------------------------------------
     Fetch Volunteer Profile
  --------------------------------------------------------- */
  const fetchVolunteerProfile = useCallback(
    async (authUserId: string): Promise<VolunteerProfile | null> => {
      const { data, error } = await supabase
        .from("volunteers")
        .select(`
          id,
          auth_user_id,
          organization_id,
          access_level,
          name,
          email,
          ministry_assignments,
          can_manage_preaching_schedule
        `)
        .eq("auth_user_id", authUserId)
        .order("organization_id", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching volunteer profile:", error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        authUserId: data.auth_user_id,
        organizationId: data.organization_id,
        accessLevel: data.access_level,
        canManagePreachingSchedule: data.can_manage_preaching_schedule ?? false,
        name: data.name,
        email: data.email,
        ministry_assignments: data.ministry_assignments ?? [],
      };
    },
    []
  );

  /* ---------------------------------------------------------
     Claim profile (RPC)
  --------------------------------------------------------- */
  const claimProfile = useCallback(async () => {
    try {
      await supabase.rpc("claim_profile");
    } catch (error) {
      console.error("❌ Error claiming profile:", error);
    }
  }, []);

  /* ---------------------------------------------------------
     Load user + volunteer data
  --------------------------------------------------------- */
  const loadUserData = useCallback(
    async (
      currentSession: Session | null,
      isInitial = false,
      authEvent?: string
    ) => {
      const shouldBlockUi = isInitial || !initialLoadDone;
      if (shouldBlockUi) {
        setLoading(true);
        setAuthReady(false);
      } else {
        setSyncingProfile(true);
      }

      if (!currentSession?.user) {
        setSession(null);
        setUser(null);
        setVolunteer(null);
        if (isInitial) setInitialLoadDone(true);
        if (shouldBlockUi) {
          setLoading(false);
          setAuthReady(true);
        } else {
          setSyncingProfile(false);
        }
        return;
      }

      setSession(currentSession);
      setUser(currentSession.user);

      // Vincula auth_user_id ao volunteer (caso ainda não esteja)
      await claimProfile();

      const profile = await fetchVolunteerProfile(
        currentSession.user.id
      );

      setVolunteer(profile);
      if (
        authEvent === "SIGNED_IN" &&
        profile?.organizationId &&
        lastLoggedInSession.current !== currentSession.access_token
      ) {
        lastLoggedInSession.current = currentSession.access_token;
        await auditAuthAccessEvent({
          organizationId: profile.organizationId,
          actorAuthUserId: currentSession.user.id,
          actorVolunteerId: profile.id,
          event: "login",
          metadata: {
            source: "auth_state_change",
          },
        });
      }

      if (isInitial) setInitialLoadDone(true);
      if (shouldBlockUi) {
        setLoading(false);
        setAuthReady(true);
      } else {
        setSyncingProfile(false);
      }
    },
    [claimProfile, fetchVolunteerProfile, initialLoadDone]
  );

  /* ---------------------------------------------------------
     Init + Auth listener
  --------------------------------------------------------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session, true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (initialLoadDone) {
        loadUserData(session, false, event);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData, initialLoadDone]);

  /* ---------------------------------------------------------
     Sign out
  --------------------------------------------------------- */
  const signOut = async () => {
    const currentVolunteer = volunteer;
    const currentUser = user;
    if (currentVolunteer?.organizationId && currentUser?.id) {
      await auditAuthAccessEvent({
        organizationId: currentVolunteer.organizationId,
        actorAuthUserId: currentUser.id,
        actorVolunteerId: currentVolunteer.id,
        event: "logout",
        metadata: {
          source: "manual_signout",
        },
      });
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSession(null);
    setUser(null);
    setVolunteer(null);
    lastLoggedInSession.current = null;
  };

  /* ---------------------------------------------------------
     Manual refresh (useful after updates)
  --------------------------------------------------------- */
  const refreshVolunteerProfile = async () => {
    if (!user) return;

    await claimProfile();
    const profile = await fetchVolunteerProfile(user.id);
    setVolunteer(profile);
  };

  /* ---------------------------------------------------------
     Provider
  --------------------------------------------------------- */
  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        volunteer,
        loading,
        authReady,
        syncingProfile,
        signOut,
        refreshVolunteerProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   Hook
========================================================= */

export const useAuth = () => useContext(AuthContext);
