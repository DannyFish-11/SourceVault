import { v4 as uuidv4 } from 'uuid';
import { SQLiteAdapter } from '../storage';

export type AdmissionDecision = 'admit' | 'review' | 'reject';
export type PolicyMode = 'strict' | 'balanced' | 'broad';

export interface VaultAdmissionDecision {
  id: string;
  itemId: string;
  itemType: 'artifact' | 'digest' | 'topic';
  decision: AdmissionDecision;
  reasonCodes: string[];
  trustScore: number;
  policyMode: PolicyMode;
  reviewerRequired: boolean;
  decidedAt: Date;
  admittedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AdmissionCandidate {
  id: string;
  itemType: 'artifact' | 'digest' | 'topic';
  title: string;
  url?: string;
  sourceType?: string;
  sourceDomain?: string;
  trustScore: number;
  hasCanonicalSource: boolean;
  hasStableIdentifier: boolean;
  topicRelevance?: number;
  metadata?: Record<string, unknown>;
}

export class VaultAdmissionEngine {
  private storage: SQLiteAdapter;
  private policyMode: PolicyMode;
  private trustThreshold: number;

  constructor(storage: SQLiteAdapter, policyMode: PolicyMode = 'strict', trustThreshold: number = 0.7) {
    this.storage = storage;
    this.policyMode = policyMode;
    this.trustThreshold = trustThreshold;
  }

  async evaluate(candidate: AdmissionCandidate): Promise<VaultAdmissionDecision> {
    const reasonCodes: string[] = [];
    let decision: AdmissionDecision = 'reject';
    let reviewerRequired = false;

    // Check mandatory reject conditions
    if (!candidate.hasCanonicalSource) {
      reasonCodes.push('NO_CANONICAL_SOURCE');
      decision = 'reject';
    } else if (!candidate.hasStableIdentifier) {
      reasonCodes.push('NO_STABLE_IDENTIFIER');
      decision = 'reject';
    } else if (this.isBlockedDomain(candidate.sourceDomain)) {
      reasonCodes.push('BLOCKED_DOMAIN');
      decision = 'reject';
    } else if (this.isExplicitNoise(candidate)) {
      reasonCodes.push('NOISE_FILTER_BLOCK');
      decision = 'reject';
    } else {
      // Evaluate based on policy mode
      const result = this.evaluateByPolicyMode(candidate);
      decision = result.decision;
      reasonCodes.push(...result.reasonCodes);
      reviewerRequired = result.reviewerRequired;
    }

    const admissionDecision: VaultAdmissionDecision = {
      id: uuidv4(),
      itemId: candidate.id,
      itemType: candidate.itemType,
      decision,
      reasonCodes,
      trustScore: candidate.trustScore,
      policyMode: this.policyMode,
      reviewerRequired,
      decidedAt: new Date(),
      admittedAt: decision === 'admit' ? new Date() : undefined,
      metadata: candidate.metadata,
    };

    this.storage.createAdmissionDecision(admissionDecision);
    return admissionDecision;
  }

  private evaluateByPolicyMode(candidate: AdmissionCandidate): {
    decision: AdmissionDecision;
    reasonCodes: string[];
    reviewerRequired: boolean;
  } {
    switch (this.policyMode) {
      case 'strict':
        return this.evaluateStrict(candidate);
      case 'balanced':
        return this.evaluateBalanced(candidate);
      case 'broad':
        return this.evaluateBroad(candidate);
      default:
        return { decision: 'reject', reasonCodes: ['UNKNOWN_POLICY_MODE'], reviewerRequired: false };
    }
  }

  private evaluateStrict(candidate: AdmissionCandidate): {
    decision: AdmissionDecision;
    reasonCodes: string[];
    reviewerRequired: boolean;
  } {
    const reasonCodes: string[] = [];

    // Strict mode: only primary sources with high trust
    if (this.isPrimarySource(candidate.sourceType)) {
      if (candidate.trustScore >= this.trustThreshold) {
        reasonCodes.push('PASSED_STRICT_POLICY', 'HIGH_TRUST_PRIMARY_SOURCE');
        return { decision: 'admit', reasonCodes, reviewerRequired: false };
      } else {
        reasonCodes.push('LOW_TRUST');
        return { decision: 'review', reasonCodes, reviewerRequired: true };
      }
    }

    // Secondary sources with strong provenance go to review
    if (candidate.trustScore >= 0.6 && candidate.hasCanonicalSource) {
      reasonCodes.push('REVIEW_REQUIRED', 'SECONDARY_WITH_PROVENANCE');
      return { decision: 'review', reasonCodes, reviewerRequired: true };
    }

    reasonCodes.push('LOW_TRUST', 'NOT_PRIMARY_SOURCE');
    return { decision: 'reject', reasonCodes, reviewerRequired: false };
  }

  private evaluateBalanced(candidate: AdmissionCandidate): {
    decision: AdmissionDecision;
    reasonCodes: string[];
    reviewerRequired: boolean;
  } {
    const reasonCodes: string[] = [];

    // Balanced mode: primary sources + high-quality secondary
    if (this.isPrimarySource(candidate.sourceType)) {
      if (candidate.trustScore >= this.trustThreshold) {
        reasonCodes.push('PASSED_BALANCED_POLICY', 'HIGH_TRUST_PRIMARY_SOURCE');
        return { decision: 'admit', reasonCodes, reviewerRequired: false };
      } else if (candidate.trustScore >= 0.5) {
        reasonCodes.push('REVIEW_REQUIRED', 'MEDIUM_TRUST_PRIMARY');
        return { decision: 'review', reasonCodes, reviewerRequired: true };
      }
    }

    // High-quality secondary with clear provenance
    if (candidate.trustScore >= 0.7 && candidate.hasCanonicalSource) {
      reasonCodes.push('PASSED_BALANCED_POLICY', 'HIGH_QUALITY_SECONDARY');
      return { decision: 'admit', reasonCodes, reviewerRequired: false };
    }

    // Medium trust secondary goes to review
    if (candidate.trustScore >= 0.5 && candidate.hasCanonicalSource) {
      reasonCodes.push('REVIEW_REQUIRED', 'MEDIUM_TRUST_SECONDARY');
      return { decision: 'review', reasonCodes, reviewerRequired: true };
    }

    reasonCodes.push('LOW_TRUST');
    return { decision: 'reject', reasonCodes, reviewerRequired: false };
  }

  private evaluateBroad(candidate: AdmissionCandidate): {
    decision: AdmissionDecision;
    reasonCodes: string[];
    reviewerRequired: boolean;
  } {
    const reasonCodes: string[] = [];

    // Broad mode: more permissive but still conservative
    if (candidate.trustScore >= this.trustThreshold) {
      reasonCodes.push('PASSED_BROAD_POLICY', 'MEETS_TRUST_THRESHOLD');
      return { decision: 'admit', reasonCodes, reviewerRequired: false };
    }

    if (candidate.trustScore >= 0.5 && candidate.hasCanonicalSource) {
      reasonCodes.push('REVIEW_REQUIRED', 'MEDIUM_TRUST_WITH_SOURCE');
      return { decision: 'review', reasonCodes, reviewerRequired: true };
    }

    if (candidate.trustScore >= 0.4 && this.isPrimarySource(candidate.sourceType)) {
      reasonCodes.push('REVIEW_REQUIRED', 'LOW_TRUST_PRIMARY');
      return { decision: 'review', reasonCodes, reviewerRequired: true };
    }

    reasonCodes.push('LOW_TRUST');
    return { decision: 'reject', reasonCodes, reviewerRequired: false };
  }

  private isPrimarySource(sourceType?: string): boolean {
    if (!sourceType) return false;
    const primaryTypes = ['github', 'arxiv', 'official_docs', 'release_page'];
    return primaryTypes.includes(sourceType.toLowerCase());
  }

  private isBlockedDomain(domain?: string): boolean {
    if (!domain) return false;
    // TODO: Implement blocked domain list from settings
    const blockedDomains = ['spam.com', 'fake-news.com'];
    return blockedDomains.includes(domain.toLowerCase());
  }

  private isExplicitNoise(candidate: AdmissionCandidate): boolean {
    // Check for noise indicators
    if (candidate.metadata?.isNoise === true) {
      return true;
    }

    // Check for duplicate low-value content
    if (candidate.metadata?.isDuplicate === true && candidate.trustScore < 0.3) {
      return true;
    }

    return false;
  }

  async approveReviewItem(itemId: string): Promise<void> {
    const decision = this.storage.getAdmissionDecisionByItemId(itemId);
    if (!decision) {
      throw new Error(`No admission decision found for item: ${itemId}`);
    }

    if (decision.decision !== 'review') {
      throw new Error(`Item is not in review status: ${decision.decision}`);
    }

    // Update decision to admit
    this.storage.createAdmissionDecision({
      ...decision,
      id: uuidv4(),
      decision: 'admit',
      admittedAt: new Date(),
      decidedAt: new Date(),
      reasonCodes: [...decision.reasonCodes, 'MANUALLY_APPROVED'],
    });
  }

  async rejectReviewItem(itemId: string, reason: string): Promise<void> {
    const decision = this.storage.getAdmissionDecisionByItemId(itemId);
    if (!decision) {
      throw new Error(`No admission decision found for item: ${itemId}`);
    }

    if (decision.decision !== 'review') {
      throw new Error(`Item is not in review status: ${decision.decision}`);
    }

    // Update decision to reject
    this.storage.createAdmissionDecision({
      ...decision,
      id: uuidv4(),
      decision: 'reject',
      decidedAt: new Date(),
      reasonCodes: [...decision.reasonCodes, 'MANUALLY_REJECTED', reason],
    });
  }

  setPolicyMode(mode: PolicyMode): void {
    this.policyMode = mode;
  }

  setTrustThreshold(threshold: number): void {
    this.trustThreshold = threshold;
  }
}
