#!/usr/bin/env node

import express from 'express';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const nodeProcess = globalThis.process;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!existsSync(indexPath)) {
	console.error('[localflux] Missing build output at dist/index.html');
	console.error('[localflux] Run "npm run build" in the package before running the CLI.');
	nodeProcess.exit(1);
}

const portArg = nodeProcess.argv.find((arg) => arg.startsWith('--port='));
const parsedPort = portArg ? Number(portArg.split('=')[1]) : Number(nodeProcess.env.PORT);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4173;

const app = express();
app.use(express.static(distDir));

// React Router SPA fallback: serve index.html for non-file routes.
app.get('*', (req, res) => {
	res.sendFile(indexPath);
});

const server = app.listen(port, async () => {
	const url = `http://localhost:${port}`;
	console.log(`[localflux] Serving dist at ${url}`);

	if (!nodeProcess.argv.includes('--no-open')) {
		try {
			await open(url);
		} catch (error) {
			console.warn('[localflux] Could not auto-open browser:', error?.message ?? error);
		}
	}
});

const shutdown = () => {
	server.close(() => {
		nodeProcess.exit(0);
	});
};

nodeProcess.on('SIGINT', shutdown);
nodeProcess.on('SIGTERM', shutdown);
