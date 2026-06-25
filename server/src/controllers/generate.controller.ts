import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { compose } from '../services/docComposer';
import { synthesize } from '../services/llmSynthesis';
import { dataStore, type SourceBinding } from '../lib/dataStore';
import { saveDocVersion } from '../services/versionService';
import { authorFromReq } from '../lib/access';
import { parseFile } from '../services/astParser';
import { computeSignatureHash } from '../lib/signatureHash';

export const generateSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().trim().max(200).optional(),
  notes: z.string().default(''),
  sourceRepo: z.string().optional(),
  files: z.array(z.object({ name: z.string(), content: z.string() })).default([]),
  bindings: z
    .array(z.object({
      repoFullName: z.string(),
      path: z.string(),
      branch: z.string(),
      commitSha: z.string(),
    }))
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

  const externalTitle = title?.trim() || project.projectName || 'Untitled Documentation';

  const { markdown: ruleBasedMarkdown, structure } = compose({ title: externalTitle, notes, files, sourceRepo });
  const { llmMarkdown, llmAvailable, llmError, derivedTitle } = await synthesize(structure, files);

  // Prefer the content-derived title from the synthesis pass — it reflects what the code actually does.
  // Fall back to the external label if the LLM pass didn't run or produced nothing.
  const docTitle = derivedTitle || externalTitle;

  await dataStore.addNote(project.projectId, notes);
  if (files.length) await dataStore.addFiles(project.projectId, files);

  // Build bindings with signatureHash — map each binding to a staged file by path.
  const fileContentMap = new Map(files.map((f) => [f.name, f.content]));
  const bindingsWithHash: SourceBinding[] = bindings.map((b) => {
    const content = fileContentMap.get(b.path);
    let signatureHash: string | undefined;
    if (content) {
      try {
        signatureHash = computeSignatureHash(parseFile(b.path, content));
      } catch { /* parse failed — store binding without hash */ }
    }
    return { ...b, signatureHash };
  });

  const doc = await dataStore.createDoc({
    projectId: project.projectId,
    userId,
    title: docTitle,
    content: ruleBasedMarkdown,
    sourceRepo,
    sourceBindings: bindingsWithHash,
  });

  await saveDocVersion(doc.docId, ruleBasedMarkdown, 'Initial generation', { source: 'generate', author });

  const generationMs = Date.now() - started;
  res.status(201).json({ docId: doc.docId, ruleBasedMarkdown, llmMarkdown, llmAvailable, llmError, derivedTitle, structure, generationMs });
});
