/**
 * Unit: the fetch, the MIME allowlist, and the size cap, against a real local
 * HTTP server.
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fetchImage, MAX_IMAGE_BYTES } from "../../src/image-url.ts";
import { startTestServer, type TestRoute, type TestServer } from "../helpers/server.ts";

const PNG_BYTES = Buffer.from("unit-test-image-bytes");
const LIMIT_BYTES = Buffer.alloc(MAX_IMAGE_BYTES, 1);
const OVER_LIMIT_BYTES = Buffer.alloc(MAX_IMAGE_BYTES + 1, 1);

const ROUTES: Record<string, TestRoute> = {
	"/png": { status: 200, headers: { "content-type": "image/png" }, body: PNG_BYTES },
	"/jpeg": { status: 200, headers: { "content-type": "image/jpeg; charset=binary" }, body: PNG_BYTES },
	"/jpg": { status: 200, headers: { "content-type": "image/jpg" }, body: PNG_BYTES },
	"/gif": { status: 200, headers: { "content-type": "image/gif" }, body: PNG_BYTES },
	"/webp": { status: 200, headers: { "content-type": "image/webp" }, body: PNG_BYTES },
	"/html": { status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: Buffer.from("<html>") },
	"/no-type": { status: 200, headers: {}, body: PNG_BYTES },
	"/not-found": { status: 404, headers: { "content-type": "text/plain" }, body: Buffer.from("nope") },
	"/redirect": { status: 302, headers: { location: "/png" } },
	"/exactly-limit": { status: 200, headers: { "content-type": "image/png" }, body: LIMIT_BYTES },
	// Declares an oversized body and never sends it: reading the body would hang,
	// so the test proves the check happens on the header.
	"/declared-too-large": {
		status: 200,
		headers: { "content-type": "image/png", "content-length": String(MAX_IMAGE_BYTES + 1) },
		holdOpen: true,
	},
	// Streams without Content-Length, so only the running byte count can stop it.
	"/actually-too-large": {
		status: 200,
		headers: { "content-type": "image/png", "transfer-encoding": "chunked" },
		body: OVER_LIMIT_BYTES,
	},
	// Sends headers (bad content type) and no body: reading the body would hang,
	// so the test proves the type check happens before the body is read.
	"/html-slow": { status: 200, headers: { "content-type": "text/html" }, holdOpen: true },
	"/slow": { status: 200, headers: { "content-type": "image/png" }, holdOpen: true },
	"/slow-body": { status: 200, headers: { "content-type": "image/png" }, body: PNG_BYTES, holdOpen: true },
};

let server: TestServer;
let origin = "";

before(async () => {
	server = await startTestServer(ROUTES);
	origin = server.origin;
});

after(async () => {
	await server.stop();
});

test("returns base64 image data and the mime type", async () => {
	const image = await fetchImage(`${origin}/png`);
	assert.equal(image.mimeType, "image/png");
	assert.equal(Buffer.from(image.data, "base64").toString(), PNG_BYTES.toString());
});

test("accepts each supported image type", async () => {
	const cases = [
		["/png", "image/png"],
		["/jpeg", "image/jpeg"],
		["/gif", "image/gif"],
		["/webp", "image/webp"],
	] as const;
	for (const [path, mimeType] of cases) {
		assert.equal((await fetchImage(`${origin}${path}`)).mimeType, mimeType);
	}
});

test("normalizes the image/jpg alias to image/jpeg", async () => {
	assert.equal((await fetchImage(`${origin}/jpg`)).mimeType, "image/jpeg");
});

test("follows redirects", async () => {
	assert.equal((await fetchImage(`${origin}/redirect`)).mimeType, "image/png");
});

test("accepts a body of exactly the size limit", async () => {
	const image = await fetchImage(`${origin}/exactly-limit`);
	assert.equal(Buffer.from(image.data, "base64").byteLength, MAX_IMAGE_BYTES);
});

test("rejects a non-image content type before reading the body", { timeout: 5000 }, async () => {
	await assert.rejects(fetchImage(`${origin}/html-slow`), /Unsupported image type "text\/html"/);
});

test("rejects a response without a content type", async () => {
	await assert.rejects(fetchImage(`${origin}/no-type`), /Unsupported image type missing/);
});

test("rejects a non-2xx response with the status", async () => {
	await assert.rejects(fetchImage(`${origin}/not-found`), /HTTP 404/);
});

test("rejects a declared size over the limit before reading the body", { timeout: 5000 }, async () => {
	await assert.rejects(fetchImage(`${origin}/declared-too-large`), /over the 20 MiB limit/);
});

test("rejects a streamed body that passes the limit", async () => {
	await assert.rejects(fetchImage(`${origin}/actually-too-large`), /over the 20 MiB limit/);
});

test("rejects malformed URLs and non-http schemes", async () => {
	await assert.rejects(fetchImage("not a url"), /Invalid image URL/);
	await assert.rejects(fetchImage("file:///tmp/image.png"), /Unsupported URL scheme "file"/);
	await assert.rejects(fetchImage("data:image/png;base64,AAAA"), /Unsupported URL scheme "data"/);
});

test("honors the abort signal while waiting for headers", async () => {
	const controller = new AbortController();
	const pending = fetchImage(`${origin}/slow`, controller.signal);
	setTimeout(() => controller.abort(), 10);
	await assert.rejects(pending, (error: unknown) => error instanceof Error && error.name === "AbortError");
});

test("honors the abort signal while streaming the body", async () => {
	const controller = new AbortController();
	const pending = fetchImage(`${origin}/slow-body`, controller.signal);
	setTimeout(() => controller.abort(), 10);
	await assert.rejects(pending, (error: unknown) => error instanceof Error && error.name === "AbortError");
});
