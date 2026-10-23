import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_q, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' }); next(); });
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '200kb' }));
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
