"use client";

import React from "react";

/**
 * MapControlsContainer (Unified Layout)
 * 
 * A master container for the map's bottom UI layer.
 * Implements "Industry Standard" Responsive Layout:
 * 
 * - **Mobile (Sheet Mode)**:
 *   - Layout: Vertical Stack (Bottom-Up).
 *   - Structure: [Card (Bottom)] -> [Controls Row (Top)].
 *   - Behavior: The Card pushes the ENTIRE Controls Row (Left + Right) up.
 *     This ensures Recenter/Chat buttons never overlap the Sheet.
 * 
 * - **Desktop (Panel Mode)**:
 *   - Layout: Hybrid.
 *   - Right Side: Stacks [Card] -> [Right Controls]. Card (Panel) pushes Right Controls up.
 *   - Left Side: PINNED. The Left Controls (Recenter) break out of the stack (`fixed`) 
 *     to stay at the bottom-left corner, unaffected by the Right Panel.
 * 
 * @param {ReactNode} leftControls - Recenter, Fullscreen (Left Side)
 * @param {ReactNode} rightControls - Chat, Compass (Right Side)
 * @param {ReactNode} card - LandmarkCard (Bottom Content)
 */
export default function MapControlsContainer({
    leftControls,
    rightControls,
    card
}) {
    return (
        <div className="fixed inset-x-3 bottom-[64px] [@media(max-height:500px)_and_(orientation:landscape)]:bottom-[20px] sm:inset-x-4 z-40 pointer-events-none flex flex-col sm:flex-row items-end justify-between">

            {/* LEFT COLUMN: Controls + Card Stack 
                - Uses flex-col-reverse so Card is at bottom, Controls stack on top.
                - Card pushes Left Controls up. 
            */}
            <div className="flex flex-col-reverse items-start gap-3 pointer-events-none max-w-full sm:max-w-md">

                {/* 1. Landmark Card (Bottom) */}
                <div className="pointer-events-auto w-full sm:w-auto transition-all duration-300">
                    {card}
                </div>

                {/* 2. Left Controls (Top of Stack) */}
                <div className="pointer-events-auto flex flex-col gap-3 items-start sm:pl-1">
                    {leftControls}
                </div>
            </div>

            {/* RIGHT COLUMN: Right Controls 
                - Independent stack.
                - Fixed to bottom-right (via flex justify-between of parent).
                - NOT affected by Card heigth changes.
            */}
            <div className="pointer-events-auto flex flex-col gap-3 items-end pb-3">
                {rightControls}
            </div>

        </div>
    );
}
