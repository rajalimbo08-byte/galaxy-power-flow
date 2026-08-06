import { createFileRoute } from "@tanstack/react-router";

import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Galaxy Service Portal" },
      {
        name: "description",
        content:
          "Sign in to the Galaxy Online Power Systems service management portal for tickets, reports and analytics.",
      },
      { property: "og:title", content: "Sign in · Galaxy Service Portal" },
      {
        property: "og:description",
        content: "Internal service management portal for Galaxy Online Power Systems.",
      },
    ],
  }),
  component: AuthScreen,
});
