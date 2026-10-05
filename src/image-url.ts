/**
 * Downloading and validating one image URL.
 *
 * This module is transport only: the extension hands the resulting base64
 * block to Pi, which normalizes and resizes tool-result images like any other
 * tool. Nothing here touches the filesystem.
 */

import { Buffer } from "node:buffer";

/**
 * Inline image types Pi forwards without conversion. `image/jpg` is accepted
 * as an alias and normalized to `image/jpeg`.
 */
const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

/** Hard cap so one wrong URL cannot pull unbounded bytes into memory. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPE_SET: ReadonlySet<string> = new Set(SUPPORTED_IMAGE_TYPES);
const MIB = 1024 * 1024;

export interface DownloadedImage {
	/** Base64-encoded bytes, ready for `ImageContent.data`. */
	data: string;
	mimeType: string;
}

function oversizeError(bytes: number): Error {
	const size = (bytes / MIB).toFixed(1);
	return new Error(`Image is over the ${MAX_IMAGE_BYTES / MIB} MiB limit (received ${size} MiB).`);
}

function toHttpUrl(raw: string): URL {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error("Invalid image URL. Pass an absolute http or https URL.");
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		const scheme = url.protocol.replace(":", "");
		throw new Error(
			`Unsupported URL scheme "${scheme}". read_image_url accepts http and https; use read for local files.`,
		);
	}
	return url;
}

function toImageMimeType(contentType: string | null): string {
	const base = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
	const normalized = base === "image/jpg" ? "image/jpeg" : base;
	if (SUPPORTED_IMAGE_TYPE_SET.has(normalized)) return normalized;
	const shown = base === "" ? "missing" : `"${base}"`;
	throw new Error(`Unsupported image type ${shown}. Supported: ${SUPPORTED_IMAGE_TYPES.join(", ")}.`);
}

/**
 * Read the body while counting bytes, so a chunked or compressed response is
 * rejected mid-stream instead of after it has been fully buffered.
 */
async function readBody(body: ReadableStream<Uint8Array> | null): Promise<Buffer> {
	if (body === null) throw new Error("Image response has no body.");
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_IMAGE_BYTES) {
				await reader.cancel();
				throw oversizeError(total);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	return Buffer.concat(chunks, total);
}

/** Download one http(s) image URL and return it as inline image data. */
export async function fetchImage(url: string, signal?: AbortSignal): Promise<DownloadedImage> {
	const target = toHttpUrl(url);
	const response = await fetch(target, signal === undefined ? {} : { signal });
	if (!response.ok) {
		await response.body?.cancel();
		throw new Error(`Failed to download image: HTTP ${response.status}.`);
	}
	const mimeType = toImageMimeType(response.headers.get("content-type"));
	const declaredLength = response.headers.get("content-length");
	if (declaredLength !== null) {
		const declared = Number(declaredLength);
		if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
			await response.body?.cancel();
			throw oversizeError(declared);
		}
	}
	const bytes = await readBody(response.body);
	return { data: bytes.toString("base64"), mimeType };
}
