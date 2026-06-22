import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { compose } from '../services/docComposer';
import { synthesize } from '../services/llmSynthesis';
import { dataStore, type SourceBinding } from '../lib/dataStore';
import { saveDocVersion } from '../services/versionService';
import { authorFromReq } from '../lib/access';

export const generateSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  notes: z.string().default(''),
  sourceRepo: z.string().optional(),
  files: z.array(z.object({ name: z.string(), content: z.string() })).default([]),
  bindings: z
    .array(z.object({ repoFullName: z.string(), path: z.string(), branch: z.string(), commitSha: z.string() }))
    .default([]),
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const started = Date.now();
  const userId = req.user!.userId;
  const author = authorFromReq(req);
  const { projectId, title, notes, files, sourceRepo, bindings } = req.body as z.infer<typeof generateSchema>;

  if (!notes.trim() && files.length === 0) {
    res.status(400).json({ error: { message: 'Add some notes or at least one source file to generate.' } });
    return;
  }

  const project = projectId
    ? await dataStore.getProject(projectId)
    : await dataStore.getOrCreateDefaultProject(userId, author);
  if (!project) {
    res.status(404).json({ error: { message: 'Project not found.' } });
    return;
  }

  const docTitle = title?.trim() || project.projectName || 'Untitled Documentation';

  const { markdown: ruleBasedMarkdown, structure } = compose({ title: docTitle, notes, files, sourceRepo });
  const { llmMarkdown, llmAvailable, llmError } = await synthesize(structure, files);

  await dataStore.addNote(project.projectId, notes);
  if (files.length) await dataStore.addFiles(project.projectId, files);

  const doc = await dataStore.createDoc({
    projectId: project.projectId,
    userId,
    title: docTitle,
    content: ruleBasedMarkdown,
    sourceRepo,
    sourceBindings: bindings as SourceBinding[],
  });

  await saveDocVersion(doc.docId, ruleBasedMarkdown, 'Initial generation', { source: 'generate', author });

  const generationMs = Date.now() - started;
  res.status(201).json({ docId: doc.docId, ruleBasedMarkdown, llmMarkdown, llmAvailable, llmError, structure, generationMs });
});