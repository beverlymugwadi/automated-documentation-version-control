import { create } from 'zustand';

export interface StagedFile {
  key: string;
  name: string;
  path: string;
  repo?: string;
  branch?: string;
  sha?: string;
  content: string;
}

interface StagedState {
  files: StagedFile[];
  add: (file: StagedFile) => void;
  remove: (key: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
}

export const useStagedStore = create<StagedState>((set, get) => ({
  files: [],
  add: (file) =>
    set((s) => (s.files.some((f) => f.key === file.key) ? s : { files: [...s.files, file] })),
  remove: (key) => set((s) => ({ files: s.files.filter((f) => f.key !== key) })),
  clear: () => set({ files: [] }),
  has: (key) => get().files.some((f) => f.key === key),
}));