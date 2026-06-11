/**
 * Self-contained Floating-UI tooltip with hover-delay lifecycle and tracked cleanup.
 *
 * Replaces the inline action-button tooltip lifecycle that previously lived in
 * date-picker.ts. Each Tooltip instance owns its own DOM element, hover handlers,
 * show/hide timers, and Floating UI autoUpdate cleanup. `destroy()` releases
 * everything.
 */

import { computePosition, flip, shift, offset, autoUpdate, type Placement } from '@floating-ui/dom';

export interface TooltipOptions {
    /** Where to append the tooltip element. Defaults to `document.body`. */
    container?: HTMLElement;
    /** Delay before showing on mouseenter (ms). Default 300. */
    showDelay?: number;
    /** Delay before hiding on mouseleave (ms). Default 100. */
    hideDelay?: number;
    /** Floating-UI placement. Default `'top'`. */
    placement?: Placement;
    /** Distance from anchor in px. Default 8. */
    offsetDistance?: number;
    /** Class name applied to the tooltip element. Default reuses the picker's tooltip styling. */
    className?: string;
    /** Class name applied while visible. */
    visibleClassName?: string;
}

export class Tooltip {
    private element: HTMLElement;
    private target: HTMLElement;
    private opts: Required<TooltipOptions>;

    private showTimer?: number;
    private hideTimer?: number;
    private autoUpdateCleanup?: () => void;

    private readonly onEnter = () => this.scheduleShow();
    private readonly onLeave = () => this.scheduleHide();

    constructor(target: HTMLElement, text: string, opts: TooltipOptions = {}) {
        this.target = target;
        this.opts = {
            container: opts.container ?? document.body,
            showDelay: opts.showDelay ?? 300,
            hideDelay: opts.hideDelay ?? 100,
            placement: opts.placement ?? 'top',
            offsetDistance: opts.offsetDistance ?? 8,
            className: opts.className ?? 'drp__tooltip',
            visibleClassName: opts.visibleClassName ?? 'drp__tooltip--visible',
        };

        this.element = document.createElement('div');
        this.element.className = this.opts.className;
        this.element.textContent = text;
        this.opts.container.appendChild(this.element);

        target.addEventListener('mouseenter', this.onEnter);
        target.addEventListener('mouseleave', this.onLeave);
    }

    setText(text: string) {
        this.element.textContent = text;
    }

    private scheduleShow() {
        if (this.hideTimer !== undefined) {
            clearTimeout(this.hideTimer);
            this.hideTimer = undefined;
        }
        this.showTimer = window.setTimeout(() => this.show(), this.opts.showDelay);
    }

    private scheduleHide() {
        if (this.showTimer !== undefined) {
            clearTimeout(this.showTimer);
            this.showTimer = undefined;
        }
        this.hideTimer = window.setTimeout(() => this.hide(), this.opts.hideDelay);
    }

    private show() {
        this.element.classList.add(this.opts.visibleClassName);

        // Replace any prior autoUpdate watcher before starting a new one
        this.autoUpdateCleanup?.();
        this.autoUpdateCleanup = autoUpdate(this.target, this.element, () => {
            computePosition(this.target, this.element, {
                placement: this.opts.placement,
                strategy: 'fixed',
                middleware: [
                    offset(this.opts.offsetDistance),
                    flip(),
                    shift({ padding: 8 }),
                ],
            }).then(({ x, y }) => {
                Object.assign(this.element.style, {
                    left: `${x}px`,
                    top: `${y}px`,
                });
            });
        });
    }

    private hide() {
        this.element.classList.remove(this.opts.visibleClassName);
        this.autoUpdateCleanup?.();
        this.autoUpdateCleanup = undefined;
    }

    destroy() {
        if (this.showTimer !== undefined) clearTimeout(this.showTimer);
        if (this.hideTimer !== undefined) clearTimeout(this.hideTimer);
        this.autoUpdateCleanup?.();

        this.target.removeEventListener('mouseenter', this.onEnter);
        this.target.removeEventListener('mouseleave', this.onLeave);

        this.element.remove();
    }
}
