import {
  GraphQLError,
  GraphQLErrorExtensions,
  GraphQLFormattedError,
} from 'graphql';

export function formatError(error: GraphQLError): GraphQLFormattedError {
  let extensions: GraphQLErrorExtensions | undefined = error.extensions;
  const originalError: (Error & {code?: string}) | undefined =
    error.originalError;

  if (originalError && originalError.code) {
    extensions = extensions ?? {};
    extensions['code'] = originalError.code;
  }

  return {
    message: error.message,
    locations: error.locations,
    path: error.path,
    extensions,
  };
}
