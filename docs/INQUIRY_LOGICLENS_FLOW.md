# Inquiry & LogicLens Architecture

## Overview
The "Inquiry" system replaces the legacy "Challenge" model. Instead of adversarial challenges, users initiate "Inquiries" into specific nodes or edges. "LogicLens" is the AI subsystem that evaluates these inquiries.

## Core Flow
1. **Initiation**: User creates a `FormalInquiry` targeting a Node or Edge.
   - Input: `CreateFormalInquiryInput`
   - Data: `title`, `description`, `content` (the question/concern), `relatedNodeIds`.
   
2. **AI Analysis (LogicLens)**: 
   - The system (via `ConversationalAIResolver` or background worker) analyzes the inquiry against the target node's content and the graph context.
   - It produces an `aiDetermination` (Supported | Refuted | Inconclusive) and `aiRationale`.

3. **Community Voting**:
   - Users vote on the Inquiry (`castVote`).
   - Votes are weighted by user reputation (if enabled).

4. **Resolution**:
   - An Inquiry is considered resolved when a consensus threshold is met or a Mediator/Curator finalizes it.
   - Using `updateConfidenceScore`, the `credibility_score` of the target node is updated based on the Inquiry's outcome.

## Data Model
- **Node (Type: Inquiry)**: Represents the inquiry itself.
- **Edge (Type: INVESTIGATES)**: Connects Inquiry Node -> Target Node.
- **LogicLens**: Not a database entity, but a service logic flow that updates the Inquiry Node's metadata.

## Key Resolvers
- `createFormalInquiry`: Creates the Inquiry node and INVESTIGATES edge.
- `castVote`: Records user consensus.
- `updateConfidenceScore`: Updates the target node's score based on findings.
