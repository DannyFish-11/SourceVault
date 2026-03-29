import { Artifact, TrustLevel, ArtifactStatus, SourceType } from '@/lib/types';

// Mock data for development
export const mockArtifacts: Artifact[] = [
  {
    id: '1',
    sourceId: 's1',
    topicIds: ['t1'],
    title: 'React 19 Release Candidate',
    summary: 'React 19 RC is now available with new features including Actions, use API, and improved hydration.',
    url: 'https://github.com/facebook/react/releases/tag/v19.0.0-rc',
    publishedAt: new Date('2024-03-15'),
    discoveredAt: new Date('2024-03-15'),
    trustLevel: TrustLevel.HIGH,
    status: ArtifactStatus.NEW,
  },
  {
    id: '2',
    sourceId: 's2',
    topicIds: ['t2'],
    title: 'Attention Is All You Need',
    summary: 'Transformer architecture paper introducing self-attention mechanism for sequence modeling.',
    url: 'https://arxiv.org/abs/1706.03762',
    publishedAt: new Date('2017-06-12'),
    discoveredAt: new Date('2024-03-14'),
    trustLevel: TrustLevel.HIGH,
    status: ArtifactStatus.SAVED,
  },
  {
    id: '3',
    sourceId: 's3',
    topicIds: ['t1', 't3'],
    title: 'Next.js 15 Documentation Update',
    summary: 'Updated documentation for App Router, Server Components, and new caching behavior.',
    url: 'https://nextjs.org/docs',
    publishedAt: new Date('2024-03-10'),
    discoveredAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-14'),
    trustLevel: TrustLevel.HIGH,
    status: ArtifactStatus.REVIEWED,
  },
  {
    id: '4',
    sourceId: 's4',
    topicIds: ['t2'],
    title: 'Understanding LLM Fine-tuning',
    summary: 'Blog post discussing various approaches to fine-tuning large language models.',
    url: 'https://example.com/blog/llm-finetuning',
    publishedAt: new Date('2024-03-12'),
    discoveredAt: new Date('2024-03-13'),
    trustLevel: TrustLevel.MEDIUM,
    status: ArtifactStatus.NEW,
  },
];

export const mockSources = [
  { id: 's1', name: 'React GitHub', type: SourceType.GITHUB_REPO, trustLevel: TrustLevel.HIGH },
  { id: 's2', name: 'arXiv', type: SourceType.ARXIV, trustLevel: TrustLevel.HIGH },
  { id: 's3', name: 'Next.js Docs', type: SourceType.GITHUB_DOCS, trustLevel: TrustLevel.HIGH },
  { id: 's4', name: 'Tech Blog', type: SourceType.BLOG, trustLevel: TrustLevel.MEDIUM },
];

export const mockTopics = [
  { id: 't1', name: 'React Ecosystem', artifactCount: 12 },
  { id: 't2', name: 'Machine Learning', artifactCount: 8 },
  { id: 't3', name: 'Web Performance', artifactCount: 5 },
];
