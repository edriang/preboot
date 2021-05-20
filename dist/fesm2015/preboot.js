import { InjectionToken, APP_BOOTSTRAP_LISTENER, Optional, Inject, PLATFORM_ID, ApplicationRef, NgModule } from '@angular/core';
import { isPlatformServer, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { filter, take } from 'rxjs/operators';

/**
 * Attempt to generate key from node position in the DOM
 */
function getNodeKeyForPreboot(nodeContext) {
    const ancestors = [];
    const root = nodeContext.root;
    const node = nodeContext.node;
    let temp = node;
    // walk up the tree from the target node up to the root
    while (temp && temp !== root.serverNode && temp !== root.clientNode) {
        ancestors.push(temp);
        temp = temp.parentNode;
    }
    // note: if temp doesn't exist here it means root node wasn't found
    if (temp) {
        ancestors.push(temp);
    }
    // now go backwards starting from the root, appending the appName to unique
    // identify the node later..
    const name = node.nodeName || 'unknown';
    let key = name;
    const len = ancestors.length;
    for (let i = len - 1; i >= 0; i--) {
        temp = ancestors[i];
        if (temp.childNodes && i > 0) {
            for (let j = 0, n = 0; j < temp.childNodes.length; j++) {
                // Node is not a comment node
                if (temp.childNodes[j].nodeType !== 8) {
                    n++;
                }
                if (temp.childNodes[j] === ancestors[i - 1]) {
                    key += '_s' + n;
                    break;
                }
            }
        }
    }
    return key;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const PREBOOT_NONCE = new InjectionToken('PrebootNonce');

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

function _window() {
    return {
        prebootData: window['prebootData'],
        getComputedStyle: window.getComputedStyle,
        document: document
    };
}
class EventReplayer {
    constructor() {
        this.clientNodeCache = {};
        this.replayStarted = false;
    }
    /**
     * Window setting and getter to facilitate testing of window
     * in non-browser environments
     */
    setWindow(win) {
        this.win = win;
    }
    /**
     * Window setting and getter to facilitate testing of window
     * in non-browser environments
     */
    getWindow() {
        if (!this.win) {
            this.win = _window();
        }
        return this.win;
    }
    /**
     * Replay all events for all apps. this can only be run once.
     * if called multiple times, will only do something once
     */
    replayAll() {
        if (this.replayStarted) {
            return;
        }
        else {
            this.replayStarted = true;
        }
        // loop through each of the preboot apps
        const prebootData = this.getWindow().prebootData || {};
        const apps = prebootData.apps || [];
        apps.forEach(appData => this.replayForApp(appData));
        // once all events have been replayed and buffers switched, then we cleanup preboot
        this.cleanup(prebootData);
    }
    /**
     * Replay all events for one app (most of the time there is just one app)
     * @param appData
     */
    replayForApp(appData) {
        appData = (appData || {});
        // try catch around events b/c even if error occurs, we still move forward
        try {
            const events = appData.events || [];
            // replay all the events from the server view onto the client view
            events.forEach(event => this.replayEvent(appData, event));
        }
        catch (ex) {
            console.error(ex);
        }
        // if we are buffering, switch the buffers
        this.switchBuffer(appData);
    }
    /**
     * Replay one particular event
     * @param appData
     * @param prebootEvent
     */
    replayEvent(appData, prebootEvent) {
        appData = (appData || {});
        prebootEvent = (prebootEvent || {});
        const event = prebootEvent.event;
        const serverNode = prebootEvent.node || {};
        const nodeKey = prebootEvent.nodeKey;
        const clientNode = this.findClientNode({
            root: appData.root,
            node: serverNode,
            nodeKey: nodeKey
        });
        // if client node can't be found, log a warning
        if (!clientNode) {
            console.warn(`Trying to dispatch event ${event.type} to node ${nodeKey}
        but could not find client node. Server node is: ${serverNode}`);
            return;
        }
        // now dispatch events and whatnot to the client node
        clientNode.checked = serverNode.checked;
        clientNode.selected = serverNode.selected;
        clientNode.value = serverNode.value;
        clientNode.dispatchEvent(event);
    }
    /**
     * Switch the buffer for one particular app (i.e. display the client
     * view and destroy the server view)
     * @param appData
     */
    switchBuffer(appData) {
        appData = (appData || {});
        const root = (appData.root || {});
        const serverView = root.serverNode;
        const clientView = root.clientNode;
        // if no client view or the server view is the body or client
        // and server view are the same, then don't do anything and return
        if (!clientView || !serverView || serverView === clientView || serverView.nodeName === 'BODY') {
            return;
        }
        // do a try-catch just in case something messed up
        try {
            // get the server view display mode
            const gcs = this.getWindow().getComputedStyle;
            const display = gcs(serverView).getPropertyValue('display') || 'block';
            // first remove the server view
            serverView.remove ? serverView.remove() : (serverView.style.display = 'none');
            // now add the client view
            clientView.style.display = display;
        }
        catch (ex) {
            console.error(ex);
        }
    }
    /**
     * Finally, set focus, remove all the event listeners and remove
     * any freeze screen that may be there
     * @param prebootData
     */
    cleanup(prebootData) {
        prebootData = prebootData || {};
        const listeners = prebootData.listeners || [];
        // set focus on the active node AFTER a small delay to ensure buffer
        // switched
        const activeNode = prebootData.activeNode;
        if (activeNode != null) {
            setTimeout(() => this.setFocus(activeNode), 1);
        }
        // remove all event listeners
        for (const listener of listeners) {
            listener.node.removeEventListener(listener.eventName, listener.handler);
        }
        // remove the freeze overlay if it exists
        const doc = this.getWindow().document;
        const prebootOverlay = doc.getElementById('prebootOverlay');
        if (prebootOverlay) {
            prebootOverlay.remove ?
                prebootOverlay.remove() : prebootOverlay.parentNode !== null ?
                prebootOverlay.parentNode.removeChild(prebootOverlay) :
                prebootOverlay.style.display = 'none';
        }
        // clear out the data stored for each app
        prebootData.apps = [];
        this.clientNodeCache = {};
        // send event to document that signals preboot complete
        // constructor is not supported by older browsers ( i.e. IE9-11 )
        // in these browsers, the type of CustomEvent will be "object"
        if (typeof CustomEvent === 'function') {
            const completeEvent = new CustomEvent('PrebootComplete');
            doc.dispatchEvent(completeEvent);
        }
        else {
            console.warn(`Could not dispatch PrebootComplete event.
       You can fix this by including a polyfill for CustomEvent.`);
        }
    }
    setFocus(activeNode) {
        // only do something if there is an active node
        if (!activeNode || !activeNode.node || !activeNode.nodeKey) {
            return;
        }
        // find the client node in the new client view
        const clientNode = this.findClientNode(activeNode);
        if (clientNode) {
            // set focus on the client node
            clientNode.focus();
            // set selection if a modern browser (i.e. IE9+, etc.)
            const selection = activeNode.selection;
            if (clientNode.setSelectionRange && selection) {
                try {
                    clientNode
                        .setSelectionRange(selection.start, selection.end, selection.direction);
                }
                catch (ex) { }
            }
        }
    }
    /**
     * Given a node from the server rendered view, find the equivalent
     * node in the client rendered view. We do this by the following approach:
     *      1. take the name of the server node tag (ex. div or h1 or input)
     *      2. add either id (ex. div#myid) or class names (ex. div.class1.class2)
     *      3. use that value as a selector to get all the matching client nodes
     *      4. loop through all client nodes found and for each generate a key value
     *      5. compare the client key to the server key; once there is a match,
     *          we have our client node
     *
     * NOTE: this only works when the client view is almost exactly the same as
     * the server view. we will need an improvement here in the future to account
     * for situations where the client view is different in structure from the
     * server view
     */
    findClientNode(serverNodeContext) {
        serverNodeContext = (serverNodeContext || {});
        const serverNode = serverNodeContext.node;
        const root = serverNodeContext.root;
        // if no server or client root, don't do anything
        if (!root || !root.serverNode || !root.clientNode) {
            return null;
        }
        // we use the string of the node to compare to the client node & as key in
        // cache
        const serverNodeKey = serverNodeContext.nodeKey || getNodeKeyForPreboot(serverNodeContext);
        // if client node already in cache, return it
        if (this.clientNodeCache[serverNodeKey]) {
            return this.clientNodeCache[serverNodeKey];
        }
        // get the selector for client nodes
        const className = (serverNode.className || '').replace('ng-binding', '').trim();
        let selector = serverNode.tagName;
        if (serverNode.id) {
            selector += `#${serverNode.id}`;
        }
        else if (className) {
            selector += `.${className.replace(/ /g, '.')}`;
        }
        // select all possible client nodes and look through them to try and find a
        // match
        const rootClientNode = root.clientNode;
        let clientNodes = rootClientNode.querySelectorAll(selector);
        // if nothing found, then just try the tag name as a final option
        if (!clientNodes.length) {
            console.log(`nothing found for ${selector} so using ${serverNode.tagName}`);
            clientNodes = rootClientNode.querySelectorAll(serverNode.tagName);
        }
        const length = clientNodes.length;
        for (let i = 0; i < length; i++) {
            const clientNode = clientNodes.item(i);
            // get the key for the client node
            const clientNodeKey = getNodeKeyForPreboot({
                root: root,
                node: clientNode
            });
            // if the client node key is exact match for the server node key, then we
            // found the client node
            if (clientNodeKey === serverNodeKey) {
                this.clientNodeCache[serverNodeKey] = clientNode;
                return clientNode;
            }
        }
        // if we get here and there is one clientNode, use it as a fallback
        if (clientNodes.length === 1) {
            this.clientNodeCache[serverNodeKey] = clientNodes[0];
            return clientNodes[0];
        }
        // if we get here it means we couldn't find the client node so give the user
        // a warning
        console.warn(`No matching client node found for ${serverNodeKey}.
       You can fix this by assigning this element a unique id attribute.`);
        return null;
    }
}

/**
 * Called right away to initialize preboot
 *
 * @param opts All the preboot options
 * @param win
 */
function initAll(opts, win) {
    const theWindow = (win || window);
    // Add the preboot options to the preboot data and then add the data to
    // the window so it can be used later by the client.
    // Only set new options if they're not already set - we may have multiple app roots
    // and each of them invokes the init function separately.
    const data = (theWindow.prebootData = {
        opts: opts,
        apps: [],
        listeners: []
    });
    return () => start(data, theWindow);
}
/**
 * Start up preboot by going through each app and assigning the appropriate
 * handlers. Normally this wouldn't be called directly, but we have set it up so
 * that it can for older versions of Universal.
 *
 * @param prebootData Global preboot data object that contains options and will
 * have events
 * @param win Optional param to pass in mock window for testing purposes
 */
function start(prebootData, win) {
    const theWindow = (win || window);
    const _document = (theWindow.document || {});
    // Remove the current script from the DOM so that child indexes match
    // between the client & the server. The script is already running so it
    // doesn't affect it.
    const currentScript = _document.currentScript ||
        // Support: IE 9-11 only
        // IE doesn't support document.currentScript. Since the script is invoked
        // synchronously, though, the current running script is just the last one
        // currently in the document.
        [].slice.call(_document.getElementsByTagName('script'), -1)[0];
    if (!currentScript) {
        console.error('Preboot initialization failed, no currentScript has been detected.');
        return;
    }
    let serverNode = currentScript.parentNode;
    if (!serverNode) {
        console.error('Preboot initialization failed, the script is detached');
        return;
    }
    serverNode.removeChild(currentScript);
    const opts = prebootData.opts || {};
    let eventSelectors = opts.eventSelectors || [];
    // get the root info
    const appRoot = prebootData.opts ? getAppRoot(_document, prebootData.opts, serverNode) : null;
    // we track all events for each app in the prebootData object which is on
    // the global scope; each `start` invocation adds data for one app only.
    const appData = { root: appRoot, events: [] };
    if (prebootData.apps) {
        prebootData.apps.push(appData);
    }
    eventSelectors = eventSelectors.map(eventSelector => {
        if (!eventSelector.hasOwnProperty('replay')) {
            eventSelector.replay = true;
        }
        return eventSelector;
    });
    // loop through all the eventSelectors and create event handlers
    eventSelectors.forEach(eventSelector => handleEvents(_document, prebootData, appData, eventSelector));
}
/**
 * Create an overlay div and add it to the DOM so it can be used
 * if a freeze event occurs
 *
 * @param _document The global document object (passed in for testing purposes)
 * @returns Element The overlay node is returned
 */
function createOverlay(_document) {
    let overlay = _document.createElement('div');
    overlay.setAttribute('id', 'prebootOverlay');
    overlay.setAttribute('style', 'display:none;position:absolute;left:0;' +
        'top:0;width:100%;height:100%;z-index:999999;background:black;opacity:.3');
    _document.documentElement.appendChild(overlay);
    return overlay;
}
/**
 * Get references to the current app root node based on input options. Users can
 * initialize preboot either by specifying appRoot which is just one or more
 * selectors for apps. This section option is useful for people that are doing their own
 * buffering (i.e. they have their own client and server view)
 *
 * @param _document The global document object used to attach the overlay
 * @param opts Options passed in by the user to init()
 * @param serverNode The server node serving as application root
 * @returns ServerClientRoot An array of root info for the current app
 */
function getAppRoot(_document, opts, serverNode) {
    const root = { serverNode };
    // if we are doing buffering, we need to create the buffer for the client
    // else the client root is the same as the server
    root.clientNode = opts.buffer ? createBuffer(root) : root.serverNode;
    // create an overlay if not disabled ,that can be used later if a freeze event occurs
    if (!opts.disableOverlay) {
        root.overlay = createOverlay(_document);
    }
    return root;
}
/**
 * Under given server root, for given selector, record events
 *
 * @param _document
 * @param prebootData
 * @param appData
 * @param eventSelector
 */
function handleEvents(_document, prebootData, appData, eventSelector) {
    const serverRoot = appData.root.serverNode;
    // don't do anything if no server root
    if (!serverRoot) {
        return;
    }
    // Attach delegated event listeners for each event selector.
    // We need to use delegated events as only the top level server node
    // exists at this point.
    eventSelector.events.forEach((eventName) => {
        // get the appropriate handler and add it as an event listener
        const handler = createListenHandler(_document, prebootData, eventSelector, appData);
        // attach the handler in the capture phase so that it fires even if
        // one of the handlers below calls stopPropagation()
        serverRoot.addEventListener(eventName, handler, true);
        // need to keep track of listeners so we can do node.removeEventListener()
        // when preboot done
        if (prebootData.listeners) {
            prebootData.listeners.push({
                node: serverRoot,
                eventName,
                handler
            });
        }
    });
}
/**
 * Create handler for events that we will record
 */
function createListenHandler(_document, prebootData, eventSelector, appData) {
    const CARET_EVENTS = ['keyup', 'keydown', 'focusin', 'mouseup', 'mousedown'];
    const CARET_NODES = ['INPUT', 'TEXTAREA'];
    // Support: IE 9-11 only
    // IE uses a prefixed `matches` version
    const matches = _document.documentElement.matches ||
        _document.documentElement.msMatchesSelector;
    const opts = prebootData.opts;
    return function (event) {
        const node = event.target;
        // a delegated handlers on document is used so we need to check if
        // event target matches a desired selector
        if (!matches.call(node, eventSelector.selector)) {
            return;
        }
        const root = appData.root;
        const eventName = event.type;
        // if no node or no event name, just return
        if (!node || !eventName) {
            return;
        }
        // if key codes set for eventSelector, then don't do anything if event
        // doesn't include key
        const keyCodes = eventSelector.keyCodes;
        if (keyCodes && keyCodes.length) {
            const matchingKeyCodes = keyCodes.filter(keyCode => event.which === keyCode);
            // if there are not matches (i.e. key entered NOT one of the key codes)
            // then don't do anything
            if (!matchingKeyCodes.length) {
                return;
            }
        }
        // if for a given set of events we are preventing default, do that
        if (eventSelector.preventDefault) {
            event.preventDefault();
        }
        // if an action handler passed in, use that
        if (eventSelector.action) {
            eventSelector.action(node, event);
        }
        // get the node key for a given node
        const nodeKey = getNodeKeyForPreboot({ root: root, node: node });
        // record active node
        if (CARET_EVENTS.indexOf(eventName) >= 0) {
            // if it's an caret node, get the selection for the active node
            const isCaretNode = CARET_NODES.indexOf(node.tagName ? node.tagName : '') >= 0;
            prebootData.activeNode = {
                root: root,
                node: node,
                nodeKey: nodeKey,
                selection: isCaretNode ? getSelection(node) : undefined
            };
        }
        else if (eventName !== 'change' && eventName !== 'focusout') {
            prebootData.activeNode = undefined;
        }
        // if overlay is not disabled and we are freezing the UI
        if (opts && !opts.disableOverlay && eventSelector.freeze) {
            const overlay = root.overlay;
            // show the overlay
            overlay.style.display = 'block';
            // hide the overlay after 10 seconds just in case preboot.complete() never
            // called
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 10000);
        }
        // we will record events for later replay unless explicitly marked as
        // doNotReplay
        if (eventSelector.replay) {
            appData.events.push({
                node,
                nodeKey,
                event,
                name: eventName
            });
        }
    };
}
/**
 * Get the selection data that is later used to set the cursor after client view
 * is active
 */
function getSelection(node) {
    node = node || {};
    const nodeValue = node.value || '';
    const selection = {
        start: nodeValue.length,
        end: nodeValue.length,
        direction: 'forward'
    };
    // if browser support selectionStart on node (Chrome, FireFox, IE9+)
    try {
        if (node.selectionStart || node.selectionStart === 0) {
            selection.start = node.selectionStart;
            selection.end = node.selectionEnd ? node.selectionEnd : 0;
            selection.direction = node.selectionDirection ?
                node.selectionDirection : 'none';
        }
    }
    catch (ex) { }
    return selection;
}
/**
 * Create buffer for a given node
 *
 * @param root All the data related to a particular app
 * @returns Returns the root client node.
 */
function createBuffer(root) {
    const serverNode = root.serverNode;
    // if no rootServerNode OR the selector is on the entire html doc or the body
    // OR no parentNode, don't buffer
    if (!serverNode || !serverNode.parentNode ||
        serverNode === document.documentElement || serverNode === document.body) {
        return serverNode;
    }
    // create shallow clone of server root
    const rootClientNode = serverNode.cloneNode(false);
    // we want the client to write to a hidden div until the time for switching
    // the buffers
    rootClientNode.style.display = 'none';
    // insert the client node before the server and return it
    serverNode.parentNode.insertBefore(rootClientNode, serverNode);
    // mark server node as not to be touched by AngularJS - needed for ngUpgrade
    serverNode.setAttribute('ng-non-bindable', '');
    // return the rootClientNode
    return rootClientNode;
}

const eventRecorder = {
    start,
    createOverlay,
    getAppRoot,
    handleEvents,
    createListenHandler,
    getSelection,
    createBuffer
};
const initFunctionName = 'prebootInitFn';
// exporting default options in case developer wants to use these + custom on
// top
const defaultOptions = {
    buffer: true,
    replay: true,
    disableOverlay: false,
    // these are the default events are are listening for an transferring from
    // server view to client view
    eventSelectors: [
        // for recording changes in form elements
        {
            selector: 'input,textarea',
            events: ['keypress', 'keyup', 'keydown', 'input', 'change']
        },
        { selector: 'select,option', events: ['change'] },
        // when user hits return button in an input box
        {
            selector: 'input',
            events: ['keyup'],
            preventDefault: true,
            keyCodes: [13],
            freeze: true
        },
        // when user submit form (press enter, click on button/input[type="submit"])
        {
            selector: 'form',
            events: ['submit'],
            preventDefault: true,
            freeze: true
        },
        // for tracking focus (no need to replay)
        {
            selector: 'input,textarea',
            events: ['focusin', 'focusout', 'mousedown', 'mouseup'],
            replay: false
        },
        // user clicks on a button
        {
            selector: 'button',
            events: ['click'],
            preventDefault: true,
            freeze: true
        }
    ]
};
/**
 * Get the event recorder code based on all functions in event.recorder.ts
 * and the getNodeKeyForPreboot function.
 */
function getEventRecorderCode() {
    const eventRecorderFunctions = [];
    for (const funcName in eventRecorder) {
        if (eventRecorder.hasOwnProperty(funcName)) {
            const fn = eventRecorder[funcName].toString();
            const fnCleaned = fn.replace('common_1.', '');
            eventRecorderFunctions.push(fnCleaned);
        }
    }
    // this is common function used to get the node key
    eventRecorderFunctions.push(getNodeKeyForPreboot.toString());
    // add new line characters for readability
    return '\n\n' + eventRecorderFunctions.join('\n\n') + '\n\n';
}
/**
 * Used by the server side version of preboot. The main purpose is to get the
 * inline code that can be inserted into the server view.
 * Returns the definitions of the prebootInit function called in code returned by
 * getInlineInvocation for each server node separately.
 *
 * @param customOptions PrebootRecordOptions that override the defaults
 * @returns Generated inline preboot code with just functions definitions
 * to be used separately
 */
function getInlineDefinition(customOptions) {
    const opts = assign({}, defaultOptions, customOptions);
    // safety check to make sure options passed in are valid
    validateOptions(opts);
    const scriptCode = getEventRecorderCode();
    const optsStr = stringifyWithFunctions(opts);
    // wrap inline preboot code with a self executing function in order to create scope
    const initAllStr = initAll.toString();
    return `var ${initFunctionName} = (function() {
      ${scriptCode}
      return (${initAllStr.replace('common_1.', '')})(${optsStr});
    })();`;
}
/**
 * Used by the server side version of preboot. The main purpose is to get the
 * inline code that can be inserted into the server view.
 * Invokes the prebootInit function defined in getInlineDefinition with proper
 * parameters. Each appRoot should get a separate inlined code from a separate
 * call to getInlineInvocation but only one inlined code from getInlineDefinition.
 *
 * @returns Generated inline preboot code with just invocations of functions from
 * getInlineDefinition
 */
function getInlineInvocation() {
    return `${initFunctionName}();`;
}
/**
 * Throw an error if issues with any options
 * @param opts
 */
function validateOptions(opts) {
    if (!opts.appRoot || !opts.appRoot.length) {
        throw new Error('The appRoot is missing from preboot options. ' +
            'This is needed to find the root of your application. ' +
            'Set this value in the preboot options to be a selector for the root element of your app.');
    }
}
/**
 * Object.assign() is not fully supporting in TypeScript, so
 * this is just a simple implementation of it
 *
 * @param target The target object
 * @param optionSets Any number of addition objects that are added on top of the
 * target
 * @returns A new object that contains all the merged values
 */
function assign(target, ...optionSets) {
    if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
    }
    const output = Object(target);
    for (let index = 0; index < optionSets.length; index++) {
        const source = optionSets[index];
        if (source !== undefined && source !== null) {
            for (const nextKey in source) {
                if (source.hasOwnProperty && source.hasOwnProperty(nextKey)) {
                    output[nextKey] = source[nextKey];
                }
            }
        }
    }
    return output;
}
/**
 * Stringify an object and include functions. This is needed since we are
 * letting users pass in options that include custom functions for things like
 * the freeze handler or action when an event occurs
 *
 * @param obj This is the object you want to stringify that includes some
 * functions
 * @returns The stringified version of an object
 */
function stringifyWithFunctions(obj) {
    const FUNC_START = 'START_FUNCTION_HERE';
    const FUNC_STOP = 'STOP_FUNCTION_HERE';
    // first stringify except mark off functions with markers
    let str = JSON.stringify(obj, function (_key, value) {
        // if the value is a function, we want to wrap it with markers
        if (!!(value && value.constructor && value.call && value.apply)) {
            return FUNC_START + value.toString() + FUNC_STOP;
        }
        else {
            return value;
        }
    });
    // now we use the markers to replace function strings with actual functions
    let startFuncIdx = str.indexOf(FUNC_START);
    let stopFuncIdx;
    let fn;
    while (startFuncIdx >= 0) {
        stopFuncIdx = str.indexOf(FUNC_STOP);
        // pull string out
        fn = str.substring(startFuncIdx + FUNC_START.length, stopFuncIdx);
        fn = fn.replace(/\\n/g, '\n');
        str = str.substring(0, startFuncIdx - 1) + fn +
            str.substring(stopFuncIdx + FUNC_STOP.length + 1);
        startFuncIdx = str.indexOf(FUNC_START);
    }
    return str;
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
const PREBOOT_SCRIPT_CLASS = 'preboot-inline-script';
const PREBOOT_OPTIONS = new InjectionToken('PrebootOptions');
function createScriptFromCode(doc, nonce, inlineCode) {
    const script = doc.createElement('script');
    if (nonce) {
        script.nonce = nonce;
    }
    script.className = PREBOOT_SCRIPT_CLASS;
    script.textContent = inlineCode;
    return script;
}
function PREBOOT_FACTORY(doc, prebootOpts, nonce, platformId, appRef, eventReplayer) {
    return () => {
        validateOptions(prebootOpts);
        if (isPlatformServer(platformId)) {
            const inlineCodeDefinition = getInlineDefinition(prebootOpts);
            const scriptWithDefinition = createScriptFromCode(doc, nonce, inlineCodeDefinition);
            const inlineCodeInvocation = getInlineInvocation();
            const existingScripts = doc.getElementsByClassName(PREBOOT_SCRIPT_CLASS);
            // Check to see if preboot scripts are already inlined before adding them
            // to the DOM. If they are, update the nonce to be current.
            if (existingScripts.length === 0) {
                const baseList = [];
                const appRootSelectors = baseList.concat(prebootOpts.appRoot);
                doc.head.appendChild(scriptWithDefinition);
                appRootSelectors
                    .map(selector => ({
                    selector,
                    appRootElem: doc.querySelector(selector)
                }))
                    .forEach(({ selector, appRootElem }) => {
                    if (!appRootElem) {
                        console.log(`No server node found for selector: ${selector}`);
                        return;
                    }
                    const scriptWithInvocation = createScriptFromCode(doc, nonce, inlineCodeInvocation);
                    appRootElem.insertBefore(scriptWithInvocation, appRootElem.firstChild);
                });
            }
            else if (existingScripts.length > 0 && nonce) {
                existingScripts[0].nonce = nonce;
            }
        }
        if (isPlatformBrowser(platformId)) {
            const replay = prebootOpts.replay != null ? prebootOpts.replay : true;
            if (replay) {
                appRef.isStable
                    .pipe(filter(stable => stable), take(1)).subscribe(() => {
                    eventReplayer.replayAll();
                });
            }
        }
    };
}
const PREBOOT_PROVIDER = {
    provide: APP_BOOTSTRAP_LISTENER,
    useFactory: PREBOOT_FACTORY,
    deps: [
        DOCUMENT,
        PREBOOT_OPTIONS,
        [new Optional(), new Inject(PREBOOT_NONCE)],
        PLATFORM_ID,
        ApplicationRef,
        EventReplayer,
    ],
    multi: true
};

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
class PrebootModule {
    static withConfig(opts) {
        return {
            ngModule: PrebootModule,
            providers: [{ provide: PREBOOT_OPTIONS, useValue: opts }]
        };
    }
}
PrebootModule.decorators = [
    { type: NgModule, args: [{
                providers: [EventReplayer, PREBOOT_PROVIDER]
            },] }
];

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

/**
 * Generated bundle index. Do not edit.
 */

export { EventReplayer, PREBOOT_NONCE, PrebootModule, _window, assign, createBuffer, createListenHandler, createOverlay, defaultOptions, getAppRoot, getEventRecorderCode, getInlineDefinition, getInlineInvocation, getNodeKeyForPreboot, getSelection, handleEvents, initAll, initFunctionName, start, stringifyWithFunctions, validateOptions, PREBOOT_OPTIONS as ɵa, PREBOOT_FACTORY as ɵb, PREBOOT_PROVIDER as ɵc };
//# sourceMappingURL=preboot.js.map
