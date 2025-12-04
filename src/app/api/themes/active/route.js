import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const whereClause = projectId ? { isActive: true, projectId } : { isActive: true };

    const activeTheme = await prisma.theme.findFirst({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    const theme = activeTheme || {
      primary: "#1e3a8a",
      secondary: "#ffffff",
      tertiary: "#64748b",
      quaternary: "#f1f5f9",
      mapboxStyle: "mapbox://styles/mapbox/dark-v11",
    };

    return new NextResponse(JSON.stringify(theme), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching active theme:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch active theme",
      },
      { status: 500 }
    );
  }
}
