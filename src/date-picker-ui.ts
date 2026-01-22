/**
 * Date Picker UI Methods
 *
 * Functions for UI-related logic including show/hide, positioning,
 * and tooltips.
 */

import { computePosition, flip, shift, offset, arrow, autoUpdate } from '@floating-ui/dom';
import { uiLogger } from './logger';
import { handleInitialMonthLoad } from './date-picker-navigation';
import { updateCalendarFromInput } from './date-picker-interaction';

// Cleanup function for autoUpdate
let cleanupAutoUpdate: (() => void) | null = null;

export function show(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') {
        return;
    }

    uiLogger.debug('show() - adding visible class');

    // Store original input value if Apply button is required (for restore on close without Apply)
    if (picker.requiresApplyButton() && picker.input) {
        picker.originalInputValue = picker.input.value;
        uiLogger.debug('show() - stored original input value:', picker.originalInputValue);
    }

    // Sync calendar selection with current input value (handles manually cleared input)
    updateCalendarFromInput(picker);

    // Render calendar on first show to avoid rendering hidden days
    if (picker.isFirstRender) {
        picker.renderCalendar();
        picker.isFirstRender = false;

        // Call beforeMonthChangedCallback for initial month load
        handleInitialMonthLoad(picker);
    }

    picker.calendar.classList.add('drp-date-picker--visible');
    picker.isCalendarActive = true; // Make calendar active when shown
    uiLogger.debug('show() - calendar classes:', picker.calendar.className);
    position(picker);

    // Start auto-updating position on scroll, resize, etc.
    cleanupAutoUpdate = autoUpdate(picker.input, picker.calendar, () => {
        position(picker);
    });

    // Note: Outside click handling is now managed by the clickEvents manager

    setTimeout(() => {
        const computedStyle = window.getComputedStyle(picker.calendar);
        uiLogger.debug('show() - computed styles - display:', computedStyle.display, 'position:', computedStyle.position, 'left:', computedStyle.left, 'top:', computedStyle.top, 'z-index:', computedStyle.zIndex);
    }, 100);
}

export function hide(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') return;

    // Only process hide if calendar is actually visible
    if (!picker.calendar.classList.contains('drp-date-picker--visible')) {
        return;
    }

    // Stop auto-updating position
    if (cleanupAutoUpdate) {
        cleanupAutoUpdate();
        cleanupAutoUpdate = null;
    }

    // Note: Outside click handling is now managed by the clickEvents manager

    picker.calendar.classList.remove('drp-date-picker--visible');
    picker.isCalendarActive = false; // Deactivate calendar when hidden

    // Restore original input value and selection state if closed without Apply
    if (picker.requiresApplyButton() && picker.pendingSelection && picker.input) {
        uiLogger.debug('hide() - restoring original input value:', picker.originalInputValue);
        // Restore input value
        if (picker.originalInputValue !== null) {
            picker.input.value = picker.originalInputValue;
        }
        // Restore committed selection state
        if (picker.options.selectionMode === 'range') {
            picker.selectedStartDate = picker.committedStartDate;
            picker.selectedEndDate = picker.committedEndDate;
        } else if (picker.options.selectionMode === 'single') {
            picker.selectedDate = picker.committedDate;
        }
        uiLogger.debug('hide() - reverted selection state');
    }

    // Clear pending selection when calendar closes
    picker.pendingSelection = null;
    // Reset all rolling selectors to closed state
    for (let i = 0; i < picker.showingRollingSelector.length; i++) {
        picker.showingRollingSelector[i] = false;
    }
    // Only render if calendar was actually shown (not first render)
    if (!picker.isFirstRender) {
        picker.renderCalendar();
    }

    // Reset locked placement so it can recalculate on next open
    // (in case user scrolled or viewport changed)
    picker.lockedPlacement = undefined;
}

export function toggle(picker: any) {
    if (picker.calendar.classList.contains('drp-date-picker--visible')) {
        hide(picker);
    } else {
        show(picker);
    }
}

export async function position(picker: any) {
    uiLogger.debug('position() - locked placement:', picker.lockedPlacement);

    if (!picker.input) {
        return;
    }

    // Use locked placement if already set, otherwise allow flip on first positioning
    const middleware = picker.lockedPlacement
        ? [offset(8), shift({ padding: 8 })] // No flip - use locked placement
        : [offset(8), flip(), shift({ padding: 8 })]; // Allow flip on first show

    const result = await computePosition(picker.input, picker.calendar, {
        placement: (picker.lockedPlacement || picker.options.calendarPlacement) as any,
        middleware
    });

    uiLogger.debug('position() - FloatingUI computed - x:', result.x, 'y:', result.y, 'placement:', result.placement);

    // Lock the placement after first positioning to prevent jumping
    if (!picker.lockedPlacement) {
        picker.lockedPlacement = result.placement;
        uiLogger.debug('position() - locked placement to:', picker.lockedPlacement);
    }

    picker.calendar.style.left = `${result.x}px`;
    picker.calendar.style.top = `${result.y}px`;
    uiLogger.debug('position() - applied styles to calendar');
}

/**
 * Show tooltip using Floating UI
 */
export async function showTooltip(picker: any, element: HTMLElement, content: string) {
    if (!picker.tooltip || !picker.tooltipArrow) return;

    picker.currentTooltipTarget = element;
    picker.tooltip.innerHTML = content; // Support HTML content
    picker.tooltip.appendChild(picker.tooltipArrow); // Re-append arrow after setting innerHTML
    picker.tooltip.classList.add('drp-date-picker__tooltip--visible');

    const { x, y, placement, middlewareData } = await computePosition(element, picker.tooltip, {
        placement: 'top',
        middleware: [
            offset(6),
            flip(),
            shift({ padding: 5 }),
            arrow({ element: picker.tooltipArrow })
        ]
    });

    // Position the tooltip
    Object.assign(picker.tooltip.style, {
        left: `${x}px`,
        top: `${y}px`
    });

    // Position the arrow
    if (middlewareData.arrow) {
        const { x: arrowX, y: arrowY } = middlewareData.arrow;

        const staticSide = {
            top: 'bottom',
            right: 'left',
            bottom: 'top',
            left: 'right'
        }[placement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left'];

        Object.assign(picker.tooltipArrow.style, {
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            right: '',
            bottom: '',
            [staticSide!]: '-4px'
        });
    }
}

/**
 * Hide tooltip
 */
export function hideTooltip(picker: any) {
    if (!picker.tooltip) return;
    picker.tooltip.classList.remove('drp-date-picker__tooltip--visible');
    picker.currentTooltipTarget = undefined;
}

/**
 * Show loading overlay during async validation
 */
export function showLoadingOverlay(picker: any): void {
    if (picker.loadingOverlay) return; // Already showing

    const overlay = document.createElement('div');
    overlay.className = 'drp-date-picker__loading-overlay';
    overlay.innerHTML = `
        <div class="drp-date-picker__loading-spinner"></div>
    `;

    picker.calendar.appendChild(overlay);
    picker.loadingOverlay = overlay;
}

/**
 * Hide loading overlay after async validation completes
 */
export function hideLoadingOverlay(picker: any): void {
    if (picker.loadingOverlay) {
        picker.loadingOverlay.remove();
        picker.loadingOverlay = undefined;
    }
}

/**
 * Show a message in the message area
 * @param picker - The date picker instance
 * @param content - Message content (plain text when type is provided, or full HTML for custom styling)
 * @param type - Optional message type. If provided, uses built-in styled alert. If omitted, content is treated as raw HTML.
 * @param autoHide - Optional auto-hide timeout in milliseconds
 */
export function showMessage(
    picker: any,
    content: string,
    type?: 'error' | 'warning' | 'info' | 'success',
    autoHide?: number
): void {
    console.log('[showMessage] content:', content, 'type:', type);

    if (!picker.messageElement) {
        console.log('[showMessage] ERROR: messageElement is null/undefined!');
        return;
    }

    // Clear any existing auto-hide timeout
    if (picker.messageAutoHideTimeout) {
        clearTimeout(picker.messageAutoHideTimeout);
        picker.messageAutoHideTimeout = undefined;
    }

    // Remove all type classes
    picker.messageElement.classList.remove(
        'drp-date-picker__message--error',
        'drp-date-picker__message--warning',
        'drp-date-picker__message--info',
        'drp-date-picker__message--success',
        'drp-date-picker__message--custom'
    );

    const textElement = picker.messageElement.querySelector('.drp-date-picker__message-text');
    if (textElement) {
        textElement.innerHTML = content;
    }

    if (type) {
        // Type provided: use built-in styled alert box
        picker.messageElement.classList.add(`drp-date-picker__message--${type}`);
    } else {
        // No type: raw HTML with full user control (minimal wrapper styling)
        picker.messageElement.classList.add('drp-date-picker__message--custom');
    }

    // Show the message
    picker.messageElement.classList.add('drp-date-picker__message--visible');

    // Set up auto-hide if specified
    if (autoHide && autoHide > 0) {
        picker.messageAutoHideTimeout = setTimeout(() => {
            hideMessage(picker);
        }, autoHide);
    }
}

/**
 * Hide the message area
 * @param picker - The date picker instance
 */
export function hideMessage(picker: any): void {
    if (!picker.messageElement) return;

    // Clear any existing auto-hide timeout
    if (picker.messageAutoHideTimeout) {
        clearTimeout(picker.messageAutoHideTimeout);
        picker.messageAutoHideTimeout = undefined;
    }

    // Hide the message
    picker.messageElement.classList.remove('drp-date-picker__message--visible');
}
