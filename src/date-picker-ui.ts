/**
 * Date Picker UI Methods
 *
 * Functions for UI-related logic including show/hide, positioning,
 * and tooltips.
 */

import { computePosition, flip, shift, offset, arrow, autoUpdate, size } from '@floating-ui/dom';
import { uiLogger } from './logger';
import { handleInitialMonthLoad } from './date-picker-navigation';
import { updateCalendarFromInput } from './date-picker-interaction';

// Cleanup function for autoUpdate
let cleanupAutoUpdate: (() => void) | null = null;

// Window resize handler — registered in floating mode so we can close on
// viewport changes (since elementResize is disabled on autoUpdate, the picker
// wouldn't otherwise adapt to a smaller/larger viewport).
let viewportResizeHandler: (() => void) | null = null;

// Tracks the prior body overflow value so multiple modal pickers don't fight
// over restoring it. We only set the body to hidden when the count goes 0→1
// and only restore when it goes back to 0.
let modalLockCount = 0;
let modalPriorBodyOverflow: string | null = null;

function lockBodyScroll() {
    if (modalLockCount === 0) {
        modalPriorBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
    }
    modalLockCount++;
}

function unlockBodyScroll() {
    modalLockCount = Math.max(0, modalLockCount - 1);
    if (modalLockCount === 0) {
        document.body.style.overflow = modalPriorBodyOverflow ?? '';
        modalPriorBodyOverflow = null;
    }
}

function ensureModalBackdrop(picker: any): HTMLElement {
    if (picker.modalBackdrop) return picker.modalBackdrop;
    const backdrop = document.createElement('div');
    backdrop.className = 'drp-date-picker__backdrop';
    backdrop.addEventListener('click', () => {
        uiLogger.debug('Backdrop clicked - closing modal');
        hide(picker);
    });
    picker.containerElement.appendChild(backdrop);
    picker.modalBackdrop = backdrop;
    return backdrop;
}

export function show(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') {
        return;
    }

    // Already visible — skip. Without this guard, repeated show() calls (e.g., focus
    // fires after mousedown on the same click) overwrite originalInputValue with the
    // already-pending value and leak the autoUpdate cleanup function.
    if (picker.calendar.classList.contains('drp-date-picker--visible')) {
        return;
    }

    // Disabled input — refuse to open. The browser already blocks a real
    // user click on a disabled input, but programmatic clicks, focus calls,
    // and some a11y tools can still dispatch events. Guard show() so the
    // `disabled` setter on the host element fully suppresses opening.
    if (picker.input?.disabled) {
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

    const isModal = picker.options.positioningMode === 'modal';

    if (isModal) {
        // Modal mode: backdrop, body scroll lock, blur input to suppress mobile keyboard.
        ensureModalBackdrop(picker).classList.add('drp-date-picker__backdrop--visible');
        lockBodyScroll();
        // Remember if input was focused so we can restore on close.
        if (picker.input && document.activeElement === picker.input) {
            picker.modalRestoreFocus = true;
            picker.input.blur();
        } else {
            picker.modalRestoreFocus = false;
        }
        picker.calendar.classList.add('drp-date-picker--modal');
    }

    picker.calendar.classList.add('drp-date-picker--visible');
    picker.setCalendarActive(); // Make calendar active and deactivate other pickers
    uiLogger.debug('show() - calendar classes:', picker.calendar.className);

    if (!isModal) {
        // Floating mode: anchor positioning + auto-reposition on scroll/resize.
        // elementResize disabled so the calendar's *own* size changes (e.g. a
        // custom formatSummaryCallback rendering 2 vs 3 lines on hover) don't
        // re-run position(). With a flipped placement the new top would be
        // inputTop − newHeight − offset, sliding the calendar upward and the
        // hovered day with it — which lands the cursor on a different day,
        // re-fires hover, and loops. Anchor once, let the bottom grow downward.
        position(picker);
        cleanupAutoUpdate = autoUpdate(picker.input, picker.calendar, () => {
            position(picker);
        }, { elementResize: false });

        // Close on viewport resize (in either direction). With elementResize
        // off, we can't gracefully adapt to a smaller/larger window, so just
        // dismiss the picker and let the user reopen it in the new viewport.
        viewportResizeHandler = () => hide(picker);
        window.addEventListener('resize', viewportResizeHandler);
    } else {
        // Modal mode is centered purely via CSS — no Floating UI involvement.
        // Log actual dimensions so we can diagnose width-collapse issues.
        // Defer to next frame so layout has flushed.
        requestAnimationFrame(() => {
            const cal = picker.calendar as HTMLElement;
            const cs = getComputedStyle(cal);
            const rect = cal.getBoundingClientRect();
            const monthsContainer = cal.querySelector('.drp-date-picker__months, .drp-date-picker__months--grid') as HTMLElement | null;
            const monthsRect = monthsContainer?.getBoundingClientRect();
            const months = cal.querySelectorAll('.drp-date-picker__month');
            const visibleMonths = Array.from(months).filter(m => getComputedStyle(m as Element).display !== 'none');
            // Use raw console.warn so this is visible without needing to call enableLogging().
            // Remove this block once the modal width issue is diagnosed.
            console.warn('[drp modal-debug] show() — modal sizing report', {
                viewport: `${window.innerWidth}×${window.innerHeight}`,
                modalCssWidth: cs.width,
                modalCssMaxWidth: cs.maxWidth,
                modalCssMinWidth: cs.minWidth,
                modalRectWidth: rect.width,
                modalRectHeight: rect.height,
                monthsContainerClass: monthsContainer?.className,
                monthsContainerWidth: monthsRect?.width,
                monthsContainerCssWidth: monthsContainer ? getComputedStyle(monthsContainer).width : null,
                totalMonthEls: months.length,
                visibleMonthEls: visibleMonths.length,
                firstMonthCssMinWidth: months[0] ? getComputedStyle(months[0] as Element).minWidth : null,
                firstMonthRectWidth: months[0] ? (months[0] as HTMLElement).getBoundingClientRect().width : null,
                containerQueryActive: cal.matches(':is(.drp-date-picker--modal)') &&
                    rect.width <= 600,
                mediaQueryTier:
                    window.matchMedia('(max-width: 480px)').matches ? 'xs' :
                    window.matchMedia('(min-width: 481px) and (max-width: 640px)').matches ? 'sm' :
                    window.matchMedia('(min-width: 641px) and (max-width: 768px)').matches ? 'md' :
                    window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches ? 'lg' :
                    window.matchMedia('(min-width: 1025px)').matches ? 'xl' : '?',
            });
        });
    }

    // Note: Outside click handling is now managed by the clickEvents manager
}

export function hide(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') return;

    // Only process hide if calendar is actually visible
    if (!picker.calendar.classList.contains('drp-date-picker--visible')) {
        return;
    }

    const isModal = picker.options.positioningMode === 'modal';

    // Stop auto-updating position (floating mode only — modal never registers it)
    if (cleanupAutoUpdate) {
        cleanupAutoUpdate();
        cleanupAutoUpdate = null;
    }

    if (viewportResizeHandler) {
        window.removeEventListener('resize', viewportResizeHandler);
        viewportResizeHandler = null;
    }

    if (isModal) {
        if (picker.modalBackdrop) {
            picker.modalBackdrop.classList.remove('drp-date-picker__backdrop--visible');
        }
        unlockBodyScroll();
        picker.calendar.classList.remove('drp-date-picker--modal');
        // Restore focus to the input if it was focused before opening — the user
        // is back in the input flow and may want to type or Tab away.
        if (picker.modalRestoreFocus && picker.input) {
            picker.input.focus();
        }
        picker.modalRestoreFocus = false;
    }

    // Note: Outside click handling is now managed by the clickEvents manager

    picker.calendar.classList.remove('drp-date-picker--visible');
    picker.isCalendarActive = false; // Deactivate calendar when hidden
    picker.hoverPreviewEnd = null;

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

    // Clear the size-middleware constraints so the next open starts fresh.
    picker.calendar.style.maxHeight = '';
    picker.calendar.style.overflowY = '';
}

export function toggle(picker: any) {
    if (picker.calendar.classList.contains('drp-date-picker--visible')) {
        hide(picker);
    } else {
        show(picker);
    }
}

export async function position(picker: any) {
    if (!picker.input) {
        return;
    }

    // Modal mode is centered via CSS — Floating UI shouldn't touch its position.
    if (picker.options.positioningMode === 'modal') {
        return;
    }

    // Always allow flip on every reposition. Previously the resolved placement was
    // cached after the first compute to prevent "jitter" during autoUpdate, but
    // the cache had a worse failure mode: if the first computePosition read the
    // calendar before its layout flushed (height = 0), flip wrongly concluded it
    // fit below, locked there, and the calendar opened off-screen for the rest of
    // the session. Rely on Floating UI's own scroll-debouncing inside autoUpdate.
    const result = await computePosition(picker.input, picker.calendar, {
        placement: (picker.options.calendarPlacement || 'bottom-start') as any,
        strategy: 'fixed',
        middleware: [
            offset(8),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            // Cap calendar height to whatever the viewport allows on the chosen side.
            // Scrolling is handled by the inner months container via the flex-column
            // layout in `_base.css` — the calendar itself uses `overflow: hidden` so
            // header and action bar stay pinned while the months area scrolls.
            size({
                padding: 8,
                apply({ availableHeight, elements }) {
                    elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
                },
            }),
        ],
    });

    uiLogger.debug('position() - x:', result.x, 'y:', result.y, 'placement:', result.placement);

    picker.calendar.style.left = `${result.x}px`;
    picker.calendar.style.top = `${result.y}px`;
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
        strategy: 'fixed',
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
    if (!picker.messageElement) {
        uiLogger.warn('showMessage() - messageElement is null/undefined');
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
