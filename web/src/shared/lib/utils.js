/**
 * shared/lib/utils — re-export of the project's `cn` helper.
 * Kept as a feature-agnostic surface so features import from `@/shared/lib/utils`
 * instead of reaching into `@/lib/utils` directly.
 */
export { cn } from "@/lib/utils";
