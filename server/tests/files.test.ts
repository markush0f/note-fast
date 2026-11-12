import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { fileRoutes, validFile } from '../src/files';

describe('attachment validation and quota', () => {
  it('accepts only supported signatures, not HTML or SVG disguised as images', () => {
    expect(validFile('image/png', new Uint8Array([137,80,78,71,13,10,26,10]))).toBe(true);
    expect(validFile('image/jpeg', new Uint8Array([255,216,255]))).toBe(true);
    expect(validFile('image/gif', new TextEncoder().encode('GIF89a'))).toBe(true);
    expect(validFile('application/pdf', new TextEncoder().encode('%PDF-1.7'))).toBe(true);
    expect(validFile('image/png', new TextEncoder().encode('<svg onload="bad()"/>'))).toBe(false);
    expect(validFile('image/svg+xml', new TextEncoder().encode('<svg/>'))).toBe(false);
  });
  it('rolls back an over-quota upload and releases the transaction', async () => {
    const client = {
      query: vi.fn(async (sql: string) => ({ rows: sql.includes('AS bytes') ? [{ bytes: String(100 * 1024 * 1024) }] : [] })),
      release: vi.fn(),
    };
    const database = { query: vi.fn(), connect: vi.fn(async () => client) };
    const app = new Hono<{ Bindings: { clientIp?: string } }>();
    fileRoutes(app, database as unknown as import('pg').Pool, async () => ({ id: 'owner' }));
    const response = await app.request(`/api/files/${crypto.randomUUID()}`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: '%PDF-1.7' });
    expect(response.status).toBe(413);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO'))).toBe(false);
    expect(client.release).toHaveBeenCalledOnce();
  });
  it('rejects files over 10 MiB before writing to the database', async () => {
    const database = { query: vi.fn(), connect: vi.fn() };
    const app = new Hono<{ Bindings: { clientIp?: string } }>();
    fileRoutes(app, database as unknown as import('pg').Pool, async () => ({ id: 'owner' }));
    const response = await app.request(`/api/files/${crypto.randomUUID()}`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: new Uint8Array(10 * 1024 * 1024 + 1) });
    expect(response.status).toBe(413);
    expect(database.connect).not.toHaveBeenCalled();
  });
});
