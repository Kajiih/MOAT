/**
 * @file useTierListDrag.ts
 * @description Hook to manage global drag and drop state using pragmatic-drag-and-drop.
 */

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
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
        if (isDragItemData(sourceData)) {
          const item = sourceData.item;
          const edge = extractClosestEdge(dropTarget.data);

          const startRect = source.element.getBoundingClientRect();
          const endRect = dropTarget.element.getBoundingClientRect();

          pushHistory();
          dispatch(
            moveItem({
              activeId: item.id,
              overId: finalTargetId,
              activeItem: item,
              edge,
            }),
          );

          if (triggerEpic && epicProbability !== undefined) {
            const prob = epicProbability / 100;
            if (Math.random() < prob) {
              const epicKeys = Object.keys(EPIC_ANIMATION_PRESETS).filter(
                (key) => key !== 'default',
              );
              const randomAnimation = epicKeys[Math.floor(Math.random() * epicKeys.length)];

              if (randomAnimation) {
                triggerEpic({
                  itemId: item.id,
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
          }
        } else if (isDragTierData(sourceData)) {
          const sourceTier = sourceData.tier;

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
      },
    });
  }, [dispatch, pushHistory, triggerEpic, epicProbability]);

  return { activeItem, activeTier, overId };
}
