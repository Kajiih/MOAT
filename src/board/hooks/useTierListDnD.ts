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
import { Item } from '@/items/items';

function getCanonicalId(dndId: string | null | undefined, dataItem: Item | undefined): string | null {
  if (!dndId) return null;
  if (dataItem?.id) return dataItem.id;
  // Fallback for tiers or unknown
  return dndId;
}

/**
 * Manages the Drag and Drop state and event handlers for the Tier List board.
 * @param state - The current tier list state.
 * @param dispatch - The dispatch function for tier list actions.
 * @param pushHistory - Callback to push the current state to the history stack.
 * @returns The Drag and Drop event handlers and sensors.
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
        setActiveItem(active.data.current?.item);
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

      const activeTierId = active.data.current?.sourceTier;
      const activeItemData = active.data.current?.item;

      const activeId = getCanonicalId(active.id as string, activeItemData) as string;
      const overId = over.id as string;

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

      const activeItemData = active.data?.current?.item;
      const activeId = getCanonicalId(active.id as string, activeItemData) as string;
      // We don't strip overId, because over could be a Tier (id: 'tier-1') or an Item (id: 'board-...')
      // But items on the board don't trigger Drop properly if we use canonical ID for overId,
      // because the DOM node has the prefixed ID. Wait, actually `overId` goes to the reducer!
      // The reducer needs canonical IDs for both.
      // We will also strip the overId if it's an item.
      const overItemData = over?.data?.current?.item;
      const overId = getCanonicalId(over?.id as string, overItemData) as string;

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
