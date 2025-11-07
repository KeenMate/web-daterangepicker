/**
 * Date Picker UI Methods
 *
 * Pure functions for UI-related logic including show/hide, positioning,
 * and tooltips.
 */

import { computePosition, flip, shift, offset, arrow } from '@floating-ui/dom';

export function show(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') return;

    console.log('[DatePicker 11] Show called - adding visible class');

    // Render calendar on first show to avoid rendering hidden days
    if (picker.isFirstRender) {
        picker.renderCalendar();
        picker.isFirstRender = false;
    }

    picker.calendar.classList.add('drp-date-picker--visible');
    picker.isCalendarActive = true; // Make calendar active when shown
    console.log('[DatePicker 11a] Calendar classes:', picker.calendar.className);
    position(picker);
    setTimeout(() => {
        const computedStyle = window.getComputedStyle(picker.calendar);
        console.log('[DatePicker 11e] Calendar display:', computedStyle.display, 'position:', computedStyle.position, 'left:', computedStyle.left, 'top:', computedStyle.top, 'z-index:', computedStyle.zIndex);
    }, 100);
}

export function hide(picker: any) {
    // Skip for inline mode (always visible)
    if (picker.options.positioningMode === 'inline') return;

    // Only process hide if calendar is actually visible
    if (!picker.calendar.classList.contains('drp-date-picker--visible')) {
        return;
    }

    picker.calendar.classList.remove('drp-date-picker--visible');
    picker.isCalendarActive = false; // Deactivate calendar when hidden
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
    console.log('[DatePicker 11b] Position method called, locked placement:', picker.lockedPlacement);

    if (!picker.input) return;

    // Use locked placement if already set, otherwise allow flip on first positioning
    const middleware = picker.lockedPlacement
        ? [offset(8), shift({ padding: 8 })] // No flip - use locked placement
        : [offset(8), flip(), shift({ padding: 8 })]; // Allow flip on first show

    const result = await computePosition(picker.input, picker.calendar, {
        placement: (picker.lockedPlacement || picker.options.calendarPlacement) as any,
        middleware
    });

    console.log('[DatePicker 11c] FloatingUI computed position - x:', result.x, 'y:', result.y, 'placement:', result.placement);

    // Lock the placement after first positioning to prevent jumping
    if (!picker.lockedPlacement) {
        picker.lockedPlacement = result.placement;
        console.log('[DatePicker 11c-lock] Locked placement to:', picker.lockedPlacement);
    }

    picker.calendar.style.left = `${result.x}px`;
    picker.calendar.style.top = `${result.y}px`;
    console.log('[DatePicker 11d] Position applied to calendar');
}

/**
 * Show tooltip using Floating UI
 */
export async function showTooltip(picker: any, element: HTMLElement, content: string) {
    if (!picker.tooltip || !picker.tooltipArrow) return;

    picker.currentTooltipTarget = element;
    picker.tooltip.textContent = content;
    picker.tooltip.appendChild(picker.tooltipArrow); // Re-append after setting textContent
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
