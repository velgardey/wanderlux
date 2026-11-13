// A minimal Responses API envelope, shared by provider and HTTP boundary tests.
export function providerResponse(text: string, status = 'completed') {
  return new Response(
    JSON.stringify({
      id: 'response-test',
      object: 'response',
      status,
      output: [
        {
          id: 'message-test',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text, annotations: [] }],
        },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
