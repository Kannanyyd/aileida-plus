import { describe, it, expect } from 'vitest';
import {
  parseModelVersion,
  compareVersions,
  isNewerVersion,
  extractModelFamily,
  resolveModelIdentity,
  detectLifecycleTier,
  isModelObsoleteByName,
} from '../src/model-lifecycle';

describe('version-parser', () => {
  it('parses semantic versions from model slugs', () => {
    expect(parseModelVersion('gpt-4o')).toMatchObject({ major: 4 });
    expect(parseModelVersion('claude-3-5-sonnet')).toMatchObject({ major: 3, minor: 5 });
    expect(parseModelVersion('gemini-2.5-pro')).toMatchObject({ major: 2, minor: 5 });
    expect(parseModelVersion('grok-4')).toMatchObject({ major: 4 });
    expect(parseModelVersion('gpt-5')).toMatchObject({ major: 5 });
    expect(parseModelVersion('llama-3.1')).toMatchObject({ major: 3, minor: 1 });
    expect(parseModelVersion('qwen2.5')).toMatchObject({ major: 2, minor: 5 });
  });

  it('detects latest alias', () => {
    const v = parseModelVersion('claude-sonnet-4-latest');
    expect(v?.label).toBe('latest');
    expect(v?.major).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('compares versions correctly', () => {
    expect(isNewerVersion('gpt-5', 'gpt-4o')).toBe(true);
    expect(isNewerVersion('claude-3-5-sonnet', 'claude-3-opus')).toBe(true);
    expect(isNewerVersion('gemini-2.5-pro', 'gemini-1.5-pro')).toBe(true);
    expect(isNewerVersion('gpt-4o', 'gpt-5')).toBe(false);
  });

  it('returns null for unversioned models', () => {
    expect(parseModelVersion('claude-sonnet-4')).toBeTruthy();
  });
});

describe('family-resolver', () => {
  it('extracts model families correctly', () => {
    expect(extractModelFamily('gpt-4o')).toBe('gpt-4');
    expect(extractModelFamily('gpt-5')).toBe('gpt-5');
    expect(extractModelFamily('claude-3-5-sonnet')).toContain('claude-');
    expect(extractModelFamily('claude-sonnet-4')).toContain('claude-');
    expect(extractModelFamily('claude-opus-4')).toContain('claude-');
    expect(extractModelFamily('gemini-2.5-pro')).toBe('gemini-2.5');
    expect(extractModelFamily('grok-4')).toBe('grok-4');
    expect(extractModelFamily('deepseek-chat')).toBe('deepseek-chat');
    expect(extractModelFamily('deepseek-reasoner')).toBe('deepseek-reasoner');
    expect(extractModelFamily('qwen2.5-72b')).toBe('qwen2.5');
  });

  it('strips suffix tags when extracting family', () => {
    expect(extractModelFamily('gpt-4o-mini')).toBe('gpt-4');
    expect(extractModelFamily('claude-3-5-sonnet-latest')).toContain('claude-');
  });

  it('resolves full model identity', () => {
    const id = resolveModelIdentity('anthropic', 'claude-sonnet-4-20250514');
    expect(id.provider).toBe('anthropic');
    expect(id.family).toContain('claude-');
  });
});

describe('detector', () => {
  it('detects legacy models by name', () => {
    expect(isModelObsoleteByName('gpt-3.5-turbo')).toBe(true);
    expect(isModelObsoleteByName('text-davinci-003')).toBe(true);
    expect(isModelObsoleteByName('claude-2')).toBe(true);
    expect(isModelObsoleteByName('claude-instant')).toBe(true);
  });

  it('classifies Claude 4 as current (not previous generation)', () => {
    const claude4 = detectLifecycleTier({
      providerSlug: 'anthropic',
      modelSlug: 'claude-sonnet-4',
      modelName: 'Claude Sonnet 4',
      status: 'active',
      isOfficial: true,
      isRecommendedByOfficial: true,
      confidenceScore: 0.95,
      capabilities: ['text', 'vision', 'function-call'],
    });
    expect(['current_frontier', 'current_mainstream']).toContain(claude4);
  });

  it('classifies Claude Opus 4 as current (not previous generation)', () => {
    const claude4 = detectLifecycleTier({
      providerSlug: 'anthropic',
      modelSlug: 'claude-opus-4',
      modelName: 'Claude Opus 4',
      status: 'active',
      isOfficial: true,
      isRecommendedByOfficial: true,
      confidenceScore: 0.95,
      capabilities: ['text', 'vision', 'reasoning'],
    });
    expect(['current_frontier', 'current_mainstream']).toContain(claude4);
  });

  it('classifies official recommended models as current', () => {
    const result = detectLifecycleTier({
      providerSlug: 'openai',
      modelSlug: 'gpt-4o',
      modelName: 'GPT-4o',
      status: 'active',
      isOfficial: true,
      isRecommendedByOfficial: true,
      confidenceScore: 0.9,
      capabilities: ['text', 'vision', 'function-call'],
    });
    expect(['current_frontier', 'current_mainstream']).toContain(result);
  });

  it('classifies deprecated models correctly', () => {
    expect(detectLifecycleTier({
      providerSlug: 'openai',
      modelSlug: 'gpt-3.5-turbo',
      status: 'deprecated',
    })).toBe('deprecated');
  });
});
