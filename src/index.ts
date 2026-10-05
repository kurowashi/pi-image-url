/**
 * pi-image-url — one tool that turns an image URL into a model-visible image.
 *
 * `read_image_url` downloads an http(s) URL, validates the type and size, and
 * returns the bytes as an image content block. Pi normalizes and resizes the
 * block when it enters the transcript, so the tool writes nothing to disk.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { fetchImage } from "./image-url.ts";

export default function imageUrlExtension(pi: ExtensionAPI): void {
	pi.registerTool({
		name: "read_image_url",
		label: "Read image URL",
		description: "Download an image from an http(s) URL and show it to the model.",
		parameters: Type.Object(
			{
				url: Type.String({ description: "Image URL to download (http or https)" }),
			},
			{ additionalProperties: false },
		),
		execute: async (_toolCallId, { url }, signal) => {
			const image = await fetchImage(url, signal);
			return {
				content: [{ type: "image", data: image.data, mimeType: image.mimeType }],
				details: undefined,
			};
		},
	});
}
