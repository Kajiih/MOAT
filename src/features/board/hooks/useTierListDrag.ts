/**
 * @file useTierListDrag.ts
 * @description Hook to manage global drag and drop state using pragmatic-drag-and-drop.
 */

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Edge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useEffect, useState } from 'react';

import { Item } from '@/domain/items/items';
import { EpicAnimationEvent } from '@/features/board/context';
import { BoardDispatch, moveItem, reorderTiers } from '@/features/board/state/reducer';
import {
  isDragItemData,
  isDragTierData,
  TierDefinition,
  TierListState,
} from '@/features/board/types';
import { EPIC_ANIMATION_PRESETS } from '@/features/items/animations/registry';

/**
 * Provides access to the current drag state and wires up global drop monitors
 * to trigger Redux actions for reordering and cross-tier movements.
 * @param state - The current tier list state.
 * @param dispatch - The Redux dispatch function.
 * @param pushHistory - Callback to save a history snapshot before mutation.
 * @param triggerEpic - Optional callback to trigger an epic animation.
 * @param epicProbability - Optional probability (0-100) to trigger animation.
 * @returns The current drag state including active item, tier, and over ID.
 */
export function useTierListDrag(
  state: TierListState,
  dispatch: BoardDispatch,
  pushHistory: () => void,
  triggerEpic?: (event: EpicAnimationEvent) => void,
  epicProbability?: number,
) {
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    return monitorForElements({
      onDragStart({ source }) {
        const data = source.data;
        if (isDragItemData(data)) {
          setActiveItem(data.item);
        } else if (isDragTierData(data)) {
          setActiveTier(data.tier);
        }
      },
      onDrag({ location }) {
        if (!location.current.dropTargets.length) {
          setOverId(null);
          return;
        }

        const dropTarget = location.current.dropTargets[0];
        if (dropTarget) {
          const data = dropTarget.data;
          if (isDragItemData(data)) {
            setOverId(data.item.id);
          } else if (data.type === 'tier' && typeof data.tierId === 'string') {
            setOverId(data.tierId);
          }
        }
      },
      onDrop({ source, location }) {
        setActiveItem(null);
        setActiveTier(null);
        setOverId(null);

        if (!location.current.dropTargets.length) {
          return;
        }

        const dropTarget = location.current.dropTargets[0];
        const targetData = dropTarget.data;
        let finalTargetId: string | undefined;

        if (isDragItemData(targetData)) {
          finalTargetId = targetData.item.id;
        } else if (targetData.type === 'tier' && typeof targetData.tierId === 'string') {
          finalTargetId = targetData.tierId;
        }

        if (!finalTargetId) return;

        const sourceData = source.data;
        const edge = extractClosestEdge(dropTarget.data);

        if (isDragItemData(sourceData)) {
          handleItemDrop(
            source,
            dropTarget,
            edge,
            finalTargetId,
            dispatch,
            pushHistory,
            triggerEpic,
            epicProbability,
          );
        } else if (isDragTierData(sourceData)) {
          handleTierDrop(sourceData, finalTargetId, dispatch, pushHistory);
        }
      },
    });
  }, [dispatch, pushHistory, triggerEpic, epicProbability]);

  return { activeItem, activeTier, overId };
}

/**
 * Triggers a random epic animation based on probability.
 * @param itemId - The ID of the item.
 * @param startRect - Starting bounding rect.
 * @param endRect - Ending bounding rect.
 * @param triggerEpicFn - Callback to trigger epic.
 * @param probability - Probability (0-100).
 */
function triggerRandomEpic(
  item: Item,
  startRect: DOMRect,
  endRect: DOMRect,
  triggerEpicFn?: (event: EpicAnimationEvent) => void,
  probability?: number,
) {
  if (!triggerEpicFn || probability === undefined) return;
  const prob = probability / 100;
  if (Math.random() >= prob) return;

  const epicKeys = Object.keys(EPIC_ANIMATION_PRESETS).filter((key) => key !== 'default');
  const randomAnimation = epicKeys[Math.floor(Math.random() * epicKeys.length)];

  if (randomAnimation) {
    triggerEpicFn({
      itemId: item.id,
      item,
      animationId: randomAnimation,
      start: {
        top: startRect.top,
        left: startRect.left,
        width: startRect.width,
        height: startRect.height,
      },
      end: {
        top: endRect.top,
        left: endRect.left,
        width: endRect.width,
        height: endRect.height,
      },
    });
  }
}

/**
 * Handles the logic when an Item is dropped.
 * @param source - The drag source element and data.
 * @param dropTarget - The drop target element and data.
 * @param edge - The closest edge of the drop.
 * @param finalTargetId - The ID of the target tier.
 * @param dispatch - Redux dispatch function.
 * @param pushHistory - Callback to push history state.
 * @param triggerEpic - Optional callback to trigger epic animations.
 * @param epicProbability - Optional probability value for epic animations.
 */
function handleItemDrop(
  source: { element: Element; data: Record<string, unknown> },
  dropTarget: { element: Element; data: Record<string, unknown> },
  edge: Edge | null,
  finalTargetId: string,
  dispatch: BoardDispatch,
  pushHistory: () => void,
  triggerEpic?: (event: EpicAnimationEvent) => void,
  epicProbability?: number,
) {
  const item = (source.data as { item: Item }).item;
  const startRect = source.element.getBoundingClientRect();
  const dropRect = dropTarget.element.getBoundingClientRect();

  let left: number;
  let top = dropRect.top;
  if (isDragItemData(dropTarget.data)) {
    left = edge === 'left' ? dropRect.left : dropRect.right;
  } else {
    // Empty tier or append zone.
    const cardNodes = dropTarget.element.querySelectorAll('[data-testid^="item-card-"]');
    if (cardNodes.length > 0) {
      const lastCard = [...cardNodes].at(-1)!;
      const lastRect = lastCard.getBoundingClientRect();
      left = lastRect.right;
      top = lastRect.top;
    } else {
      left = dropRect.left + 8;
    }
  }

  const endRect = {
    top,
    bottom: top + startRect.height,
    height: startRect.height,
    width: startRect.width,
    left,
    right: left + startRect.width,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;

  pushHistory();
  dispatch(
    moveItem({
      activeId: item.id,
      overId: finalTargetId,
      activeItem: item,
      edge,
    }),
  );

  const sourceTierId = (source.data as { tierId?: string }).tierId;
  const targetTierId = isDragItemData(dropTarget.data)
    ? (dropTarget.data as { tierId?: string }).tierId
    : finalTargetId;

  const isSameTier = sourceTierId && targetTierId && sourceTierId === targetTierId;

  if (!isSameTier) {
    triggerRandomEpic(item, startRect, endRect, triggerEpic, epicProbability);
  }
}

/**
 * Handles the logic when a Tier is dropped.
 * @param sourceData - Drag data containing tier info.
 * @param finalTargetId - ID of target tier spot to reorder.
 * @param dispatch - Redux dispatch function.
 * @param pushHistory - Callback to push history state.
 */
function handleTierDrop(
  sourceData: Record<string, unknown>,
  finalTargetId: string,
  dispatch: BoardDispatch,
  pushHistory: () => void,
) {
  const sourceTier = (sourceData as unknown as { tier: { id: string } }).tier;

  if (sourceTier.id !== finalTargetId) {
    pushHistory();
    dispatch(
      reorderTiers({
        activeId: sourceTier.id,
        overId: finalTargetId,
      }),
    );
  }
}
