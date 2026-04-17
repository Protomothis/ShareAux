import { defineConfig } from "orval";

export default defineConfig({
  shareaux: {
    input: {
      target: "./swagger.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/api",
      schemas: "./src/api/model",
      client: "react-query",
      httpClient: "fetch",
      prettier: true,
      override: {
        mutator: {
          path: "./src/lib/api-client.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
