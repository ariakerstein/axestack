/**
 * GraphRAG Module for OpenCancer.ai
 *
 * 4-layer system for personalized cancer guidance:
 * 1. Graph Traversal (PCO extraction)
 * 2. Specialized RAG (per persona)
 * 3. Persona Analysis
 * 4. Synthesis + Feedback
 */

// Types
export * from './types'

// PCO Extraction
export {
  extractPCO,
  extractMinimalPCO,
  hasSufficientData,
  type ExtractPCOOptions
} from './pco-extractor'

// Graph Traversal
export {
  traverseFromEntities,
  traverseViaRPC,
  expandWithGraphContext,
  findPaths,
  getNeighbors,
  getPatientGraphStats,
  type TraverseFromEntitiesOptions
} from './graph-traverser'

// Persona RAG (Layer 2)
export {
  // Orchestrator
  orchestratePersonaRAG,
  combineRetrievals,
  formatForPrompt,
  selectBestPersona,
  RETRIEVAL_CONFIGS,
  type OrchestratorResult,
  // Factory
  createRetriever,
  getPersonaNames,
  // Individual Retrievers
  SOCAdvisorRetriever,
  MolecularOncologistRetriever,
  EmergingTreatmentsRetriever,
  WatchWaitRetriever,
  WholePersonRetriever,
  // Types
  type RetrievalRequest,
  type RetrievalResponse,
  type RetrieverConfig,
} from './persona-rag'
