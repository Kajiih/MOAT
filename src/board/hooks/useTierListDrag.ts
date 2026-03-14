/**
 * @file useTierListDrag.ts
 * @description Hook to manage global drag and drop state using pragmatic-drag-and-drop.
 */

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { useEffect, useState } from 'react';

import { BoardDispatch, moveItem, reorderTiers } from '@/board/state/reducer';
import { TierDefinition, TierListState } from '@/board/types';
import { Item } from '@/items/items';

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
) {
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [activeTier, setActiveTier] = useState<TierDefinition | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    return monitorForElements({
      onDragStart({ source }) {
        const { type, item } = source.data;
        console.log(
          'BROWSER: BROWSER: onDragStart triggered for',
          type,
          'activeId:',
          item ? (item as Item).id : 'N/A',
        );
        if (type === 'item') {
          setActiveItem(source.data.item as Item);
        } else if (type === 'tier') {
          setActiveTier(source.data.tier as TierDefinition);
        }
      },
      onDrag({ location }) {
        if (!location.current.dropTargets.length) {
          setOverId(null);
          return;
        }

        // Find deepest drop target
        const dropTarget = location.current.dropTargets[0];
        if (dropTarget) {
          const { type, tierId, item } = dropTarget.data;
          setOverId(type === 'item' ? (item as Item).id : (tierId as string));
        }
      },
      onDrop({ source, location }) {
        setActiveItem(null);
        setActiveTier(null);
        setOverId(null);

        if (!location.current.dropTargets.length) {
          console.log('BROWSER: onDrop fired but dropped NOWHERE (0 dropTargets)');
          return; // Dropped nowhere
        }

        const dropTarget = location.current.dropTargets[0];
        console.log('BROWSER: onDrop fired into dropTarget data', JSON.stringify(dropTarget.data));
        const { type: targetType, tierId, item: targetItem } = dropTarget.data;
        const finalTargetId = targetType === 'item' ? (targetItem as Item).id : (tierId as string);

        if (source.data.type === 'item') {
          const item = source.data.item as Item;

          const activeId = item.id;
          const edge = extractClosestEdge(dropTarget.data);

          pushHistory();
          dispatch(
            moveItem({
              activeId,
              overId: finalTargetId,
              activeItem: item,
              edge,
            }),
          );
        } else if (source.data.type === 'tier') {
          const sourceTier = source.data.tier as TierDefinition;
          const targetTierId = dropTarget.data.tierId as string;

          if (sourceTier.id !== targetTierId) {
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
  }, [dispatch, pushHistory]);

  return { activeItem, activeTier, overId };
}
