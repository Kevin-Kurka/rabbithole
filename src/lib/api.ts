import type { SentientNode, SentientEdge } from './types';

const API_URL = import.meta.env.VITE_SENTIENT_API_URL || 'http://localhost:8005';

function getToken(): string {
  return localStorage.getItem('sentient_token') || '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `Request failed (${res.status})` }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ---- Auth ----

export async function register(email: string, password: string): Promise<{ user_id: string; tenant_id: string }> {
  const data = await request<any>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data;
}

export async function login(email: string, password: string): Promise<string> {
  const data = await request<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('sentient_token', data.access_token);
  return data.access_token;
}

export function logout(): void {
  localStorage.removeItem('sentient_token');
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('sentient_token');
}

// ---- Nodes ----

export async function createNode<T>(type: string, properties: T, tenantId?: string): Promise<SentientNode<T>> {
  return request('/admin/nodes', {
    method: 'POST',
    body: JSON.stringify({
      type,
      properties,
      tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
    }),
  });
}

export async function getNode<T>(id: string): Promise<SentientNode<T>> {
  return request(`/admin/nodes/${id}`);
}

export async function listNodes<T>(type?: string, limit = 50): Promise<SentientNode<T>[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  params.set('limit', String(limit));
  return request(`/admin/nodes?${params}`);
}

export async function deleteNode(id: string): Promise<void> {
  await request(`/admin/nodes/${id}`, { method: 'DELETE' });
}

// ---- Edges ----

export async function createEdge(
  sourceId: string,
  targetId: string,
  edgeType: string,
  properties: Record<string, unknown> = {},
  tenantId?: string
): Promise<SentientEdge> {
  return request('/admin/edges', {
    method: 'POST',
    body: JSON.stringify({
      source_node_id: sourceId,
      target_node_id: targetId,
      edge_type: edgeType,
      properties,
      tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
    }),
  });
}

export async function listEdges(type?: string, limit = 50): Promise<SentientEdge[]> {
  return request(`/admin/edges`);
}

export async function deleteEdge(id: string): Promise<void> {
  await request(`/admin/edges/${id}`, { method: 'DELETE' });
}

// ---- Search ----

export async function semanticSearch(query: string, limit = 10): Promise<SentientNode[]> {
  return request('/search', {
    method: 'POST',
    body: JSON.stringify({ query_text: query, limit }),
  });
}

// ---- Graph Traversal ----

export async function traverse(rootId: string, maxDepth = 5): Promise<any[]> {
  return request(`/nodes/${rootId}/traverse?max_depth=${maxDepth}`);
}

// ---- AI Chat ----

export async function chatWithAI(messages: { role: string; content: string }[]): Promise<any> {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });
}
