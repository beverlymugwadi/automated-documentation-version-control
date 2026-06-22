import { Router } from 'express';

const api = Router();

api.get('/ping', (_req, res) => {
  res.json({ ok: true });
});

export default api;