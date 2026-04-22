import {startLocalServer} from './app.mjs';

const argPort = process.argv[2]?.trim();
const port = Number(argPort || process.env.JINGFANG_API_PORT || '3001');

const localServer = await startLocalServer({port});

console.log(`[local-api] listening on ${localServer.url}`);
