import { NextResponse } from "next/server";
import { getPlayerData } from "@/lib/player-data";

export const dynamic = "force-dynamic";

/**
 * Read-only playerdata voor een scherm. Publiek toegankelijk via een
 * moeilijk te raden slug; geeft uitsluitend weergavedata terug.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ screenSlug: string }> }
) {
  const { screenSlug } = await params;
  const data = await getPlayerData(screenSlug);

  if (!data) {
    return NextResponse.json(
      { error: "Scherm niet gevonden of inactief" },
      { status: 404 }
    );
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
