# Logical Fallacy Reference Guide

Quick reference for AI-based fallacy detection in arguments.

---

## Formal Fallacies (Invalid Logical Structure)

### 1. Affirming the Consequent
**Structure**: If P, then Q. Q is true. Therefore, P is true.

**Example**:
- If it's raining, the ground is wet.
- The ground is wet.
- Therefore, it's raining. ❌

**Why Invalid**: The ground could be wet for other reasons (sprinkler, flood, etc.)

**Detection Pattern**: `(P → Q), Q ⊢ P`

---

### 2. Denying the Antecedent
**Structure**: If P, then Q. P is false. Therefore, Q is false.

**Example**:
- If it's a dog, then it's a mammal.
- It's not a dog.
- Therefore, it's not a mammal. ❌

**Why Invalid**: Other mammals exist besides dogs.

**Detection Pattern**: `(P → Q), ¬P ⊢ ¬Q`

---

### 3. Undistributed Middle
**Structure**: All A are B. All C are B. Therefore, all A are C.

**Example**:
- All dogs are animals.
- All cats are animals.
- Therefore, all dogs are cats. ❌

**Why Invalid**: A and C could be distinct subsets of B.

**Detection Pattern**: Categorical syllogism with middle term not distributed

---

## Informal Fallacies (Content-Based Errors)

### 4. Ad Hominem (Attack the Person)
**Definition**: Attacking the person making the argument rather than the argument itself.

**Example**:
- "You can't trust climate scientists because they're funded by the government." ❌

**Detection Markers**:
- Character attacks
- Motive questioning
- Credentials dismissal
- Personal insults

---

### 5. Straw Man
**Definition**: Misrepresenting an opponent's argument to make it easier to attack.

**Example**:
- Person A: "We should have some gun control."
- Person B: "Person A wants to ban all guns and take away our rights!" ❌

**Detection Markers**:
- Exaggeration of position
- Oversimplification
- "So you're saying..." followed by distortion

---

### 6. False Dichotomy (False Dilemma)
**Definition**: Presenting only two options when more exist.

**Example**:
- "You're either with us or against us." ❌
- "Either we cut all social programs or we'll go bankrupt." ❌

**Detection Markers**:
- "Either... or..."
- "Only two options"
- "Must choose between"
- Ignoring middle ground

---

### 7. Slippery Slope
**Definition**: Claiming a small first step will inevitably lead to extreme consequences without justification.

**Example**:
- "If we allow gay marriage, next people will want to marry animals!" ❌

**Detection Markers**:
- Chain reaction claims
- "If we do X, then Y will happen, then Z..."
- Extreme endpoint without evidence
- Lack of causal justification

---

### 8. Circular Reasoning (Begging the Question)
**Definition**: Conclusion is assumed in the premise.

**Example**:
- "God exists because the Bible says so, and the Bible is true because it's the word of God." ❌

**Detection Markers**:
- Premise and conclusion are equivalent
- "Because" clause restates claim
- No independent justification

---

### 9. Appeal to Authority (Inappropriate)
**Definition**: Citing authority outside their area of expertise or when expert consensus disagrees.

**Example**:
- "Einstein was a genius, so his views on politics must be correct." ❌

**When Valid**: Citing expert consensus within field of expertise

**Detection Markers**:
- Celebrity endorsements
- Authority outside expertise
- Single expert vs consensus
- "Doctor" without relevant specialization

---

### 10. Appeal to Emotion
**Definition**: Manipulating emotions instead of providing evidence.

**Subtypes**:
- Appeal to Fear: "If you don't buy security software, hackers will steal your identity!"
- Appeal to Pity: "You should give me a good grade because my dog died."
- Appeal to Flattery: "A smart person like you would obviously agree..."

**Detection Markers**:
- Emotional language
- Fear-mongering
- Guilt-tripping
- Manipulative imagery

---

### 11. Red Herring
**Definition**: Introducing irrelevant topic to distract from the argument.

**Example**:
- Politician asked about corruption: "But what about the economy? That's what really matters!" ❌

**Detection Markers**:
- Topic change
- "What about..."
- "But let's talk about..."
- Deflection patterns

---

### 12. Post Hoc Ergo Propter Hoc (False Cause)
**Definition**: Assuming correlation implies causation.

**Example**:
- "I wore my lucky socks and won the game, so my socks caused the win." ❌

**Detection Markers**:
- "After this, therefore because of this"
- Temporal sequence assumed as causation
- Ignoring alternative explanations
- Confounding variables not considered

---

### 13. Hasty Generalization
**Definition**: Drawing broad conclusions from insufficient evidence.

**Example**:
- "I met two rude people from that city, so everyone from there must be rude." ❌

**Detection Markers**:
- Small sample size
- "All", "every", "always" from limited data
- Anecdotal evidence only
- Ignoring counter-examples

---

### 14. Cherry Picking (Selective Evidence)
**Definition**: Selecting only evidence that supports your position while ignoring contradictory evidence.

**Example**:
- Citing only studies showing benefit while ignoring meta-analyses showing no effect ❌

**Detection Markers**:
- One-sided evidence presentation
- Ignoring contrary studies
- Dismissing negative results
- Publication bias

---

### 15. Tu Quoque (You Too / Hypocrisy)
**Definition**: Dismissing an argument because the arguer is hypocritical.

**Example**:
- "You say I shouldn't smoke, but you used to smoke!" ❌

**Why Invalid**: Hypocrisy doesn't invalidate the argument itself

**Detection Markers**:
- "You do it too"
- "But you..."
- Pointing to past behavior
- Attacking consistency

---

## Special Cases

### 16. No True Scotsman
**Definition**: Modifying definition to exclude counter-examples.

**Example**:
- Person A: "No Scotsman puts sugar on porridge."
- Person B: "My Scottish uncle does."
- Person A: "Well, no *true* Scotsman puts sugar on porridge." ❌

---

### 17. Loaded Question
**Definition**: Question contains unproven assumption.

**Example**:
- "Have you stopped beating your wife?" ❌ (assumes you beat your wife)

---

### 18. Middle Ground Fallacy
**Definition**: Assuming the truth must be between two extremes.

**Example**:
- Person A: "Earth is flat."
- Person B: "Earth is a sphere."
- "The truth must be in the middle - Earth is half-flat!" ❌

---

### 19. Appeal to Nature
**Definition**: Assuming "natural" means "good" or "better."

**Example**:
- "This medicine is all-natural, so it's safe." ❌ (poison ivy is natural)

---

### 20. Genetic Fallacy
**Definition**: Judging something based on its origin rather than its current merit.

**Example**:
- "That idea came from Nazis, so it must be wrong." ❌

---

## AI Detection Algorithm

```typescript
interface FallacyDetection {
  fallacyType: string;
  confidence: number; // 0.0-1.0
  location: string; // Where in argument
  explanation: string;
  correction: string; // How to fix
}

function detectFallacies(argument: string): FallacyDetection[] {
  const detections: FallacyDetection[] = [];

  // Structural analysis
  const logicalForm = extractLogicalForm(argument);
  detections.push(...checkFormalFallacies(logicalForm));

  // Content analysis
  detections.push(...checkAdHominem(argument));
  detections.push(...checkStrawMan(argument));
  detections.push(...checkFalseDichotomy(argument));
  detections.push(...checkSlipperySlope(argument));
  detections.push(...checkCircularReasoning(argument));
  detections.push(...checkAppealToAuthority(argument));
  detections.push(...checkAppealToEmotion(argument));
  detections.push(...checkRedHerring(argument));
  detections.push(...checkFalseCause(argument));
  detections.push(...checkHastyGeneralization(argument));
  detections.push(...checkCherryPicking(argument));

  return detections.filter(d => d.confidence > 0.6);
}
```

---

## Fallacy Severity Levels

**Critical (Block Argument)**:
- Circular Reasoning
- Affirming the Consequent
- Denying the Antecedent

**High (Major Weakness)**:
- Straw Man
- False Dichotomy
- Cherry Picking
- Post Hoc Fallacy

**Medium (Moderate Weakness)**:
- Appeal to Authority (inappropriate)
- Hasty Generalization
- Slippery Slope (unjustified)

**Low (Minor Issue)**:
- Appeal to Emotion (if evidence also provided)
- Red Herring (if eventually addressed)

---

## AI Prompt Template

```
Analyze the following argument for logical fallacies:

[ARGUMENT TEXT]

For each fallacy:
1. Name the specific fallacy
2. Quote the exact passage containing the fallacy
3. Explain why it's fallacious
4. Rate severity (Critical/High/Medium/Low)
5. Suggest how to fix it

Format: JSON array of fallacy objects
```

---

## References

- Walton, Douglas. *Fallacies Arising from Ambiguity*. Springer, 1996.
- Hansen, Hans. "Fallacies." *Stanford Encyclopedia of Philosophy*, 2020.
- Tincq, David. *A Rulebook for Arguments*. Hackett Publishing, 2019.
