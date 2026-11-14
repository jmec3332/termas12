import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAdmin } from "@/lib/store";

export function LogoutButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      onClick={() => {
        logoutAdmin();
        navigate({ to: "/" });
      }}
    >
      <LogOut /> Cerrar sesión
    </Button>
  );
}
