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
        <div className="fixed inset-x-3 bottom-[64px] [@media(max-height:500px)_and_(orientation:landscape)]:bottom-[20px] sm:inset-x-4 z-40 pointer-events-none flex flex-col justify-end">
            {/* Unified Dynamic Stack (Bottom-Up) 
                - Mobile: items-stretch (Card is Full Width).
                - Desktop: items-stretch (Card manages its own alignment via ml-auto).
            */}
            <div className="flex flex-col-reverse w-full">

                {/* 1. Landmark Card (The Driver) 
                    - Sits at the very bottom of the stack.
                    - Mobile: Full Width (stretched by default).
                    - Desktop: Auto width, Right Aligned via ml-auto on Card.
                */}
                <div className="pointer-events-auto w-full sm:w-auto transition-all duration-300">
                    {card}
                </div>

                {/* 2. Controls Row (Sits on top of Card) */}
                <div className="flex justify-between items-end w-full pb-3 transition-all duration-300">

                    {/* Left Controls Group 
                        - Mobile: Static (Inside Flex). Pushed up by Card.
                        - Desktop: Fixed (Breakout). Pins to bottom-left.
                    */}
                    <div className="pointer-events-auto flex flex-col gap-3 items-start sm:fixed sm:bottom-[80px] sm:left-4">
                        {leftControls}
                    </div>

                    {/* Right Controls Group 
                        - ml-auto ensures it stays Right even if Left Group is fixed (Desktop).
                    */}
                    <div className="pointer-events-auto flex flex-col gap-3 items-end ml-auto">
                        {rightControls}
                    </div>
                </div>

            </div>
        </div>
    );
}
