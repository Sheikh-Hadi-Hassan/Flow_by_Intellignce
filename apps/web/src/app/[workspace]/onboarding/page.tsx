import { redirect } from "next/navigation";

export default async function OnboardingIndexPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  redirect(`/${workspace}/onboarding/business`);
}
