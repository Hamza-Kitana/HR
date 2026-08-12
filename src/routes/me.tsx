import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/me")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/me-profile", replace: true });
  },
});
