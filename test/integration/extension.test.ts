/**
 * Integration: the shipped registration and the tool it exposes, driven
 * against a real local HTTP server. No model and no network.
 */

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AgentToolResult, ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { loadImageUrlTools } from "../helpers/extension.ts";
import { startTestServer, type TestRoute, type TestServer } from "../helpers/server.ts";

const PNG_BYTES = Buffer.from("integration-test-image-bytes");

const ROUTES: Record<string, TestRoute> = {
	"/png": { status: 200, headers: { "content-type": "image/png" }, body: PNG_BYTES },
	"/html": { status: 200, headers: { "content-type": "text/html" }, body: Buffer.from("<html>") },
	"/not-found": { status: 404, headers: { "content-type": "text/plain" }, body: Buffer.from("nope") },
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

/** The image arm of a tool result's content, without importing Pi's model types. */
type ContentBlock = AgentToolResult<unknown>["content"][number];
type ImageBlock = Extract<ContentBlock, { type: "image" }>;

/** Call the registered tool as Pi would; the context is unused by this tool. */
async function callTool(url: string): Promise<AgentToolResult<unknown>> {
	const tool = (await loadImageUrlTools()).get("read_image_url");
	assert.ok(tool, "the extension must register read_image_url");
	return tool.execute("call-1", { url }, undefined, undefined, {} as unknown as ExtensionToolContext);
}

function imageBlocks(result: AgentToolResult<unknown>): ImageBlock[] {
	const images = result.content.filter((block): block is ImageBlock => block.type === "image");
	assert.equal(images.length, result.content.length, "the result must contain only the image");
	return images;
}

test("returns the downloaded image as an image block", async () => {
	const result = await callTool(`${origin}/png`);
	assert.equal(result.details, undefined, "the tool returns no structured details");
	const block = imageBlocks(result)[0];
	assert.ok(block, "the result must contain one image");
	assert.equal(block.mimeType, "image/png");
	assert.equal(Buffer.from(block.data, "base64").toString(), PNG_BYTES.toString());
});

test("propagates download failures as errors", async () => {
	await assert.rejects(callTool(`${origin}/html`), /Unsupported image type/);
	await assert.rejects(callTool(`${origin}/not-found`), /HTTP 404/);
	await assert.rejects(callTool("file:///tmp/image.png"), /Unsupported URL scheme/);
});
