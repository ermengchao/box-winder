import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:12000/graphql";

export async function POST(request: Request) {
  const body = await request.text();
  const authorization = request.headers.get("Authorization");

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        ...(authorization ? { Authorization: authorization } : {}),
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });
    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        errors: [
          {
            message:
              "Cannot reach GraphQL backend. Start box-winder-api on port 12000 or set GRAPHQL_ENDPOINT.",
          },
        ],
      },
      { status: 502 },
    );
  }
}
