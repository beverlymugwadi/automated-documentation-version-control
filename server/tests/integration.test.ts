import { describe, it, expect } from 'vitest';
import { compose } from '../src/services/docComposer';
import { dataStore } from '../src/lib/dataStore';
import { saveDocVersion } from '../src/services/versionService';
import { lineDiff } from '../src/lib/diff';
import { exportPdf } from '../src/services/exporters/pdf';
import { exportDocx } from '../src/services/exporters/docx';

describe('generate → version → diff → rollback → export', () => {
  it('runs the full document lifecycle', async () => {
    const userId = 'u_test';
    const project = await dataStore.createProject({ userId, projectName: 'Test Project' });

    // 1. Generate
    const { markdown } = compose({
      title: 'Test Doc',
      notes: 'Overview: a test module.\nInstall with npm install test.\nTODO: write more.',
      files: [{ name: 'a.ts', content: '/** add */\nexport function add(a: number, b: number): number { return a + b; }' }],
    });
    expect(markdown).toContain('## Overview');
    expect(markdown).toContain('add');

    const doc = await dataStore.createDoc({ projectId: project.projectId, userId, title: 'Test Doc', content: markdown });

    // 2. Save versions
    const v1 = await saveDocVersion(doc.docId, markdown, 'Initial');
    const edited = `${markdown}\n\n## Extra\n- a new line`;
    const v2 = await saveDocVersion(doc.docId, edited, 'Add extra section');
    expect(v1.versionNo).toBe(1);
    expect(v2.versionNo).toBe(2);
    expect(v1.commitHash).toBeTruthy();

    const versions = await dataStore.listVersions(doc.docId);
    expect(versions).toHaveLength(2);

    // 3. Diff
    const a = await dataStore.getVersion(doc.docId, 1);
    const b = await dataStore.getVersion(doc.docId, 2);
    const diff = lineDiff(a!.content, b!.content);
    expect(diff.stats.additions).toBeGreaterThan(0);

    // 4. Rollback
    const target = await dataStore.getVersion(doc.docId, 1);
    const v3 = await saveDocVersion(doc.docId, target!.content, 'Rolled back to v1');
    expect(v3.versionNo).toBe(3);
    const current = await dataStore.getDoc(doc.docId);
    expect(current?.content).toBe(markdown);

    // 5. Export
    const meta = { title: 'Test Doc', version: 3, commit: v3.commitHash, date: new Date().toUTCString() };
    const pdf = await exportPdf(current!.content, meta);
    const docx = await exportDocx(current!.content, meta);
    expect(pdf.length).toBeGreaterThan(800);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(docx.length).toBeGreaterThan(800);
  });
});