import type { AppDefinition } from "@/types";

export const APP_REGISTRY: AppDefinition[] = [
  {
    name: "Recipes",
    description: "Keep favorite meals, ingredients, and cooking steps all in one place.",
    href: "/recipes",
    badge: "Ready",
  },
  {
    name: "Receipts",
    description: "Capture receipts, review items, and keep recent spending easy to scan.",
    href: "/receipts",
    badge: "Ready",
  },
];
