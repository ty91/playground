export async function writeStreamToStdout(textStream: AsyncIterable<string>): Promise<string> {
  let responseText = '';
  for await (const text of textStream) {
    responseText += text;
    process.stdout.write(text);
  }
  process.stdout.write('\n');
  return responseText;
}
