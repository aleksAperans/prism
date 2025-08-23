'use client';

import { useEffect } from 'react';

/**
 * Fix for Radix UI pointer events not working properly in certain browsers/environments.
 * 
 * This addresses the known issue where Radix UI components (Select, DropdownMenu, etc.)
 * use onPointerDown events which can be buggy in iOS Safari and other environments.
 * 
 * The fix initializes the pointer event system by adding a dummy listener.
 * 
 * @see https://github.com/radix-ui/primitives/issues/1406
 */
export function PointerEventFix() {
  useEffect(() => {
    // iOS Safari hack: trigger pointer system once
    const handlePointerDown = () => {
      // Empty handler - just needs to exist to initialize the pointer event system
    };
    
    // Add passive listener to avoid any performance issues
    document.body.addEventListener('pointerdown', handlePointerDown, { passive: true });
    
    return () => {
      document.body.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return null;
}