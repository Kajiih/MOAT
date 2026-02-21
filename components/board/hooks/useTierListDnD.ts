/**
 * @file useTierListDnD.ts
 * @description Custom hook encapsulating the Drag and Drop logic for the Tier List.
 * Manages sensors, collision detection strategies, and event handlers (DragStart, DragOver, DragEnd).
 * It delegates the actual state mutations to the reducer via the dispatch function.
 * @module useTierListDnD
 */

'use client';

import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Dispatch, useCallback, useRef, useState } from 'react';

import { ActionType, TierListAction } from '@/lib/state/actions';
import { MediaItem, TierDefinition, TierListState } from '@/lib/types';
import { isSearchId } from '@/lib/utils/ids';

/**
 * Manages the Drag and Drop state and event handlers for the Tier List board.
 *
 * Key features:
 * - Handles both Sortable (within tiers) and Draggable (from search) items.
 * - Manages 'active' and 'over' states for visual feedback.
 * - Updates the Tier List state on drag over and drag end events.
 * - Supports reordering of Tiers (vertical lists) and Items (horizontal cards).
 * @param state - The current Tier List state.
 * @param dispatch - Dispatcher for updating state.
 * @param pushHistory - Function to save current state to history.
 * @returns Object containing sensors, active states, and DnD event handlers.
 */
export function useTierListDnD(
  state: TierListState,
  dispatch: Dispatch<TierListAction>,
  pushHistory: () => void,
) {
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require mouse to move 5px before dragging starts (allows clicks on buttons)
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      // Require holding for 250ms before dragging starts (allows scrolling)
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      isDraggingRef.current = true;
      pushHistory();
      const { active } = e;
      if (active.data.current?.type === 'tier') {
        setActiveTier(active.data.current.tier);
      } else {
        setActiveItem(active.data.current?.mediaItem);
      }
    },
    [pushHistory],
  );

  /**
   * Handles the DragOver event.
   * Responsibilities:
   * 1. Updates the `overId` state for UI highlighting.
   * 2. Detects if an item is being dragged over a different tier.
   * 3. Dispatches MOVE_ITEM immediately to allow smooth visual updates (optimistic UI).
   *    Note: We do NOT reorder tiers here, only items.
   */
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      setOverId((over?.id as string) || null);

      if (active.data.current?.type === 'tier') return;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTierId = active.data.current?.sourceTier;
      const activeItemData = active.data.current?.mediaItem;

      // Wrap state update in setTimeout to break synchronous render loop.
      // This prevents "Maximum update depth exceeded" when dnd-kit triggers multiple DragOver events
      // within the same render cycle (due to layout shifts).
      // See: https://github.com/clauderic/dnd-kit/issues/496
      setTimeout(() => {
        if (!isDraggingRef.current) return;
        
        dispatch({
          type: ActionType.MOVE_ITEM,
          payload: {
            activeId,
            overId,
            activeTierId,
            activeItem: activeItemData,
          },
        });
      }, 0);
    },
    [dispatch],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      isDraggingRef.current = false;
      const { active, over } = event;
      setActiveItem(null);
      setActiveTier(null);
      setOverId(null);

      if (active.data.current?.type === 'tier' && over) {
        if (active.id !== over.id) {
          const oldIndex = state.tierDefs.findIndex((t) => t.id === active.id);
          const newIndex = state.tierDefs.findIndex((t) => t.id === over.id);

          dispatch({
            type: ActionType.REORDER_TIERS,
            payload: { oldIndex, newIndex },
          });
        }
        return;
      }

      const activeId = active.id as string;
      const overId = over?.id as string;

      if (activeId && overId && activeId !== overId) {
        // Final reorder to ensure consistency
        dispatch({
          type: ActionType.MOVE_ITEM,
          payload: {
            activeId,
            overId,
            activeItem: active.data.current?.mediaItem,
          },
        });
      }

      // Finalization: If the item came from search (has search- prefix), normalize its ID to the canonical MBID
      if (isSearchId(activeId) && active.data.current?.mediaItem) {
        const canonicalId = active.data.current.mediaItem.id;
        if (canonicalId && canonicalId !== activeId) {
          dispatch({
            type: ActionType.UPDATE_ITEM,
            payload: { itemId: activeId, updates: { id: canonicalId } },
          });
        }
      }
    },
    [dispatch, state.tierDefs],
  );

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveItem(null);
    setActiveTier(null);
    setOverId(null);
  }, []);

  return {
    sensors,
    activeItem,
    activeTier,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
