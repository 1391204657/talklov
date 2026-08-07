import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildProfileMetadata,
  fetchPublicProfileForSeo,
  personProfileJsonLd,
} from "@/lib/profileSeo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const seo = await fetchPublicProfileForSeo(id);
  return buildProfileMetadata(seo, id);
}

export default async function ProfileIdLayout({ children, params }: Props) {
  const { id } = await params;
  const seo = await fetchPublicProfileForSeo(id);
  return (
    <>
      {seo ? <JsonLd data={personProfileJsonLd(seo)} /> : null}
      {children}
    </>
  );
}
