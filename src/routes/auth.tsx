import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Galaxy Service Portal" },
      {
        name: "description",
        content: "Staff sign in for the Galaxy Online Power Systems service management portal.",
      },
      { property: "og:title", content: "Sign in · Galaxy Service Portal" },
      {
        property: "og:description",
        content: "Staff sign in for the Galaxy Online Power Systems service management portal.",
      },
    ],
  }),
  component: AuthScreen,
});