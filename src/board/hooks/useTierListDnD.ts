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

import { ActionType, TierListAction } from '@/board/state/actions';
import { TierDefinition, TierListState } from '@/board/types';
import { Item } from '@/items/schemas';
import { isSearchId } from '@/lib/ids';

/**
 * Manages the Drag and Drop state and event handlers for the Tier List board.
 * @param state
 * @param dispatch
 * @param pushHistory
 */
export function useTierListDnD(
  state: TierListState,
  dispatch: Dispatch<TierListAction>,
  pushHistory: () => void,
) {
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
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
        // Support both item (V1) and standardItem (V2) in data
        setActiveItem(active.data.current?.item || active.data.current?.standardItem);
      }
    },
    [pushHistory],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      setOverId((over?.id as string) || null);

      if (active.data.current?.type === 'tier') return;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeTierId = active.data.current?.sourceTier;
      const activeItemData = active.data.current?.item || active.data.current?.standardItem;

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
      const activeItemData = active.data.current?.item || active.data.current?.standardItem;

      if (activeId && overId && activeId !== overId) {
        dispatch({
          type: ActionType.MOVE_ITEM,
          payload: {
            activeId,
            overId,
            activeItem: activeItemData,
          },
        });
      }

      // Normalization check for V1 (MBID) and V2 (Identity)
      if (isSearchId(activeId) && activeItemData) {
        let canonicalId: string | undefined;
        
        if ('identity' in activeItemData) {
          // V2: item.id is already canonical or derived from identity
          canonicalId = (activeItemData as Item).id;
        } else {
          // V1: Use mbid or strip prefix
          canonicalId = (activeItemData as any).mbid || activeItemData.id.replace(/^search-/, '');
        }

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
