import { PrizeGallery } from "@/components/PrizeGallery";

export default async function PrizesPage({ searchParams }: { searchParams: Promise<{ bundle?: string }> }) {
  const params = await searchParams;
  return <PrizeGallery focusBundle={params.bundle} />;
}
