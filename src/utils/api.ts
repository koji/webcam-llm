export async function sendChatCompletionRequest(
  baseURL: string,
  instruction: string,
  imageBase64URL: string
): Promise<string> {
  try {
    // const response = await fetch(`${baseURL}/v1/chat/completions`, {
    const response = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: instruction },
              { type: 'image_url', image_url: { url: imageBase64URL } },
            ],
          },
        ],
      }),
    })
    if (!response.ok) {
      const errorData = await response.text()
      return `Server error: ${response.status} - ${errorData}`
    }
    const data = await response.json()
    if (
      data &&
      Array.isArray(data.choices) &&
      data.choices[0]?.message?.content
    ) {
      return data.choices[0].message.content as string
    }
    return 'Invalid response from server.'
  } catch (error) {
    if (error instanceof Error) {
      return `Error: ${error.message}`
    }
    return 'An unknown error occurred.'
  }
}
