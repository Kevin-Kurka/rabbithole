/**
 * ClaimExtractionService Usage Examples
 *
 * This file demonstrates how to use the ClaimExtractionService
 * for document analysis, claim extraction, and knowledge graph integration.
 */

import { Pool } from 'pg';
import { claimExtractionService } from '../ClaimExtractionService';
import { doclingService } from '../DoclingProcessingService';

// ============================================================================
// Example 1: Extract claims from document text
// ============================================================================

async function example1_extractClaims() {
  console.log('\n=== Example 1: Extract Claims from Text ===\n');

  const documentText = `
    The Warren Commission concluded in 1964 that Lee Harvey Oswald acted alone
    in assassinating President John F. Kennedy on November 22, 1963, in Dallas, Texas.
    The Commission found that Oswald fired three shots from the sixth floor of the
    Texas School Book Depository, with the fatal shot striking Kennedy's head.

    However, subsequent investigations, including the House Select Committee on
    Assassinations (HSCA) in 1979, concluded that Kennedy was "probably assassinated
    as a result of a conspiracy" based on acoustic evidence suggesting a second shooter.

    According to the autopsy report (Warren Commission Document 388), Kennedy sustained
    two bullet wounds: one to the upper back/neck area and the fatal head wound.
    The "single bullet theory," proposed by Arlen Specter, suggests one bullet caused
    multiple wounds to both Kennedy and Governor Connally.
  `;

  try {
    const result = await claimExtractionService.extractClaims(documentText);

    console.log(`✓ Extracted ${result.claims.length} claims`);
    console.log(`✓ Identified ${result.primarySources.length} sources`);
    console.log(`✓ Processing time: ${result.processingTime}ms`);
    console.log(`✓ Content hash: ${result.documentMetadata.contentHash}\n`);

    // Display extracted claims
    result.claims.forEach((claim, index) => {
      console.log(`Claim ${index + 1}:`);
      console.log(`  Text: ${claim.text}`);
      console.log(`  Type: ${claim.claimType}`);
      console.log(`  Confidence: ${(claim.confidence * 100).toFixed(1)}%`);
      console.log(`  Keywords: ${claim.keywords.join(', ')}`);
      console.log(`  Evidence: ${claim.supportingEvidence.length} items\n`);
    });

    // Display primary sources
    result.primarySources.forEach((source, index) => {
      console.log(`Source ${index + 1}:`);
      console.log(`  Type: ${source.sourceType}`);
      console.log(`  Title: ${source.title || 'N/A'}`);
      console.log(`  Citation: ${source.citation || 'N/A'}`);
      console.log(`  Confidence: ${(source.confidence * 100).toFixed(1)}%\n`);
    });

    return result;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Example 2: Match claims to existing nodes
// ============================================================================

async function example2_matchClaims(pool: Pool) {
  console.log('\n=== Example 2: Match Claims to Knowledge Graph Nodes ===\n');

  // First, extract claims
  const documentText = `
    The assassination took place at Dealey Plaza in Dallas, Texas, on November 22, 1963.
    President Kennedy was pronounced dead at Parkland Memorial Hospital at 1:00 PM CST.
  `;

  const extractionResult = await claimExtractionService.extractClaims(documentText);

  // Match claims to existing nodes in a specific graph
  const graphId = 'your-graph-id-here'; // Replace with actual graph ID

  try {
    const matchResults = await claimExtractionService.matchClaimsToNodes(
      extractionResult.claims,
      pool,
      graphId
    );

    matchResults.forEach((result, index) => {
      console.log(`\nClaim ${index + 1}: "${result.claim.text.substring(0, 60)}..."`);
      console.log(`Suggested Action: ${result.suggestedAction}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Matches found: ${result.matches.length}`);

      if (result.matches.length > 0) {
        console.log('\nTop matches:');
        result.matches.slice(0, 3).forEach((match, i) => {
          console.log(`  ${i + 1}. "${match.title}"`);
          console.log(`     Similarity: ${(match.similarity * 100).toFixed(1)}%`);
          console.log(`     Type: ${match.nodeType || 'unknown'}`);
          console.log(`     Level 0: ${match.isLevel0}`);
        });
      }
    });

    return matchResults;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Example 3: Check for duplicate content
// ============================================================================

async function example3_checkDuplicates(pool: Pool) {
  console.log('\n=== Example 3: Check for Duplicate Content ===\n');

  const documentText = `
    This is sample document text that we want to check for duplicates
    in the knowledge graph database.
  `;

  // Calculate file hash
  const { createHash } = await import('crypto');
  const fileHash = createHash('sha256').update(documentText).digest('hex');

  try {
    const duplicateCheck = await claimExtractionService.checkForDuplicates(
      fileHash,
      documentText,
      pool
    );

    console.log(`Content Hash: ${duplicateCheck.contentHash}`);
    console.log(`Is Duplicate: ${duplicateCheck.isDuplicate}`);

    if (duplicateCheck.isDuplicate) {
      console.log(`Duplicate Type: ${duplicateCheck.duplicateType}`);
      console.log(`Matched Node ID: ${duplicateCheck.matchedNodeId}`);
      console.log(`Match Score: ${((duplicateCheck.matchScore || 0) * 100).toFixed(1)}%`);

      // Based on duplicate type, take appropriate action
      switch (duplicateCheck.duplicateType) {
        case 'exact':
          console.log('\n⚠ Exact duplicate detected - skip upload');
          break;
        case 'near':
          console.log('\n⚠ Near duplicate detected - prompt user to confirm');
          break;
        case 'semantic':
          console.log('\n⚠ Semantic similarity detected - suggest linking');
          break;
      }
    } else {
      console.log('\n✓ No duplicate found - safe to upload');
    }

    return duplicateCheck;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Example 4: Score claim credibility
// ============================================================================

async function example4_scoreCredibility() {
  console.log('\n=== Example 4: Score Claim Credibility ===\n');

  // Example claim with high credibility
  const claim = {
    id: 'claim-1',
    text: 'President Kennedy was assassinated on November 22, 1963',
    supportingEvidence: [
      'Warren Commission Report',
      'Contemporary news reports',
      'Eyewitness testimony',
    ],
    confidence: 0.95,
    claimType: 'factual' as const,
    keywords: ['Kennedy', 'assassination', '1963'],
  };

  // Example primary sources
  const sources = [
    {
      title: 'Report of the President\'s Commission on the Assassination',
      author: 'Warren Commission',
      publicationDate: new Date('1964-09-24'),
      sourceType: 'report' as const,
      confidence: 0.95,
    },
    {
      title: 'JFK assassination records',
      sourceType: 'dataset' as const,
      url: 'https://www.archives.gov/research/jfk',
      confidence: 0.90,
    },
    {
      title: 'Investigation of the Assassination',
      author: 'House Select Committee',
      publicationDate: new Date('1979-01-01'),
      sourceType: 'report' as const,
      confidence: 0.90,
    },
  ];

  try {
    const credibilityScore = await claimExtractionService.scoreCredibility(
      claim,
      sources
    );

    console.log(`Overall Credibility: ${(credibilityScore.overall * 100).toFixed(1)}%`);
    console.log('\nFactor Breakdown:');
    console.log(`  Source Type Score: ${(credibilityScore.factors.sourceType * 100).toFixed(1)}%`);
    console.log(`  Citation Count: ${(credibilityScore.factors.citationCount * 100).toFixed(1)}%`);
    console.log(`  Verification Status: ${(credibilityScore.factors.verificationStatus * 100).toFixed(1)}%`);
    console.log(`  Consensus Level: ${(credibilityScore.factors.consensusLevel * 100).toFixed(1)}%`);
    console.log(`  Recency: ${(credibilityScore.factors.recency * 100).toFixed(1)}%`);
    console.log(`  Author Credibility: ${(credibilityScore.factors.authorCredibility * 100).toFixed(1)}%`);
    console.log(`\nReasoning: ${credibilityScore.reasoning}`);

    return credibilityScore;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Example 5: Full workflow - Process PDF document
// ============================================================================

async function example5_fullWorkflow(pool: Pool, filePath: string, graphId: string) {
  console.log('\n=== Example 5: Full Document Processing Workflow ===\n');

  try {
    // Step 1: Process document with Docling
    console.log('Step 1: Processing document with Docling...');
    const doclingResult = await doclingService.processDocument(filePath, {
      extractTables: true,
      extractFigures: false,
      extractSections: true,
      outputFormat: 'markdown',
    });

    if (!doclingResult.success) {
      throw new Error(`Document processing failed: ${doclingResult.error}`);
    }

    console.log(`✓ Document processed: ${doclingResult.pageCount} pages`);

    // Step 2: Check for duplicates
    console.log('\nStep 2: Checking for duplicate content...');
    const { createHash } = await import('crypto');
    const fileHash = createHash('sha256').update(doclingResult.text).digest('hex');

    const duplicateCheck = await claimExtractionService.checkForDuplicates(
      fileHash,
      doclingResult.text,
      pool
    );

    if (duplicateCheck.isDuplicate && duplicateCheck.duplicateType === 'exact') {
      console.log('⚠ Exact duplicate found - stopping workflow');
      return {
        status: 'duplicate',
        nodeId: duplicateCheck.matchedNodeId,
      };
    }

    // Step 3: Extract claims
    console.log('\nStep 3: Extracting claims from document...');
    const claimResult = await claimExtractionService.extractClaims(
      doclingResult.text,
      doclingResult
    );

    console.log(`✓ Extracted ${claimResult.claims.length} claims`);
    console.log(`✓ Identified ${claimResult.primarySources.length} sources`);

    // Step 4: Match claims to existing nodes
    console.log('\nStep 4: Matching claims to knowledge graph...');
    const matchResults = await claimExtractionService.matchClaimsToNodes(
      claimResult.claims,
      pool,
      graphId
    );

    // Step 5: Score credibility for each claim
    console.log('\nStep 5: Scoring claim credibility...');
    const credibilityScores = await Promise.all(
      claimResult.claims.map(claim =>
        claimExtractionService.scoreCredibility(claim, claimResult.primarySources)
      )
    );

    // Step 6: Generate recommendations
    console.log('\nStep 6: Generating recommendations...\n');

    const recommendations = matchResults.map((match, index) => {
      const credibility = credibilityScores[index];

      return {
        claim: match.claim,
        action: match.suggestedAction,
        confidence: match.confidence,
        credibility: credibility.overall,
        matches: match.matches,
        reasoning: credibility.reasoning,
      };
    });

    // Display summary
    console.log('=== Workflow Summary ===\n');
    console.log(`Document: ${doclingResult.metadata.title || 'Untitled'}`);
    console.log(`Pages: ${doclingResult.pageCount}`);
    console.log(`Claims: ${claimResult.claims.length}`);
    console.log(`Sources: ${claimResult.primarySources.length}`);
    console.log(`Processing time: ${doclingResult.processingTime + claimResult.processingTime}ms\n`);

    console.log('Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. "${rec.claim.text.substring(0, 60)}..."`);
      console.log(`   Action: ${rec.action}`);
      console.log(`   Match Confidence: ${(rec.confidence * 100).toFixed(1)}%`);
      console.log(`   Credibility: ${(rec.credibility * 100).toFixed(1)}%`);
      console.log(`   Existing Matches: ${rec.matches.length}`);
    });

    return {
      status: 'success',
      document: doclingResult,
      claims: claimResult,
      matches: matchResults,
      credibility: credibilityScores,
      recommendations,
    };
  } catch (error: any) {
    console.error(`Workflow error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Example 6: Identify primary sources
// ============================================================================

async function example6_identifySources() {
  console.log('\n=== Example 6: Identify Primary Sources ===\n');

  const documentText = `
    This analysis is based on several key sources. The Warren Commission Report (1964)
    provides the official government investigation. The House Select Committee on
    Assassinations Final Report (1979) offers a later congressional perspective.

    Academic research includes "Case Closed" by Gerald Posner (ISBN: 978-0307748263)
    and peer-reviewed articles such as "Trajectory Analysis of the Kennedy Assassination"
    (DOI: 10.1234/example.doi).

    Digital archives are available at https://www.archives.gov/research/jfk and
    https://history-matters.com/archive/jfk/.

    Contemporary news coverage from The New York Times and Dallas Morning News
    documented the events as they unfolded on November 22-23, 1963.
  `;

  try {
    const sources = await claimExtractionService.identifyPrimarySources(documentText);

    console.log(`✓ Identified ${sources.length} primary sources\n`);

    // Group by source type
    const byType: Record<string, typeof sources> = {};
    sources.forEach(source => {
      if (!byType[source.sourceType]) {
        byType[source.sourceType] = [];
      }
      byType[source.sourceType].push(source);
    });

    // Display grouped sources
    Object.entries(byType).forEach(([type, sourcesOfType]) => {
      console.log(`${type.toUpperCase()} (${sourcesOfType.length}):`);
      sourcesOfType.forEach(source => {
        console.log(`  - ${source.title || source.citation || source.url || 'Unknown'}`);
        if (source.author) console.log(`    Author: ${source.author}`);
        if (source.doi) console.log(`    DOI: ${source.doi}`);
        if (source.isbn) console.log(`    ISBN: ${source.isbn}`);
        if (source.url) console.log(`    URL: ${source.url}`);
        console.log(`    Confidence: ${(source.confidence * 100).toFixed(1)}%`);
      });
      console.log();
    });

    return sources;
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Main execution (for testing)
// ============================================================================

async function main() {
  // Uncomment individual examples to test

  // Example 1: Basic claim extraction
  await example1_extractClaims();

  // Example 2: Match claims to nodes (requires database)
  // const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // await example2_matchClaims(pool);

  // Example 3: Check for duplicates (requires database)
  // await example3_checkDuplicates(pool);

  // Example 4: Score credibility
  await example4_scoreCredibility();

  // Example 5: Full workflow (requires database and file)
  // await example5_fullWorkflow(pool, '/path/to/document.pdf', 'graph-id');

  // Example 6: Identify sources
  await example6_identifySources();
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export examples for use in other modules
export {
  example1_extractClaims,
  example2_matchClaims,
  example3_checkDuplicates,
  example4_scoreCredibility,
  example5_fullWorkflow,
  example6_identifySources,
};
