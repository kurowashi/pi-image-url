/**
 * A tiny HTTP server for tests: a route table in, a base URL out. Nothing is
 * mocked, so both unit and integration tests exercise the real fetch path.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface TestRoute {
	status: number;
	headers: Record<string, string>;
	body?: Buffer;
	/** Leaves the response open so a test can abort or time out. */
	holdOpen?: boolean;
}

export interface TestServer {
	/** Base URL ending in the assigned port, for example `http://127.0.0.1:43121`. */
	origin: string;
	stop(): Promise<void>;
}

const NOT_FOUND: TestRoute = {
	status: 404,
	headers: { "content-type": "text/plain" },
	body: Buffer.from("unknown route"),
};

export async function startTestServer(routes: Record<string, TestRoute>): Promise<TestServer> {
	const handle = (request: IncomingMessage, response: ServerResponse): void => {
		const route = routes[request.url ?? "/"] ?? NOT_FOUND;
		response.writeHead(route.status, route.headers);
		// Flush headers so a held-open response still resolves fetch().
		response.flushHeaders();
		if (route.body !== undefined) response.write(route.body);
		if (route.holdOpen === true) return;
		response.end();
	};
	const server: Server = createServer(handle);
	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address() as AddressInfo;
	return {
		origin: `http://127.0.0.1:${address.port}`,
		async stop() {
			server.closeAllConnections();
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		},
	};
}
