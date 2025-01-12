/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface EventSelector {
    selector: string;
    events: string[];
    keyCodes?: number[];
    preventDefault?: boolean;
    freeze?: boolean;
    action?: Function;
    replay?: boolean;
}
export interface ServerClientRoot {
    serverNode?: HTMLElement;
    clientNode?: HTMLElement;
    overlay?: HTMLElement;
}
export interface PrebootOptions {
    /** @deprecated minification has been removed in v6 */
    buffer?: boolean;
    eventSelectors?: EventSelector[];
    appRoot: string | string[];
    replay?: boolean;
    disableOverlay?: boolean;
}
export interface PrebootEvent {
    node: any;
    nodeKey?: any;
    event: DomEvent;
    name: string;
}
export interface DomEvent {
    which?: number;
    type?: string;
    target?: any;
    preventDefault(): void;
}
export interface PrebootAppData {
    root: ServerClientRoot;
    events: PrebootEvent[];
}
export interface PrebootEventListener {
    node: Node;
    eventName: string;
    handler: EventListener;
}
export declare type PrebootSelectionDirection = 'forward' | 'backward' | 'none';
export interface PrebootSelection {
    start: number;
    end: number;
    direction: PrebootSelectionDirection;
}
export interface NodeContext {
    root: ServerClientRoot;
    node: Element;
    nodeKey?: string;
    selection?: PrebootSelection;
}
export interface PrebootData {
    opts?: PrebootOptions;
    activeNode?: NodeContext;
    apps?: PrebootAppData[];
    listeners?: PrebootEventListener[];
}
export interface PrebootWindow {
    prebootData: PrebootData;
    getComputedStyle: (elt: Element, pseudoElt?: string) => CSSStyleDeclaration;
    document: Document;
}
