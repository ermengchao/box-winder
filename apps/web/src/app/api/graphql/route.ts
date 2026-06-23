import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:12000/graphql";
const graphqlEndpoint = parseGraphqlEndpoint(GRAPHQL_ENDPOINT);

export async function POST(request: Request) {
  const body = await request.text();
  const authorization = request.headers.get("Authorization");

  if (!graphqlEndpoint) {
    return NextResponse.json(
      {
        errors: [
          {
            message:
              "GRAPHQL_ENDPOINT must be a valid http(s) URL, for example https://api.example.com/graphql.",
          },
        ],
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(graphqlEndpoint, {
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

function parseGraphqlEndpoint(value: string): string | null {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
