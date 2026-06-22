import { useQuery } from '@tanstack/react-query';
import { fetchRepos, fetchTree, fetchFile } from '../github';

export function useRepos(search: string) {
  return useQuery({
    queryKey: ['repos', search],
    queryFn: () => fetchRepos(search || undefined),
    staleTime: 30_000,
  });
}

export function useTree(owner: string, repo: string, branch: string) {
  return useQuery({
    queryKey: ['tree', owner, repo, branch],
    queryFn: () => fetchTree(owner, repo, branch),
    enabled: Boolean(owner && repo),
  });
}

export function useFile(owner: string, repo: string, path: string | null, branch: string) {
  return useQuery({
    queryKey: ['file', owner, repo, path, branch],
    queryFn: () => fetchFile(owner, repo, path as string, branch),
    enabled: Boolean(owner && repo && path),
  });
}