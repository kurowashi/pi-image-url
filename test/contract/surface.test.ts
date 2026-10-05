/**
 * Contract: the model-facing surface stays exactly what the ADR decided.
 *
 * The extension registers one tool with one parameter. Every token of that
 * surface is paid for on every request, so it is pinned here.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { loadImageUrlExtension, loadImageUrlTools } from "../helpers/extension.ts";

/** The whole model-facing surface. Adding a tool is a decision that updates this list. */
const EXPECTED_TOOLS = ["read_image_url"];

/** A tool description must earn its place in every request. */
const MAX_DESCRIPTION_CHARS = 160;

/** The exact top-level parameter names; a rename is a model-facing surface change. */
const EXPECTED_PARAMETERS: Record<string, string[]> = { read_image_url: ["url"] };

/** The subset of JSON Schema this contract reads from a TypeBox schema. */
interface SchemaShape {
	type?: string;
	properties?: Record<string, unknown>;
	additionalProperties?: unknown;
}

function schemaOf(tool: ToolDefinition): SchemaShape {
	return tool.parameters as SchemaShape;
}

test("the extension registers exactly one tool", async () => {
	const tools = await loadImageUrlTools();
	assert.deepEqual([...tools.keys()].sort(), EXPECTED_TOOLS);
});

test("the extension registers no commands", async () => {
	const extension = await loadImageUrlExtension();
	assert.deepEqual([...extension.commands.keys()], []);
});

test("the extension registers no event handlers", async () => {
	const extension = await loadImageUrlExtension();
	assert.deepEqual([...extension.handlers.keys()], []);
});

test("the tool has a label, description, and object schema", async () => {
	const [tool] = [...(await loadImageUrlTools()).values()];
	assert.ok(tool, "the tool must be registered");
	assert.ok(tool.label.length > 0, "read_image_url needs a label");
	assert.ok(tool.description.length > 0, "read_image_url needs a description");
	assert.equal(schemaOf(tool).type, "object", "read_image_url parameters must be an object schema");
});

test("the description stays within the cap", async () => {
	const [tool] = [...(await loadImageUrlTools()).values()];
	assert.ok(tool, "the tool must be registered");
	assert.ok(
		tool.description.length <= MAX_DESCRIPTION_CHARS,
		`read_image_url description is ${tool.description.length} chars, cap is ${MAX_DESCRIPTION_CHARS}`,
	);
});

test("the schema is closed and exposes exactly the decided parameter", async () => {
	const [tool] = [...(await loadImageUrlTools()).values()];
	assert.ok(tool, "the tool must be registered");
	const schema = schemaOf(tool);
	assert.equal(schema.additionalProperties, false, "read_image_url must reject unknown parameters");
	assert.deepEqual(Object.keys(schema.properties ?? {}), EXPECTED_PARAMETERS["read_image_url"]);
	const url = schema.properties?.["url"] as { type?: string } | undefined;
	assert.equal(url?.type, "string", "url must be declared as a string");
});
