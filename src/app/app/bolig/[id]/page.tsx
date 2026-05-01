import { redirect } from "next/navigation";

/**
 * Default redirect — visiting /app/bolig/[id] without a tab segment
 * sends the user to the Oversikt tab (spec: "Default redirect to
 * Oversikt").
 */
export default function PropertyDetailIndex({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/app/bolig/${params.id}/oversikt`);
}
