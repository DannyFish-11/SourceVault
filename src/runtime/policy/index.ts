import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../storage';

export type DeliveryTarget = 'raw' | 'usb' | 'obsidian' | 'notebook' | 'notion';
export type PolicyAction = 'allow' | 'block' | 'defer' | 'manual_only';
export type RuleType = 'trust_threshold' | 'source_type' | 'item_type' | 'domain_match' | 'explicit_block';

export interface PushDecision {
  itemId: string;
  target: DeliveryTarget;
  decision: PolicyAction;
  reasons: string[];
}

export interface PolicyRule {
  id: string;
  target: DeliveryTarget;
  ruleType: RuleType;
  condition: string;
  action: PolicyAction;
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EvaluationContext {
  itemId: string;
  itemType: 'artifact' | 'digest' | 'topic';
  trustScore: number;
  sourceType?: string;
  sourceDomain?: string;
  admissionDecision?: 'admit' | 'review' | 'reject';
  metadata?: Record<string, unknown>;
}

export class PushPolicyEngine {
  private storage: SQLiteAdapter;

  constructor(storage: SQLiteAdapter) {
    this.storage = storage;
  }

  async evaluate(context: EvaluationContext, target: DeliveryTarget): Promise<PushDecision> {
    const policies = this.storage.getPushPoliciesByTarget(target);
    const reasons: string[] = [];

    // Sort by priority (highest first)
    const sortedPolicies = policies.sort((a, b) => b.priority - a.priority);

    // Evaluate each policy
    for (const policy of sortedPolicies) {
      if (!policy.enabled) continue;

      const matches = this.evaluateRule(policy, context);
      if (matches) {
        reasons.push(`${policy.ruleType}: ${policy.condition}`);

        // First matching rule determines action
        return {
          itemId: context.itemId,
          target,
          decision: policy.action as PolicyAction,
          reasons,
        };
      }
    }

    // Default behavior if no rules match
    const defaultDecision = this.getDefaultDecision(target, context);
    return {
      itemId: context.itemId,
      target,
      decision: defaultDecision,
      reasons: ['default_policy'],
    };
  }

  async evaluateAll(context: EvaluationContext): Promise<PushDecision[]> {
    const targets: DeliveryTarget[] = ['raw', 'usb', 'obsidian', 'notebook', 'notion'];
    const decisions: PushDecision[] = [];

    for (const target of targets) {
      const decision = await this.evaluate(context, target);
      decisions.push(decision);
    }

    return decisions;
  }

  private evaluateRule(policy: PolicyRule, context: EvaluationContext): boolean {
    switch (policy.ruleType) {
      case 'trust_threshold':
        return this.evaluateTrustThreshold(policy.condition, context.trustScore);

      case 'source_type':
        return this.evaluateSourceType(policy.condition, context.sourceType);

      case 'item_type':
        return this.evaluateItemType(policy.condition, context.itemType);

      case 'domain_match':
        return this.evaluateDomainMatch(policy.condition, context.sourceDomain);

      case 'explicit_block':
        return this.evaluateExplicitBlock(policy.condition, context);

      default:
        return false;
    }
  }

  private evaluateTrustThreshold(condition: string, trustScore: number): boolean {
    // Condition format: ">=0.7" or "<0.5"
    const match = condition.match(/^([><=]+)([\d.]+)$/);
    if (!match) return false;

    const operator = match[1];
    const threshold = parseFloat(match[2]);

    switch (operator) {
      case '>=':
        return trustScore >= threshold;
      case '>':
        return trustScore > threshold;
      case '<=':
        return trustScore <= threshold;
      case '<':
        return trustScore < threshold;
      case '==':
      case '=':
        return trustScore === threshold;
      default:
        return false;
    }
  }

  private evaluateSourceType(condition: string, sourceType?: string): boolean {
    if (!sourceType) return false;
    // Condition format: "github" or "arxiv,github"
    const allowedTypes = condition.split(',').map(t => t.trim());
    return allowedTypes.includes(sourceType);
  }

  private evaluateItemType(condition: string, itemType: string): boolean {
    // Condition format: "artifact" or "artifact,digest"
    const allowedTypes = condition.split(',').map(t => t.trim());
    return allowedTypes.includes(itemType);
  }

  private evaluateDomainMatch(condition: string, sourceDomain?: string): boolean {
    if (!sourceDomain) return false;
    // Condition format: "github.com" or "*.arxiv.org"
    const pattern = condition.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(sourceDomain);
  }

  private evaluateExplicitBlock(condition: string, context: EvaluationContext): boolean {
    // Condition format: JSON with blocked criteria
    try {
      const criteria = JSON.parse(condition);

      if (criteria.domains && context.sourceDomain) {
        if (criteria.domains.includes(context.sourceDomain)) {
          return true;
        }
      }

      if (criteria.itemIds && criteria.itemIds.includes(context.itemId)) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private getDefaultDecision(target: DeliveryTarget, context: EvaluationContext): PolicyAction {
    // Default policies per target
    switch (target) {
      case 'raw':
        // Raw vault accepts everything admitted
        return context.admissionDecision === 'admit' ? 'allow' : 'block';

      case 'usb':
        // USB requires high trust and admission
        return context.admissionDecision === 'admit' && context.trustScore >= 0.7
          ? 'allow'
          : 'block';

      case 'obsidian':
        // Obsidian accepts admitted items
        return context.admissionDecision === 'admit' ? 'allow' : 'defer';

      case 'notebook':
        // Notebook requires manual selection
        return 'manual_only';

      case 'notion':
        // Notion requires manual selection
        return 'manual_only';

      default:
        return 'block';
    }
  }

  async createDefaultPolicies(): Promise<void> {
    const now = new Date();

    // Raw vault policies
    this.storage.createPushPolicy({
      id: uuidv4(),
      target: 'raw',
      ruleType: 'trust_threshold',
      condition: '>=0.0',
      action: 'allow',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // USB vault policies
    this.storage.createPushPolicy({
      id: uuidv4(),
      target: 'usb',
      ruleType: 'trust_threshold',
      condition: '>=0.7',
      action: 'allow',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    this.storage.createPushPolicy({
      id: uuidv4(),
      target: 'usb',
      ruleType: 'source_type',
      condition: 'github,arxiv',
      action: 'allow',
      priority: 90,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Obsidian policies
    this.storage.createPushPolicy({
      id: uuidv4(),
      target: 'obsidian',
      ruleType: 'item_type',
      condition: 'artifact,digest',
      action: 'allow',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Notebook policies (manual only by default)
    this.storage.createPushPolicy({
      id: uuidv4(),
      target: 'notebook',
      ruleType: 'trust_threshold',
      condition: '>=0.0',
      action: 'manual_only',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });

    // Notion policies (manual only by default)
    this.storage.createPushPolicy({
      id: uuidv4(),
      target: 'notion',
      ruleType: 'trust_threshold',
      condition: '>=0.0',
      action: 'manual_only',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    });
  }
}
