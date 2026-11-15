import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminLogout } from "@/lib/admin-auth.functions";

export function LogoutButton() {
  const navigate = useNavigate();
  const router = useRouter();
  const logout = useServerFn(adminLogout);
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await logout();
        await router.invalidate();
        navigate({ to: "/", replace: true });
      }}
    >
      <LogOut /> Cerrar sesión
    </Button>
  );
}
