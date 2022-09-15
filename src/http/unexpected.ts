import {ServerResponse} from 'http';

export function unexpectedErrorHandler(res: ServerResponse, error: unknown) {
  if (error instanceof Error) {
    const statusError = error as {status?: number};
    res.statusCode = statusError.status ?? 500;
    res.end(error.message);
    return;
  }

  res.statusCode = 500;
  res.end('Oops! Code 500. Sorry, we can not process your request.');
}
