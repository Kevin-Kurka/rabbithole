/**
 * Operational Transform Engine for Conflict Resolution
 *
 * This module implements OT algorithms for handling concurrent edits
 * in the collaborative graph editing system.
 */

import {
  Operation,
  OperationType,
  TransformResult,
  ConflictInfo,
  IOperationalTransform
} from './interfaces';

/**
 * Main Operational Transform implementation
 * Handles transformation of concurrent operations on graph entities
 */
export class OperationalTransformEngine implements IOperationalTransform {
  /**
   * Transform an operation against another operation
   * This is the core of OT - making operations commutative
   */
  transform(
    op1: Operation,
    op2: Operation,
    priority: 'local' | 'remote' = 'remote'
  ): TransformResult {
    // Same entity check
    if (op1.entityId !== op2.entityId || op1.entityType !== op2.entityType) {
      // Operations on different entities don't conflict
      return {
        operation: op1,
        transformed: false
      };
    }

    // Handle based on operation types
    const transformKey = `${op1.type}_${op2.type}`;
    const transformer = this.transformers[transformKey];

    if (!transformer) {
      throw new Error(`No transformer for ${transformKey}`);
    }

    return transformer.call(this, op1, op2, priority);
  }

  /**
   * Transformation matrix for different operation type combinations
   */
  private transformers: Record<
    string,
    (op1: Operation, op2: Operation, priority: string) => TransformResult
  > = {
    // Insert vs Insert
    insert_insert: (op1, op2, priority) => {
      if (this.pathsEqual(op1.path, op2.path)) {
        // Same path - conflict
        if (priority === 'remote') {
          // Remote wins - transform local to no-op
          return {
            operation: { ...op1, type: OperationType.UPDATE, value: op2.value },
            transformed: true,
            conflicts: [{
              type: 'value',
              localOp: op1,
              remoteOp: op2,
              resolution: 'remote'
            }]
          };
        }
        // Local wins - keep as is
        return {
          operation: op1,
          transformed: false,
          conflicts: [{
            type: 'value',
            localOp: op1,
            remoteOp: op2,
            resolution: 'local'
          }]
        };
      }

      // Different paths - adjust position if needed
      if (this.isArrayOperation(op1) && this.isArrayOperation(op2)) {
        const pos1 = op1.position || 0;
        const pos2 = op2.position || 0;

        if (pos1 >= pos2) {
          // Adjust position due to other insert
          return {
            operation: { ...op1, position: pos1 + 1 },
            transformed: true
          };
        }
      }

      return { operation: op1, transformed: false };
    },

    // Update vs Update
    update_update: (op1, op2, priority) => {
      if (this.pathsEqual(op1.path, op2.path)) {
        // Same property being updated
        if (op1.oldValue === op2.oldValue) {
          // Both started from same value - last write wins
          if (priority === 'remote') {
            return {
              operation: { ...op1, oldValue: op2.value },
              transformed: true,
              conflicts: [{
                type: 'value',
                localOp: op1,
                remoteOp: op2,
                resolution: 'remote',
                mergedValue: op2.value
              }]
            };
          }
        } else {
          // Different starting values - merge conflict
          return {
            operation: op1,
            transformed: false,
            conflicts: [{
              type: 'value',
              localOp: op1,
              remoteOp: op2,
              resolution: 'merge',
              mergedValue: this.mergeValues(op1.value, op2.value)
            }]
          };
        }
      }

      return { operation: op1, transformed: false };
    },

    // Delete vs Update
    delete_update: (op1, op2, priority) => {
      if (this.pathsEqual(op1.path, op2.path)) {
        // Trying to delete something that was updated
        if (priority === 'remote') {
          // Update wins over delete
          return {
            operation: { ...op1, type: OperationType.UPDATE, value: null },
            transformed: true,
            conflicts: [{
              type: 'delete',
              localOp: op1,
              remoteOp: op2,
              resolution: 'remote'
            }]
          };
        }
      }
      return { operation: op1, transformed: false };
    },

    // Update vs Delete
    update_delete: (op1, op2, priority) => {
      if (this.pathsEqual(op1.path, op2.path)) {
        // Updating something that was deleted
        if (priority === 'remote') {
          // Delete wins
          return {
            operation: { ...op1, type: OperationType.DELETE },
            transformed: true,
            conflicts: [{
              type: 'delete',
              localOp: op1,
              remoteOp: op2,
              resolution: 'remote'
            }]
          };
        } else {
          // Resurrect with update
          return {
            operation: { ...op1, type: OperationType.INSERT },
            transformed: true,
            conflicts: [{
              type: 'delete',
              localOp: op1,
              remoteOp: op2,
              resolution: 'local'
            }]
          };
        }
      }
      return { operation: op1, transformed: false };
    },

    // Delete vs Delete
    delete_delete: (op1, op2, priority) => {
      if (this.pathsEqual(op1.path, op2.path)) {
        // Both deleting same thing - idempotent
        return {
          operation: { ...op1, type: OperationType.UPDATE, value: undefined },
          transformed: true
        };
      }

      // Deleting different things in array
      if (this.isArrayOperation(op1) && this.isArrayOperation(op2)) {
        const pos1 = op1.position || 0;
        const pos2 = op2.position || 0;

        if (pos1 > pos2) {
          // Adjust position due to other delete
          return {
            operation: { ...op1, position: pos1 - 1 },
            transformed: true
          };
        }
      }

      return { operation: op1, transformed: false };
    },

    // Move operations (for reordering)
    move_move: (op1, op2, priority) => {
      if (op1.entityId === op2.entityId) {
        // Moving same entity
        if (priority === 'remote') {
          // Apply remote move first, then local
          const fromPos = op1.position || 0;
          const toPos = (op1 as any).newPosition || 0;
          const otherFrom = op2.position || 0;
          const otherTo = (op2 as any).newPosition || 0;

          let adjustedFrom = fromPos;
          let adjustedTo = toPos;

          // Adjust based on other move
          if (otherFrom < fromPos) adjustedFrom--;
          if (otherTo <= toPos) adjustedTo++;

          return {
            operation: {
              ...op1,
              position: adjustedFrom,
              newPosition: adjustedTo
            } as any,
            transformed: true
          };
        }
      }
      return { operation: op1, transformed: false };
    }
  };

  /**
   * Compose multiple operations into a single operation
   */
  compose(operations: Operation[]): Operation {
    if (operations.length === 0) {
      throw new Error('Cannot compose empty operations array');
    }

    if (operations.length === 1) {
      return operations[0];
    }

    // Start with first operation
    let composed = operations[0];

    for (let i = 1; i < operations.length; i++) {
      composed = this.composeTwo(composed, operations[i]);
    }

    return composed;
  }

  /**
   * Compose two operations
   */
  private composeTwo(op1: Operation, op2: Operation): Operation {
    // If operating on different entities, cannot compose
    if (op1.entityId !== op2.entityId || op1.entityType !== op2.entityType) {
      throw new Error('Cannot compose operations on different entities');
    }

    // Composition rules based on operation types
    if (op1.type === OperationType.INSERT && op2.type === OperationType.UPDATE) {
      // Insert followed by update = insert with updated value
      return {
        ...op1,
        value: op2.value
      };
    }

    if (op1.type === OperationType.UPDATE && op2.type === OperationType.UPDATE) {
      // Update followed by update = single update with final value
      return {
        ...op1,
        value: op2.value,
        oldValue: op1.oldValue // Keep original old value
      };
    }

    if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
      // Insert followed by delete = no-op
      return {
        ...op1,
        type: OperationType.UPDATE,
        value: undefined
      };
    }

    if (op1.type === OperationType.UPDATE && op2.type === OperationType.DELETE) {
      // Update followed by delete = delete
      return {
        ...op2,
        oldValue: op1.oldValue
      };
    }

    // Default: return second operation
    return op2;
  }

  /**
   * Invert an operation (for undo functionality)
   */
  invert(operation: Operation): Operation {
    switch (operation.type) {
      case OperationType.INSERT:
        return {
          ...operation,
          type: OperationType.DELETE,
          oldValue: operation.value,
          value: undefined
        };

      case OperationType.DELETE:
        return {
          ...operation,
          type: OperationType.INSERT,
          value: operation.oldValue,
          oldValue: undefined
        };

      case OperationType.UPDATE:
        return {
          ...operation,
          value: operation.oldValue,
          oldValue: operation.value
        };

      case OperationType.MOVE:
        return {
          ...operation,
          position: (operation as any).newPosition,
          newPosition: operation.position
        } as any;

      default:
        throw new Error(`Cannot invert operation type: ${operation.type}`);
    }
  }

  /**
   * Apply an operation to a state
   */
  apply(state: any, operation: Operation): any {
    // Deep clone to avoid mutations
    const newState = this.deepClone(state);

    // Navigate to the target based on path
    let target = newState;
    const path = operation.path || [];

    for (let i = 0; i < path.length - 1; i++) {
      target = target[path[i]];
      if (!target) {
        throw new Error(`Invalid path: ${path.join('.')}`);
      }
    }

    const lastKey = path[path.length - 1];

    switch (operation.type) {
      case OperationType.INSERT:
        if (Array.isArray(target[lastKey])) {
          target[lastKey].splice(operation.position || 0, 0, operation.value);
        } else {
          target[lastKey] = operation.value;
        }
        break;

      case OperationType.UPDATE:
        target[lastKey] = operation.value;
        break;

      case OperationType.DELETE:
        if (Array.isArray(target[lastKey]) && operation.position !== undefined) {
          target[lastKey].splice(operation.position, 1);
        } else {
          delete target[lastKey];
        }
        break;

      case OperationType.MOVE:
        if (Array.isArray(target[lastKey])) {
          const item = target[lastKey].splice(operation.position!, 1)[0];
          target[lastKey].splice((operation as any).newPosition, 0, item);
        }
        break;
    }

    return newState;
  }

  /**
   * Validate an operation
   */
  validate(operation: Operation): boolean {
    // Check required fields
    if (!operation.id || !operation.type || !operation.entityType) {
      return false;
    }

    // Check operation-specific requirements
    switch (operation.type) {
      case OperationType.INSERT:
        return operation.value !== undefined;

      case OperationType.UPDATE:
        return operation.value !== undefined && operation.oldValue !== undefined;

      case OperationType.DELETE:
        return true;

      case OperationType.MOVE:
        return (
          operation.position !== undefined &&
          (operation as any).newPosition !== undefined
        );

      default:
        return false;
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Check if two paths are equal
   */
  private pathsEqual(path1?: string[], path2?: string[]): boolean {
    if (!path1 || !path2) return false;
    if (path1.length !== path2.length) return false;

    for (let i = 0; i < path1.length; i++) {
      if (path1[i] !== path2[i]) return false;
    }

    return true;
  }

  /**
   * Check if operation is on an array
   */
  private isArrayOperation(op: Operation): boolean {
    return op.position !== undefined;
  }

  /**
   * Merge two conflicting values
   */
  private mergeValues(value1: any, value2: any): any {
    // For strings, try to merge
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      // Simple strategy: concatenate with separator
      return `${value1} | ${value2}`;
    }

    // For objects, deep merge
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return { ...value1, ...value2 };
    }

    // For numbers, average
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return (value1 + value2) / 2;
    }

    // Default: last write wins
    return value2;
  }

  /**
   * Deep clone an object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }
}

/**
 * Factory function to create OT engine instance
 */
export function createOperationalTransformEngine(): IOperationalTransform {
  return new OperationalTransformEngine();
}