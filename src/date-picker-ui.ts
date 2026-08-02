/**
 * Date Picker UI Methods
 *
 * Functions for UI-related logic including show/hide, positioning,
 * and tooltips.
 */

// All positioning goes through core `@keenmate/web-components-core/positioning`:
// `anchor()` (the calendar popover + day/badge tooltips), the re-exported
// floating-ui `platform` (spread into the narrowed container-type platform),
// `getFixedPositionOffsetParent` (the containing-block heuristic), and
// `detectFixedDrift` (the drift diagnostic). daterangepicker no longer depends on
// `@floating-ui/dom` directly.
import { anchor, platform, getFixedPositionOffsetParent, detectFixedDrift } from '@keenmate/web-components-core/positioning';
import { uiLogger } from './logger';
import { handleInitialMonthLoad } from './date-picker-navigation';
import { updateCalendarFromInput } from './date-picker-interaction';
import { updateSummary } from './date-picker-rendering';
import type { LoaderTarget } from './types';

/**
 * Sanity-check that the browser placed the calendar where we told it to, warning
 * once if it drifted. The drift math + culprit identification is core's
 * (`detectFixedDrift`, SPEC §12.2) — shared with the other components; this keeps
 * only the daterangepicker-specific warning copy. `expectedX`/`expectedY` are the
 * coordinates Floating UI computed (relative to the calendar's offset parent).
 *
 * Fires at most once per picker instance to avoid flooding the console during autoUpdate.
 */
function verifyPanelLanded(picker: any, panel: HTMLElement, expectedX: number, expectedY: number): void {
    if (picker.positioningDriftWarned) return;
    const report = detectFixedDrift({
        panel,
        reference: picker.input,
        expectedX,
        expectedY,
        offsetParent: getFixedPositionOffsetParent(picker.calendar),
    });
    if (!report) return;

    picker.positioningDriftWarned = true;
    console.warn(
        `[@keenmate/web-daterangepicker] Calendar rendered ${report.driftX.toFixed(0)}px / ${report.driftY.toFixed(0)}px ` +
        `away from where the library positioned it. Most likely culprit: ${report.culpritDescription}` +
        (report.culpritCss ? ` (has ${report.culpritCss})` : '') + `.\n` +
        `An ancestor of <web-daterangepicker> establishes a fixed-positioning containing block that the library's ` +
        `heuristic doesn't recognize. Fix on your side: replace the property with \`transform: translateZ(0)\` ` +
        `on that ancestor, OR move the trigger out of that ancestor's subtree. If neither is acceptable, ` +
        `please file an issue at https://github.com/keenmate/web-daterangepicker/issues with the ancestor's computed CSS.`
    );
}

// The calendar's core anchor() handle is stored per-instance on the picker
// (`picker.calendarAnchor`) — see show()/hide()/position(). (The former
// module-level autoUpdate cleanup was shared across instances, a latent bug.)

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
    backdrop.className = 'drp__backdrop';
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

    // Open lock: refuse to (re)open. Blocks the input focus/click/pointerdown triggers
    // and typing-triggered opens alike. Closing (hide/Escape) is intentionally NOT gated,
    // so a locked picker can always be dismissed and never traps the user.
    if (picker.isAspectLocked('open')) {
        return;
    }

    // Already visible — skip. Without this guard, repeated show() calls (e.g., focus
    // fires after mousedown on the same click) overwrite originalInputValue with the
    // already-pending value and leak the autoUpdate cleanup function.
    if (picker.calendar.classList.contains('drp__picker--visible')) {
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

    // Snapshot wall-clock so renderTimePicker has a stable "now" for uncommitted
    // fields. Without this, real-time-seconds advance between renders pulls the
    // seconds roll along (and minutes/hours once enough time passes).
    // Also flag the upcoming render so each roll force-scrolls to center its
    // committed/focus value (the rolls preserve scrollTop across hide/show).
    if (picker.options.pickerMode !== 'date') {
        picker.timePickerOpenSnapshot = new Date();
        picker.forceTimePickerScroll = true;
        // Clock picker always re-opens on the hours step (Material flow). Resetting
        // here means closing on the minutes face then reopening lands the user
        // back at hours rather than mid-flow.
        picker.clockStep = 'hours';
        // Wheel picker: same idea as the rolls' forceTimePickerScroll — every open
        // re-centers the focus value in each column even if scrollTop is preserved
        // across hide/show.
        picker.forceWheelScroll = true;
    }

    // Sync calendar selection with current input value (handles manually cleared input)
    updateCalendarFromInput(picker);

    // Render calendar on first show to avoid rendering hidden days
    if (picker.isFirstRender) {
        picker.renderCalendar();
        picker.isFirstRender = false;

        // Call beforeMonthChangedCallback for initial month load
        handleInitialMonthLoad(picker);
    } else if (picker.options.pickerMode !== 'date') {
        // Time/datetime modes: re-render every open so committed values get the
        // --selected highlight applied and the rolls re-center via force-scroll.
        picker.renderCalendar();
    }

    const isModal = picker.options.positioningMode === 'modal';

    if (isModal) {
        // Modal mode: backdrop, body scroll lock, blur input to suppress mobile keyboard.
        ensureModalBackdrop(picker).classList.add('drp__backdrop--visible');
        lockBodyScroll();
        // Remember if input was focused so we can restore on close.
        if (picker.input && document.activeElement === picker.input) {
            picker.modalRestoreFocus = true;
            picker.input.blur();
        } else {
            picker.modalRestoreFocus = false;
        }
        picker.calendar.classList.add('drp__picker--modal');
    }

    picker.calendar.classList.add('drp__picker--visible');
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
        picker.calendarAnchor = anchor(picker.calendar, picker.input, {
            placement: (picker.options.calendarPlacement || 'bottom-start'),
            strategy: 'fixed',
            offset: 8,
            flipPadding: 8,
            shift: 8,
            // Cap the calendar to the viewport-available height (it scrolls its
            // months area internally); header/action bar stay pinned.
            maxHeight: { padding: 8 },
            // Narrow the containing-block heuristic to what browsers honour for
            // `position: fixed` (ignore contain/container-type — the pure-admin
            // `.pa-layout__main` case); measure the FLOATING element's parent.
            platform: { ...platform, getOffsetParent: () => getFixedPositionOffsetParent(picker.calendar) },
            // The calendar's OWN size changes must not re-trigger a reposition
            // (resize→reposition→re-hover loop); reposition only on scroll/ancestor moves.
            autoUpdateOptions: { elementResize: false },
            // One-shot drift warning if an unrecognized ancestor CB still shifts the panel.
            onComputed: ({ x, y }) => verifyPanelLanded(picker, picker.calendar, x, y),
        });

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
            const monthsContainer = cal.querySelector('.drp__months, .drp__months--grid') as HTMLElement | null;
            const monthsRect = monthsContainer?.getBoundingClientRect();
            const months = cal.querySelectorAll('.drp__month');
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
                containerQueryActive: cal.matches(':is(.drp__picker--modal)') &&
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
    if (!picker.calendar.classList.contains('drp__picker--visible')) {
        return;
    }

    const isModal = picker.options.positioningMode === 'modal';

    // Stop auto-updating position (floating mode only — modal never registers it)
    if (picker.calendarAnchor) {
        picker.calendarAnchor.destroy();
        picker.calendarAnchor = null;
    }

    if (viewportResizeHandler) {
        window.removeEventListener('resize', viewportResizeHandler);
        viewportResizeHandler = null;
    }

    if (isModal) {
        if (picker.modalBackdrop) {
            picker.modalBackdrop.classList.remove('drp__backdrop--visible');
        }
        unlockBodyScroll();
        picker.calendar.classList.remove('drp__picker--modal');
        // Restore focus to the input if it was focused before opening — the user
        // is back in the input flow and may want to type or Tab away.
        if (picker.modalRestoreFocus && picker.input) {
            picker.input.focus();
        }
        picker.modalRestoreFocus = false;
    }

    // Note: Outside click handling is now managed by the clickEvents manager

    picker.calendar.classList.remove('drp__picker--visible');
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
            picker._selectedStartDate = picker.committedStartDate;
            picker._selectedEndDate = picker.committedEndDate;
            // Restore the committed multi-range result (empty for a plain range).
            picker._selectedRanges = (picker.committedRanges || []).map((r: any) => ({
                start: new Date(r.start),
                end: new Date(r.end)
            }));
        } else if (picker.options.selectionMode === 'single') {
            picker._selectedDate = picker.committedDate;
        }
        // Time/datetime modes also revert the per-field time selection.
        if (picker.options.pickerMode !== 'date') {
            picker._selectedTime = picker.committedTime ? { ...picker.committedTime } : null;
        }
        uiLogger.debug('hide() - reverted selection state');
    }

    // Clear pending selection when calendar closes
    picker.pendingSelection = null;
    // Drop the wall-clock snapshot so the next open captures a fresh "now".
    picker.timePickerOpenSnapshot = null;
    // Reset all rolling selectors to closed state
    for (let i = 0; i < picker.rollingSelectorOpenByColumn.length; i++) {
        picker.rollingSelectorOpenByColumn[i] = false;
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
    if (picker.calendar.classList.contains('drp__picker--visible')) {
        hide(picker);
    } else {
        show(picker);
    }
}

/**
 * Recompute the calendar's floating position now. The placement / middleware /
 * platform / drift-check all live on the core `anchor()` handle created in
 * show() (`picker.calendarAnchor`); this just asks it to update. No-op in modal
 * mode (CSS-centered, no anchor) or before the calendar is shown.
 */
export function position(picker: any) {
    if (!picker.input) return;
    if (picker.options.positioningMode === 'modal') return;
    picker.calendarAnchor?.update();
}

/**
 * Show tooltip using Floating UI
 */
export function showTooltip(picker: any, element: HTMLElement, content: string) {
    if (!picker.tooltip || !picker.tooltipArrow) return;

    picker.currentTooltipTarget = element;
    picker.tooltip.innerHTML = content; // Support HTML content
    picker.tooltip.appendChild(picker.tooltipArrow); // Re-append arrow after setting innerHTML
    picker.tooltip.classList.add('drp__tooltip--visible');

    // Position via core anchor() — offset/flip/shift + arrow, plus the narrowed
    // container-type platform. Measure the FLOATING element's (the tooltip's)
    // offset parent, NOT the reference `element`: a badge cell is itself a
    // fixed-positioning containing block (`transform` on hover), so measuring the
    // reference would return badge-relative coordinates that render off-screen.
    // The day/badge tooltip reuses ONE shared element across cells (event
    // delegation), so replace any prior anchor. autoUpdate:false = single compute,
    // matching the previous one-shot behaviour (the tooltip lives only while hovered).
    picker.tooltipAnchor?.destroy();
    picker.tooltipAnchor = anchor(picker.tooltip, element, {
        placement: 'top',
        strategy: 'fixed',
        offset: 6,
        shift: 5,
        arrow: { element: picker.tooltipArrow },
        platform: { ...platform, getOffsetParent: () => getFixedPositionOffsetParent(picker.tooltip) },
        autoUpdate: false,
    });
}

/**
 * Hide tooltip
 */
export function hideTooltip(picker: any) {
    if (!picker.tooltip) return;
    picker.tooltipAnchor?.destroy();
    picker.tooltipAnchor = undefined;
    picker.tooltip.classList.remove('drp__tooltip--visible');
    picker.currentTooltipTarget = undefined;
}

/**
 * Resolve the DOM element a loader mounts into for a given target.
 */
function resolveLoaderMount(picker: any, target: LoaderTarget): HTMLElement | null {
    switch (target) {
        case 'message':
            return (picker.messageElement?.querySelector('.drp__message-text') as HTMLElement | null)
                || picker.messageElement || null;
        case 'summary':
            return picker.summaryElement
                || (picker.calendar?.querySelector('.drp__summary') as HTMLElement | null)
                || null;
        case 'calendar':
        default:
            return picker.calendar || null;
    }
}

function summaryBlock(picker: any): HTMLElement | null {
    return picker.summaryElement
        || (picker.calendar?.querySelector('.drp__summary') as HTMLElement | null)
        || null;
}

/**
 * Show a loader (spinner). Scoped by `target`:
 * - 'calendar' (default): full-calendar overlay (also used automatically around async gates)
 * - 'message' / 'summary': an in-block spinner inside that feedback block
 *
 * Single-instance per target: a second call for the same target is a no-op, so a manual
 * showLoader('calendar') and an in-flight async validation cannot stack two overlays.
 */
export function showLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (!picker.loaders) picker.loaders = {};
    if (picker.loaders[target]) return; // already showing for this target

    const mount = resolveLoaderMount(picker, target);
    if (!mount) {
        uiLogger.warn(`showLoader() - mount for target '${target}' not found`);
        return;
    }

    if (target === 'calendar') {
        const overlay = document.createElement('div');
        overlay.className = 'drp__loader-overlay';
        overlay.innerHTML = `<div class="drp__loader"></div>`;
        mount.appendChild(overlay);
        picker.loaders[target] = overlay;
        return;
    }

    // In-block spinner (message / summary)
    const spinner = document.createElement('span');
    spinner.className = 'drp__inline-loader';
    if (target === 'message' && picker.messageElement) {
        picker.messageElement.classList.add('drp__message--loading', 'drp__message--visible');
    } else if (target === 'summary') {
        // Force the summary visible so an empty (no-range) block is tall enough for the spinner
        summaryBlock(picker)?.classList.add('drp__summary--loading', 'drp__summary--visible');
    }
    mount.appendChild(spinner);
    picker.loaders[target] = spinner;
}

/**
 * Hide the loader for the given target (default 'calendar').
 */
export function hideLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (!picker.loaders || !picker.loaders[target]) return;
    picker.loaders[target].remove();
    picker.loaders[target] = undefined;

    if (target === 'message' && picker.messageElement) {
        picker.messageElement.classList.remove('drp__message--loading');
    } else if (target === 'summary') {
        summaryBlock(picker)?.classList.remove('drp__summary--loading');
    }
}

/**
 * Toggle the loader for the given target (default 'calendar').
 */
export function toggleLoader(picker: any, target: LoaderTarget = 'calendar'): void {
    if (picker.loaders?.[target]) {
        hideLoader(picker, target);
    } else {
        showLoader(picker, target);
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
        'drp__message--error',
        'drp__message--warning',
        'drp__message--info',
        'drp__message--success',
        'drp__message--custom'
    );

    const textElement = picker.messageElement.querySelector('.drp__message-text');
    if (textElement) {
        textElement.innerHTML = content;
    }

    if (type) {
        // Type provided: use built-in styled alert box
        picker.messageElement.classList.add(`drp__message--${type}`);
    } else {
        // No type: raw HTML with full user control (minimal wrapper styling)
        picker.messageElement.classList.add('drp__message--custom');
    }

    // Show the message
    picker.messageElement.classList.add('drp__message--visible');

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
    picker.messageElement.classList.remove('drp__message--visible');
}

/**
 * Toggle the message area. If currently visible, hide it; otherwise show `content`.
 */
export function toggleMessage(
    picker: any,
    content: string = '',
    type?: 'error' | 'warning' | 'info' | 'success',
    autoHide?: number
): void {
    if (picker.messageElement?.classList.contains('drp__message--visible')) {
        hideMessage(picker);
    } else {
        showMessage(picker, content, type, autoHide);
    }
}

/**
 * Write custom HTML into the summary block. The content is pinned as an override that
 * survives re-renders (including hover preview) until the next selection change — mirroring
 * how showMessage "sticks". Use for async-derived summaries (e.g. a fetched price).
 */
export function showSummary(picker: any, content: string): void {
    picker.summaryOverride = content;
    updateSummary(picker);
}

/**
 * Drop any summary override and re-derive the summary from current selection state
 * (the block auto-hides when no range is selected).
 */
export function hideSummary(picker: any): void {
    picker.summaryOverride = null;
    updateSummary(picker);
}
