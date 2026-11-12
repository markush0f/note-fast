export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const errors: Record<string, string> = {
  unauthorized: 'Inicia sesión para usar el asistente.',
  account_changed: 'La cuenta ha cambiado. Vuelve a abrir la aplicación.',
  ollama_unavailable: 'No se puede conectar con Ollama. Comprueba que está iniciado y revisa OLLAMA_BASE_URL en el backend.',
  ollama_model_missing: 'El modelo no está instalado. Descárgalo con ollama pull y actualiza la lista.',
  ollama_busy: 'Ollama está ocupado. Espera unos instantes y vuelve a intentarlo.',
  ollama_timeout: 'Ollama ha tardado demasiado. Prueba con un modelo más pequeño o reinténtalo cuando termine de cargar.',
  ollama_invalid_response: 'El modelo no ha devuelto una respuesta de texto válida. Prueba con otro modelo.',
  invalid_chat: 'La conversación es demasiado larga o no es válida. Inicia una conversación nueva.',
  request_too_large: 'La conversación es demasiado larga. Inicia una conversación nueva.',
};

async function request(path: string, userId: string, signal: AbortSignal, body?: unknown) {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET', credentials: 'include', signal,
    headers: { 'X-Notebook-User': userId, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(errors[data.error] ?? 'No se pudo comunicar con el servidor. Vuelve a intentarlo.');
  }
  return response.json();
}

export async function listModels(userId: string, signal: AbortSignal): Promise<string[]> {
  const data = await request('/api/ai/models', userId, signal);
  if (!Array.isArray(data.models) || !data.models.every((model: unknown) => typeof model === 'string')) throw new Error('Lista de modelos no válida.');
  return data.models;
}

export async function sendChat(userId: string, model: string, messages: ChatMessage[], signal: AbortSignal): Promise<ChatMessage> {
  const data = await request('/api/ai/chat', userId, signal, { model, messages });
  if (data.message?.role !== 'assistant' || typeof data.message.content !== 'string' || !data.message.content.trim()) throw new Error('Ollama no ha devuelto una respuesta válida.');
  return { role: 'assistant', content: data.message.content };
}
