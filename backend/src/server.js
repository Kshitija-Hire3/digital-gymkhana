import fs from 'node:fs';
import path from 'node:path';
import { config } from './config/index.js';
import { createApp } from './app.js';
import { seedIfEmpty } from './store/seed.js';
import { resetInterrupted } from './services/dataProcessingService.js';

for (const d of ['excel/raw', 'excel/clean', 'store', 'sample']) fs.mkdirSync(path.join(config.dataDir, d), { recursive: true });
seedIfEmpty();
resetInterrupted();
createApp().listen(config.port, () => console.log(`Digital Gymkhana API listening on http://localhost:${config.port} (${config.env})`));
