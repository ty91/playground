export function toSingleLineMessage(error: unknown, fallback = 'Unknown error'): string {
  let message = fallback;

  if (error instanceof Error && error.message) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  const singleLine = message.replace(/[\r\n]+/g, ' ').trim();
  return singleLine.length > 0 ? singleLine : fallback;
}
