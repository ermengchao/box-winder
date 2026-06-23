export const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      user {
        uuid
        email
        name
        tokenPrefix
      }
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        uuid
        name
        email
        tokenPrefix
      }
    }
  }
`;

type GraphqlError = {
  message?: string;
};

type GraphqlResponse<TData> = {
  data?: TData;
  errors?: GraphqlError[];
};

export async function requestGraphql<TData, TVariables>(
  query: string,
  variables: TVariables,
) {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphqlResponse<TData>;
  const errorMessage = payload.errors?.find((error) => error.message)?.message;

  if (!response.ok || errorMessage) {
    throw new Error(errorMessage ?? "The backend request failed.");
  }

  if (!payload.data) {
    throw new Error("The backend returned an empty response.");
  }

  return payload.data;
}
