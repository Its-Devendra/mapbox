import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    // Use the env var, default to localhost for dev if missing
    const apiUrl =
      process.env.NEXT_PUBLIC_CHAT_API_URL ||
      "https://api.agent.convrsespaces.com/chat"

    console.log(`Proxying chat request to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        `Backend API error: ${response.status} ${response.statusText}`
      );
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = { message: (await response.text()) || response.statusText };
      }
      return NextResponse.json(errorBody, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
