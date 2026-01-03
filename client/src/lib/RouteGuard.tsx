import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useVolunteerProfile } from "@/hooks/use-data";
import { routePermissions, Role } from "@/lib/route-guards";

type Props = {
  children: ReactNode;
};

export function RouteGuard({ children }: Props) {
  const { data: profile, isLoading } = useVolunteerProfile();
  const [location, setLocation] = useLocation();

  // Enquanto carrega o perfil, não bloqueia
  if (isLoading || !profile) {
    return null;
  }

  const role = profile.accessLevel as Role;

  const allowedRoles = routePermissions[location];

  // Se a rota não está mapeada, deixa passar
  if (!allowedRoles) {
    return <>{children}</>;
  }

  // Se o papel não é permitido, redireciona
  if (!allowedRoles.includes(role)) {
    setLocation("/");
    return null;
  }

  return <>{children}</>;
}
