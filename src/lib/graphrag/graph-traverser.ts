/**
 * Graph Traverser for OpenCancer.ai GraphRAG
 *
 * Multi-hop graph traversal from patient entities to discover related context.
 * Uses both explicit entity_relationships and the traverse_patient_graph RPC.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  TraversalConfig,
  TraversalResult,
  PCORelatedEntity,
  EntityType,
  RelationshipType,
  PatientEntityRow,
  EntityRelationshipRow
} from './types'

// ============================================================================
// Supabase Client
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://felofmlhqwcdpiyjgstx.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

let supabaseInstance: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_KEY)
  }
  return supabaseInstance
}

// ============================================================================
// Graph Traversal Functions
// ============================================================================

export interface TraverseFromEntitiesOptions {
  entityIds: string[]
  config: TraversalConfig
}

/**
 * Traverse the graph starting from a set of entity IDs
 * Returns all reachable entities within the configured hop distance
 */
export async function traverseFromEntities(
  options: TraverseFromEntitiesOptions
): Promise<TraversalResult[]> {
  const { entityIds, config } = options
  const {
    max_hops = 2,
    include_types,
    min_confidence = 0.5,
    max_results = 100
  } = config

  if (entityIds.length === 0) {
    return []
  }

  const supabase = getSupabase()
  const results: TraversalResult[] = []
  const visited = new Set<string>(entityIds) // Don't revisit starting entities
  const queue: Array<{ id: string; hop: number; path: string[]; relTypes: RelationshipType[] }> = []

  // Initialize queue with starting entities at hop 0
  for (const id of entityIds) {
    queue.push({ id, hop: 0, path: [id], relTypes: [] })
  }

  // BFS traversal
  while (queue.length > 0 && results.length < max_results) {
    const current = queue.shift()!

    if (current.hop >= max_hops) {
      continue
    }

    // Fetch relationships for current entity
    const { data: relationships, error } = await supabase
      .from('entity_relationships')
      .select(`
        id,
        entity_a_id,
        entity_b_id,
        relationship_type,
        confidence
      `)
      .or(`entity_a_id.eq.${current.id},entity_b_id.eq.${current.id}`)
      .gte('confidence', min_confidence)

    if (error) {
      console.error('Error fetching relationships:', error)
      continue
    }

    if (!relationships || relationships.length === 0) {
      continue
    }

    // Get all related entity IDs
    const relatedIds = relationships
      .map(rel => rel.entity_a_id === current.id ? rel.entity_b_id : rel.entity_a_id)
      .filter(id => !visited.has(id))

    if (relatedIds.length === 0) {
      continue
    }

    // Fetch entity details
    const { data: entities } = await supabase
      .from('patient_entities')
      .select('id, entity_type, entity_value, confidence')
      .in('id', relatedIds)

    if (!entities) {
      continue
    }

    // Process each related entity
    for (const entity of entities as PatientEntityRow[]) {
      // Skip if we've already visited this entity
      if (visited.has(entity.id)) {
        continue
      }

      // Skip if we're filtering by type and this doesn't match
      if (include_types && !include_types.includes(entity.entity_type as EntityType)) {
        continue
      }

      visited.add(entity.id)

      // Find the relationship that connects this entity
      const rel = relationships.find(r =>
        r.entity_a_id === entity.id || r.entity_b_id === entity.id
      )

      const newPath = [...current.path, entity.id]
      const newRelTypes = rel
        ? [...current.relTypes, rel.relationship_type as RelationshipType]
        : current.relTypes

      // Add to results
      results.push({
        entity_id: entity.id,
        entity_type: entity.entity_type as EntityType,
        entity_value: entity.entity_value,
        hop: current.hop + 1,
        path: newPath,
        relationship_types: newRelTypes,
        confidence: entity.confidence * (rel?.confidence || 1)
      })

      // Add to queue for further traversal
      if (current.hop + 1 < max_hops) {
        queue.push({
          id: entity.id,
          hop: current.hop + 1,
          path: newPath,
          relTypes: newRelTypes
        })
      }
    }
  }

  // Sort by hop distance, then confidence
  return results.sort((a, b) => {
    if (a.hop !== b.hop) return a.hop - b.hop
    return b.confidence - a.confidence
  })
}

/**
 * Use the database's traverse_patient_graph RPC if available
 * Falls back to manual traversal if RPC fails
 */
export async function traverseViaRPC(
  startType: string,
  startId: string,
  maxHops: number = 2
): Promise<TraversalResult[]> {
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase.rpc('traverse_patient_graph', {
      start_type: startType,
      start_id: startId,
      max_hops: Math.min(maxHops, 3)
    })

    if (error) {
      console.warn('traverse_patient_graph RPC failed, using manual traversal:', error.message)
      // Fall back to manual traversal
      return traverseFromEntities({
        entityIds: [startId],
        config: { max_hops: maxHops }
      })
    }

    // Transform RPC results to TraversalResult format
    return (data || []).map((row: Record<string, unknown>) => ({
      entity_id: row.entity_id as string,
      entity_type: row.entity_type as EntityType,
      entity_value: row.entity_value as string,
      hop: row.hop as number || 1,
      path: row.path as string[] || [],
      relationship_types: row.relationship_types as RelationshipType[] || [],
      confidence: row.confidence as number || 0.9
    }))
  } catch (err) {
    console.error('RPC traversal error:', err)
    return []
  }
}

/**
 * Expand a PCO with additional related entities from graph traversal
 */
export async function expandWithGraphContext(
  startingEntities: Array<{ id: string; type: EntityType; value: string }>,
  config: TraversalConfig = { max_hops: 2, min_confidence: 0.5, max_results: 50 }
): Promise<PCORelatedEntity[]> {
  const entityIds = startingEntities.map(e => e.id)

  const traversalResults = await traverseFromEntities({
    entityIds,
    config
  })

  // Convert TraversalResult to PCORelatedEntity
  return traversalResults.map(result => ({
    entity_id: result.entity_id,
    entity_type: result.entity_type,
    entity_value: result.entity_value,
    relationship: result.relationship_types[result.relationship_types.length - 1] || 'indicates',
    relationship_direction: 'outgoing' as const, // Could be refined with more context
    confidence: result.confidence,
    hop_distance: result.hop
  }))
}

/**
 * Find all paths between two entities
 * Useful for understanding why two entities are related
 */
export async function findPaths(
  sourceId: string,
  targetId: string,
  maxHops: number = 3
): Promise<Array<{ path: string[]; relationship_types: RelationshipType[] }>> {
  const results = await traverseFromEntities({
    entityIds: [sourceId],
    config: { max_hops: maxHops, max_results: 500 }
  })

  // Find all paths that end at the target
  return results
    .filter(r => r.entity_id === targetId)
    .map(r => ({
      path: r.path,
      relationship_types: r.relationship_types
    }))
}

/**
 * Get the immediate neighbors of an entity
 */
export async function getNeighbors(
  entityId: string,
  relationshipTypes?: RelationshipType[]
): Promise<Array<{ entity: PatientEntityRow; relationship: RelationshipType; direction: 'in' | 'out' }>> {
  const supabase = getSupabase()

  let query = supabase
    .from('entity_relationships')
    .select('*')
    .or(`entity_a_id.eq.${entityId},entity_b_id.eq.${entityId}`)

  const { data: relationships, error } = await query

  if (error || !relationships) {
    return []
  }

  // Filter by relationship type if specified
  const filtered = relationshipTypes
    ? relationships.filter(r => relationshipTypes.includes(r.relationship_type as RelationshipType))
    : relationships

  // Get the neighbor entity IDs
  const neighborIds = filtered.map(rel =>
    rel.entity_a_id === entityId ? rel.entity_b_id : rel.entity_a_id
  )

  if (neighborIds.length === 0) {
    return []
  }

  // Fetch neighbor entities
  const { data: entities } = await supabase
    .from('patient_entities')
    .select('*')
    .in('id', neighborIds)

  if (!entities) {
    return []
  }

  // Build result with relationship info
  return entities.map(entity => {
    const rel = filtered.find(r =>
      r.entity_a_id === entity.id || r.entity_b_id === entity.id
    )
    return {
      entity: entity as PatientEntityRow,
      relationship: rel?.relationship_type as RelationshipType || 'indicates',
      direction: rel?.entity_a_id === entityId ? 'out' : 'in'
    }
  })
}

/**
 * Calculate graph statistics for a patient
 */
export async function getPatientGraphStats(
  userId?: string | null,
  sessionId?: string
): Promise<{
  entity_count: number
  relationship_count: number
  entity_types: Record<string, number>
  avg_relationships_per_entity: number
}> {
  if (!userId && !sessionId) {
    return {
      entity_count: 0,
      relationship_count: 0,
      entity_types: {},
      avg_relationships_per_entity: 0
    }
  }

  const supabase = getSupabase()

  // Get entities
  let entityQuery = supabase.from('patient_entities').select('id, entity_type')
  if (userId) {
    entityQuery = entityQuery.or(`user_id.eq.${userId},session_id.eq.${sessionId}`)
  } else {
    entityQuery = entityQuery.eq('session_id', sessionId)
  }

  const { data: entities } = await entityQuery

  if (!entities || entities.length === 0) {
    return {
      entity_count: 0,
      relationship_count: 0,
      entity_types: {},
      avg_relationships_per_entity: 0
    }
  }

  // Count by type
  const entityTypes: Record<string, number> = {}
  for (const e of entities) {
    entityTypes[e.entity_type] = (entityTypes[e.entity_type] || 0) + 1
  }

  // Get relationship count
  const entityIds = entities.map(e => e.id)
  const { count: relationshipCount } = await supabase
    .from('entity_relationships')
    .select('*', { count: 'exact', head: true })
    .or(`entity_a_id.in.(${entityIds.join(',')}),entity_b_id.in.(${entityIds.join(',')})`)

  return {
    entity_count: entities.length,
    relationship_count: relationshipCount || 0,
    entity_types: entityTypes,
    avg_relationships_per_entity: entities.length > 0
      ? (relationshipCount || 0) / entities.length
      : 0
  }
}
