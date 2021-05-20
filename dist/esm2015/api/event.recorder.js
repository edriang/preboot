import { getNodeKeyForPreboot } from '../common/get-node-key';
/**
 * Called right away to initialize preboot
 *
 * @param opts All the preboot options
 * @param win
 */
export function initAll(opts, win) {
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
export function start(prebootData, win) {
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
export function createOverlay(_document) {
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
export function getAppRoot(_document, opts, serverNode) {
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
export function handleEvents(_document, prebootData, appData, eventSelector) {
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
export function createListenHandler(_document, prebootData, eventSelector, appData) {
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
export function getSelection(node) {
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
export function createBuffer(root) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQucmVjb3JkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2FwaS9ldmVudC5yZWNvcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFrQkEsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsT0FBTyxDQUFDLElBQW9CLEVBQUUsR0FBbUI7SUFDL0QsTUFBTSxTQUFTLEdBQWtCLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDO0lBRWpELHVFQUF1RTtJQUN2RSxvREFBb0Q7SUFDcEQsbUZBQW1GO0lBQ25GLHlEQUF5RDtJQUN6RCxNQUFNLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQWdCO1FBQ2pELElBQUksRUFBRSxJQUFJO1FBQ1YsSUFBSSxFQUFFLEVBQUU7UUFDUixTQUFTLEVBQUUsRUFBRTtLQUNkLENBQUMsQ0FBQztJQUVILE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRUQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLFdBQXdCLEVBQUUsR0FBbUI7SUFDakUsTUFBTSxTQUFTLEdBQWtCLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDO0lBQ2pELE1BQU0sU0FBUyxHQUFhLENBQUMsU0FBUyxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUV2RCxxRUFBcUU7SUFDckUsdUVBQXVFO0lBQ3ZFLHFCQUFxQjtJQUNyQixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsYUFBYTtRQUMzQyx3QkFBd0I7UUFDeEIseUVBQXlFO1FBQ3pFLHlFQUF5RTtRQUN6RSw2QkFBNkI7UUFDN0IsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxF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LENBQUMsVUFBVSxDQUFDLFVBQVU7UUFDdkMsVUFBVSxLQUFLLFFBQVEsQ0FBQyxlQUFlLElBQUksVUFBVSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUU7UUFDekUsT0FBTyxVQUF5QixDQUFDO0tBQ2xDO0lBRUQsc0NBQXNDO0lBQ3RDLE1BQU0sY0FBYyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFnQixDQUFDO0lBQ2xFLDJFQUEyRTtJQUMzRSxjQUFjO0lBQ2QsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBRXRDLHlEQUF5RDtJQUN6RCxVQUFVLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFFL0QsNEVBQTRFO0lBQzVFLFVBQVUsQ0FBQyxZQUFZLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFL0MsNEJBQTRCO0lBQzVCLE9BQU8sY0FBYyxDQUFDO0FBQ3hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cbmltcG9ydCB7XG4gIEV2ZW50U2VsZWN0b3IsXG4gIFByZWJvb3RPcHRpb25zLFxuICBQcmVib290QXBwRGF0YSxcbiAgUHJlYm9vdERhdGEsXG4gIERvbUV2ZW50LFxuICBQcmVib290V2luZG93LFxuICBTZXJ2ZXJDbGllbnRSb290LFxuICBQcmVib290U2VsZWN0aW9uLFxuICBQcmVib290U2VsZWN0aW9uRGlyZWN0aW9uLFxufSBmcm9tICcuLi9jb21tb24vcHJlYm9vdC5pbnRlcmZhY2VzJztcbmltcG9ydCB7Z2V0Tm9kZUtleUZvclByZWJvb3R9IGZyb20gJy4uL2NvbW1vbi9nZXQtbm9kZS1rZXknO1xuXG4vKipcbiAqIENhbGxlZCByaWdodCBhd2F5IHRvIGluaXRpYWxpemUgcHJlYm9vdFxuICpcbiAqIEBwYXJhbSBvcHRzIEFsbCB0aGUgcHJlYm9vdCBvcHRpb25zXG4gKiBAcGFyYW0gd2luXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0QWxsKG9wdHM6IFByZWJvb3RPcHRpb25zLCB3aW4/OiBQcmVib290V2luZG93KSB7XG4gIGNvbnN0IHRoZVdpbmRvdyA9IDxQcmVib290V2luZG93Pih3aW4gfHwgd2luZG93KTtcblxuICAvLyBBZGQgdGhlIHByZWJvb3Qgb3B0aW9ucyB0byB0aGUgcHJlYm9vdCBkYXRhIGFuZCB0aGVuIGFkZCB0aGUgZGF0YSB0b1xuICAvLyB0aGUgd2luZG93IHNvIGl0IGNhbiBiZSB1c2VkIGxhdGVyIGJ5IHRoZSBjbGllbnQuXG4gIC8vIE9ubHkgc2V0IG5ldyBvcHRpb25zIGlmIHRoZXkncmUgbm90IGFscmVhZHkgc2V0IC0gd2UgbWF5IGhhdmUgbXVsdGlwbGUgYXBwIHJvb3RzXG4gIC8vIGFuZCBlYWNoIG9mIHRoZW0gaW52b2tlcyB0aGUgaW5pdCBmdW5jdGlvbiBzZXBhcmF0ZWx5LlxuICBjb25zdCBkYXRhID0gKHRoZVdpbmRvdy5wcmVib290RGF0YSA9IDxQcmVib290RGF0YT57XG4gICAgb3B0czogb3B0cyxcbiAgICBhcHBzOiBbXSxcbiAgICBsaXN0ZW5lcnM6IFtdXG4gIH0pO1xuXG4gIHJldHVybiAoKSA9PiBzdGFydChkYXRhLCB0aGVXaW5kb3cpO1xufVxuXG4vKipcbiAqIFN0YXJ0IHVwIHByZWJvb3QgYnkgZ29pbmcgdGhyb3VnaCBlYWNoIGFwcCBhbmQgYXNzaWduaW5nIHRoZSBhcHByb3ByaWF0ZVxuICogaGFuZGxlcnMuIE5vcm1hbGx5IHRoaXMgd291bGRuJ3QgYmUgY2FsbGVkIGRpcmVjdGx5LCBidXQgd2UgaGF2ZSBzZXQgaXQgdXAgc29cbiAqIHRoYXQgaXQgY2FuIGZvciBvbGRlciB2ZXJzaW9ucyBvZiBVbml2ZXJzYWwuXG4gKlxuICogQHBhcmFtIHByZWJvb3REYXRhIEdsb2JhbCBwcmVib290IGRhdGEgb2JqZWN0IHRoYXQgY29udGFpbnMgb3B0aW9ucyBhbmQgd2lsbFxuICogaGF2ZSBldmVudHNcbiAqIEBwYXJhbSB3aW4gT3B0aW9uYWwgcGFyYW0gdG8gcGFzcyBpbiBtb2NrIHdpbmRvdyBmb3IgdGVzdGluZyBwdXJwb3Nlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQocHJlYm9vdERhdGE6IFByZWJvb3REYXRhLCB3aW4/OiBQcmVib290V2luZG93KSB7XG4gIGNvbnN0IHRoZVdpbmRvdyA9IDxQcmVib290V2luZG93Pih3aW4gfHwgd2luZG93KTtcbiAgY29uc3QgX2RvY3VtZW50ID0gPERvY3VtZW50Pih0aGVXaW5kb3cuZG9jdW1lbnQgfHwge30pO1xuXG4gIC8vIFJlbW92ZSB0aGUgY3VycmVudCBzY3JpcHQgZnJvbSB0aGUgRE9NIHNvIHRoYXQgY2hpbGQgaW5kZXhlcyBtYXRjaFxuICAvLyBiZXR3ZWVuIHRoZSBjbGllbnQgJiB0aGUgc2VydmVyLiBUaGUgc2NyaXB0IGlzIGFscmVhZHkgcnVubmluZyBzbyBpdFxuICAvLyBkb2Vzbid0IGFmZmVjdCBpdC5cbiAgY29uc3QgY3VycmVudFNjcmlwdCA9IF9kb2N1bWVudC5jdXJyZW50U2NyaXB0IHx8XG4gICAgLy8gU3VwcG9ydDogSUUgOS0xMSBvbmx5XG4gICAgLy8gSUUgZG9lc24ndCBzdXBwb3J0IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQuIFNpbmNlIHRoZSBzY3JpcHQgaXMgaW52b2tlZFxuICAgIC8vIHN5bmNocm9ub3VzbHksIHRob3VnaCwgdGhlIGN1cnJlbnQgcnVubmluZyBzY3JpcHQgaXMganVzdCB0aGUgbGFzdCBvbmVcbiAgICAvLyBjdXJyZW50bHkgaW4gdGhlIGRvY3VtZW50LlxuICAgIFtdLnNsaWNlLmNhbGwoX2RvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSwgLTEpWzBdO1xuXG4gIGlmICghY3VycmVudFNjcmlwdCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1ByZWJvb3QgaW5pdGlhbGl6YXRpb24gZmFpbGVkLCBubyBjdXJyZW50U2NyaXB0IGhhcyBiZWVuIGRldGVjdGVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBzZXJ2ZXJOb2RlID0gY3VycmVudFNjcmlwdC5wYXJlbnROb2RlO1xuICBpZiAoIXNlcnZlck5vZGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdQcmVib290IGluaXRpYWxpemF0aW9uIGZhaWxlZCwgdGhlIHNjcmlwdCBpcyBkZXRhY2hlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHNlcnZlck5vZGUucmVtb3ZlQ2hpbGQoY3VycmVudFNjcmlwdCk7XG5cbiAgY29uc3Qgb3B0cyA9IHByZWJvb3REYXRhLm9wdHMgfHwgKHt9IGFzIFByZWJvb3RPcHRpb25zKTtcbiAgbGV0IGV2ZW50U2VsZWN0b3JzID0gb3B0cy5ldmVudFNlbGVjdG9ycyB8fCBbXTtcblxuICAvLyBnZXQgdGhlIHJvb3QgaW5mb1xuICBjb25zdCBhcHBSb290ID0gcHJlYm9vdERhdGEub3B0cyA/IGdldEFwcFJvb3QoX2RvY3VtZW50LCBwcmVib290RGF0YS5vcHRzLCBzZXJ2ZXJOb2RlKSA6IG51bGw7XG5cbiAgLy8gd2UgdHJhY2sgYWxsIGV2ZW50cyBmb3IgZWFjaCBhcHAgaW4gdGhlIHByZWJvb3REYXRhIG9iamVjdCB3aGljaCBpcyBvblxuICAvLyB0aGUgZ2xvYmFsIHNjb3BlOyBlYWNoIGBzdGFydGAgaW52b2NhdGlvbiBhZGRzIGRhdGEgZm9yIG9uZSBhcHAgb25seS5cbiAgY29uc3QgYXBwRGF0YSA9IDxQcmVib290QXBwRGF0YT57IHJvb3Q6IGFwcFJvb3QsIGV2ZW50czogW10gfTtcbiAgaWYgKHByZWJvb3REYXRhLmFwcHMpIHtcbiAgICBwcmVib290RGF0YS5hcHBzLnB1c2goYXBwRGF0YSk7XG4gIH1cblxuICBldmVudFNlbGVjdG9ycyA9IGV2ZW50U2VsZWN0b3JzLm1hcChldmVudFNlbGVjdG9yID0+IHtcbiAgICBpZiAoIWV2ZW50U2VsZWN0b3IuaGFzT3duUHJvcGVydHkoJ3JlcGxheScpKSB7XG4gICAgICBldmVudFNlbGVjdG9yLnJlcGxheSA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBldmVudFNlbGVjdG9yO1xuICB9KTtcblxuICAvLyBsb29wIHRocm91Z2ggYWxsIHRoZSBldmVudFNlbGVjdG9ycyBhbmQgY3JlYXRlIGV2ZW50IGhhbmRsZXJzXG4gIGV2ZW50U2VsZWN0b3JzLmZvckVhY2goZXZlbnRTZWxlY3RvciA9PlxuICAgIGhhbmRsZUV2ZW50cyhfZG9jdW1lbnQsIHByZWJvb3REYXRhLCBhcHBEYXRhLCBldmVudFNlbGVjdG9yKSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGFuIG92ZXJsYXkgZGl2IGFuZCBhZGQgaXQgdG8gdGhlIERPTSBzbyBpdCBjYW4gYmUgdXNlZFxuICogaWYgYSBmcmVlemUgZXZlbnQgb2NjdXJzXG4gKlxuICogQHBhcmFtIF9kb2N1bWVudCBUaGUgZ2xvYmFsIGRvY3VtZW50IG9iamVjdCAocGFzc2VkIGluIGZvciB0ZXN0aW5nIHB1cnBvc2VzKVxuICogQHJldHVybnMgRWxlbWVudCBUaGUgb3ZlcmxheSBub2RlIGlzIHJldHVybmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVPdmVybGF5KF9kb2N1bWVudDogRG9jdW1lbnQpOiBIVE1MRWxlbWVudCB8IHVuZGVmaW5lZCB7XG4gIGxldCBvdmVybGF5ID0gX2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBvdmVybGF5LnNldEF0dHJpYnV0ZSgnaWQnLCAncHJlYm9vdE92ZXJsYXknKTtcbiAgb3ZlcmxheS5zZXRBdHRyaWJ1dGUoXG4gICAgJ3N0eWxlJyxcbiAgICAnZGlzcGxheTpub25lO3Bvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDsnICtcbiAgICAndG9wOjA7d2lkdGg6MTAwJTtoZWlnaHQ6MTAwJTt6LWluZGV4Ojk5OTk5OTtiYWNrZ3JvdW5kOmJsYWNrO29wYWNpdHk6LjMnXG4gICk7XG4gIF9kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQob3ZlcmxheSk7XG5cbiAgcmV0dXJuIG92ZXJsYXk7XG59XG5cbi8qKlxuICogR2V0IHJlZmVyZW5jZXMgdG8gdGhlIGN1cnJlbnQgYXBwIHJvb3Qgbm9kZSBiYXNlZCBvbiBpbnB1dCBvcHRpb25zLiBVc2VycyBjYW5cbiAqIGluaXRpYWxpemUgcHJlYm9vdCBlaXRoZXIgYnkgc3BlY2lmeWluZyBhcHBSb290IHdoaWNoIGlzIGp1c3Qgb25lIG9yIG1vcmVcbiAqIHNlbGVjdG9ycyBmb3IgYXBwcy4gVGhpcyBzZWN0aW9uIG9wdGlvbiBpcyB1c2VmdWwgZm9yIHBlb3BsZSB0aGF0IGFyZSBkb2luZyB0aGVpciBvd25cbiAqIGJ1ZmZlcmluZyAoaS5lLiB0aGV5IGhhdmUgdGhlaXIgb3duIGNsaWVudCBhbmQgc2VydmVyIHZpZXcpXG4gKlxuICogQHBhcmFtIF9kb2N1bWVudCBUaGUgZ2xvYmFsIGRvY3VtZW50IG9iamVjdCB1c2VkIHRvIGF0dGFjaCB0aGUgb3ZlcmxheVxuICogQHBhcmFtIG9wdHMgT3B0aW9ucyBwYXNzZWQgaW4gYnkgdGhlIHVzZXIgdG8gaW5pdCgpXG4gKiBAcGFyYW0gc2VydmVyTm9kZSBUaGUgc2VydmVyIG5vZGUgc2VydmluZyBhcyBhcHBsaWNhdGlvbiByb290XG4gKiBAcmV0dXJucyBTZXJ2ZXJDbGllbnRSb290IEFuIGFycmF5IG9mIHJvb3QgaW5mbyBmb3IgdGhlIGN1cnJlbnQgYXBwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcHBSb290KFxuICBfZG9jdW1lbnQ6IERvY3VtZW50LFxuICBvcHRzOiBQcmVib290T3B0aW9ucyxcbiAgc2VydmVyTm9kZTogSFRNTEVsZW1lbnRcbik6IFNlcnZlckNsaWVudFJvb3Qge1xuICBjb25zdCByb290OiBTZXJ2ZXJDbGllbnRSb290ID0ge3NlcnZlck5vZGV9O1xuXG4gIC8vIGlmIHdlIGFyZSBkb2luZyBidWZmZXJpbmcsIHdlIG5lZWQgdG8gY3JlYXRlIHRoZSBidWZmZXIgZm9yIHRoZSBjbGllbnRcbiAgLy8gZWxzZSB0aGUgY2xpZW50IHJvb3QgaXMgdGhlIHNhbWUgYXMgdGhlIHNlcnZlclxuICByb290LmNsaWVudE5vZGUgPSBvcHRzLmJ1ZmZlciA/IGNyZWF0ZUJ1ZmZlcihyb290KSA6IHJvb3Quc2VydmVyTm9kZTtcblxuICAvLyBjcmVhdGUgYW4gb3ZlcmxheSBpZiBub3QgZGlzYWJsZWQgLHRoYXQgY2FuIGJlIHVzZWQgbGF0ZXIgaWYgYSBmcmVlemUgZXZlbnQgb2NjdXJzXG4gIGlmICghb3B0cy5kaXNhYmxlT3ZlcmxheSkge1xuICAgIHJvb3Qub3ZlcmxheSA9IGNyZWF0ZU92ZXJsYXkoX2RvY3VtZW50KTtcbiAgfVxuXG4gIHJldHVybiByb290O1xufVxuXG4vKipcbiAqIFVuZGVyIGdpdmVuIHNlcnZlciByb290LCBmb3IgZ2l2ZW4gc2VsZWN0b3IsIHJlY29yZCBldmVudHNcbiAqXG4gKiBAcGFyYW0gX2RvY3VtZW50XG4gKiBAcGFyYW0gcHJlYm9vdERhdGFcbiAqIEBwYXJhbSBhcHBEYXRhXG4gKiBAcGFyYW0gZXZlbnRTZWxlY3RvclxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlRXZlbnRzKF9kb2N1bWVudDogRG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByZWJvb3REYXRhOiBQcmVib290RGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwRGF0YTogUHJlYm9vdEFwcERhdGEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50U2VsZWN0b3I6IEV2ZW50U2VsZWN0b3IpIHtcbiAgY29uc3Qgc2VydmVyUm9vdCA9IGFwcERhdGEucm9vdC5zZXJ2ZXJOb2RlO1xuXG4gIC8vIGRvbid0IGRvIGFueXRoaW5nIGlmIG5vIHNlcnZlciByb290XG4gIGlmICghc2VydmVyUm9vdCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEF0dGFjaCBkZWxlZ2F0ZWQgZXZlbnQgbGlzdGVuZXJzIGZvciBlYWNoIGV2ZW50IHNlbGVjdG9yLlxuICAvLyBXZSBuZWVkIHRvIHVzZSBkZWxlZ2F0ZWQgZXZlbnRzIGFzIG9ubHkgdGhlIHRvcCBsZXZlbCBzZXJ2ZXIgbm9kZVxuICAvLyBleGlzdHMgYXQgdGhpcyBwb2ludC5cbiAgZXZlbnRTZWxlY3Rvci5ldmVudHMuZm9yRWFjaCgoZXZlbnROYW1lOiBzdHJpbmcpID0+IHtcbiAgICAvLyBnZXQgdGhlIGFwcHJvcHJpYXRlIGhhbmRsZXIgYW5kIGFkZCBpdCBhcyBhbiBldmVudCBsaXN0ZW5lclxuICAgIGNvbnN0IGhhbmRsZXIgPSBjcmVhdGVMaXN0ZW5IYW5kbGVyKF9kb2N1bWVudCwgcHJlYm9vdERhdGEsIGV2ZW50U2VsZWN0b3IsIGFwcERhdGEpO1xuICAgIC8vIGF0dGFjaCB0aGUgaGFuZGxlciBpbiB0aGUgY2FwdHVyZSBwaGFzZSBzbyB0aGF0IGl0IGZpcmVzIGV2ZW4gaWZcbiAgICAvLyBvbmUgb2YgdGhlIGhhbmRsZXJzIGJlbG93IGNhbGxzIHN0b3BQcm9wYWdhdGlvbigpXG4gICAgc2VydmVyUm9vdC5hZGRFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgaGFuZGxlciwgdHJ1ZSk7XG5cbiAgICAvLyBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgbGlzdGVuZXJzIHNvIHdlIGNhbiBkbyBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIoKVxuICAgIC8vIHdoZW4gcHJlYm9vdCBkb25lXG4gICAgaWYgKHByZWJvb3REYXRhLmxpc3RlbmVycykge1xuICAgICAgcHJlYm9vdERhdGEubGlzdGVuZXJzLnB1c2goe1xuICAgICAgICBub2RlOiBzZXJ2ZXJSb290LFxuICAgICAgICBldmVudE5hbWUsXG4gICAgICAgIGhhbmRsZXJcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIGhhbmRsZXIgZm9yIGV2ZW50cyB0aGF0IHdlIHdpbGwgcmVjb3JkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMaXN0ZW5IYW5kbGVyKFxuICBfZG9jdW1lbnQ6IERvY3VtZW50LFxuICBwcmVib290RGF0YTogUHJlYm9vdERhdGEsXG4gIGV2ZW50U2VsZWN0b3I6IEV2ZW50U2VsZWN0b3IsXG4gIGFwcERhdGE6IFByZWJvb3RBcHBEYXRhXG4pOiBFdmVudExpc3RlbmVyIHtcbiAgY29uc3QgQ0FSRVRfRVZFTlRTID0gWydrZXl1cCcsICdrZXlkb3duJywgJ2ZvY3VzaW4nLCAnbW91c2V1cCcsICdtb3VzZWRvd24nXTtcbiAgY29uc3QgQ0FSRVRfTk9ERVMgPSBbJ0lOUFVUJywgJ1RFWFRBUkVBJ107XG5cbiAgLy8gU3VwcG9ydDogSUUgOS0xMSBvbmx5XG4gIC8vIElFIHVzZXMgYSBwcmVmaXhlZCBgbWF0Y2hlc2AgdmVyc2lvblxuICBjb25zdCBtYXRjaGVzID0gX2RvY3VtZW50LmRvY3VtZW50RWxlbWVudC5tYXRjaGVzIHx8XG4gICAgKF9kb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgYXMgYW55KS5tc01hdGNoZXNTZWxlY3RvcjtcbiAgY29uc3Qgb3B0cyA9IHByZWJvb3REYXRhLm9wdHM7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGV2ZW50OiBEb21FdmVudCkge1xuICAgIGNvbnN0IG5vZGU6IEVsZW1lbnQgPSBldmVudC50YXJnZXQ7XG5cbiAgICAvLyBhIGRlbGVnYXRlZCBoYW5kbGVycyBvbiBkb2N1bWVudCBpcyB1c2VkIHNvIHdlIG5lZWQgdG8gY2hlY2sgaWZcbiAgICAvLyBldmVudCB0YXJnZXQgbWF0Y2hlcyBhIGRlc2lyZWQgc2VsZWN0b3JcbiAgICBpZiAoIW1hdGNoZXMuY2FsbChub2RlLCBldmVudFNlbGVjdG9yLnNlbGVjdG9yKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHJvb3QgPSBhcHBEYXRhLnJvb3Q7XG4gICAgY29uc3QgZXZlbnROYW1lID0gZXZlbnQudHlwZTtcblxuICAgIC8vIGlmIG5vIG5vZGUgb3Igbm8gZXZlbnQgbmFtZSwganVzdCByZXR1cm5cbiAgICBpZiAoIW5vZGUgfHwgIWV2ZW50TmFtZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlmIGtleSBjb2RlcyBzZXQgZm9yIGV2ZW50U2VsZWN0b3IsIHRoZW4gZG9uJ3QgZG8gYW55dGhpbmcgaWYgZXZlbnRcbiAgICAvLyBkb2Vzbid0IGluY2x1ZGUga2V5XG4gICAgY29uc3Qga2V5Q29kZXMgPSBldmVudFNlbGVjdG9yLmtleUNvZGVzO1xuICAgIGlmIChrZXlDb2RlcyAmJiBrZXlDb2Rlcy5sZW5ndGgpIHtcbiAgICAgIGNvbnN0IG1hdGNoaW5nS2V5Q29kZXMgPSBrZXlDb2Rlcy5maWx0ZXIoa2V5Q29kZSA9PiBldmVudC53aGljaCA9PT0ga2V5Q29kZSk7XG5cbiAgICAgIC8vIGlmIHRoZXJlIGFyZSBub3QgbWF0Y2hlcyAoaS5lLiBrZXkgZW50ZXJlZCBOT1Qgb25lIG9mIHRoZSBrZXkgY29kZXMpXG4gICAgICAvLyB0aGVuIGRvbid0IGRvIGFueXRoaW5nXG4gICAgICBpZiAoIW1hdGNoaW5nS2V5Q29kZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiBmb3IgYSBnaXZlbiBzZXQgb2YgZXZlbnRzIHdlIGFyZSBwcmV2ZW50aW5nIGRlZmF1bHQsIGRvIHRoYXRcbiAgICBpZiAoZXZlbnRTZWxlY3Rvci5wcmV2ZW50RGVmYXVsdCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG5cbiAgICAvLyBpZiBhbiBhY3Rpb24gaGFuZGxlciBwYXNzZWQgaW4sIHVzZSB0aGF0XG4gICAgaWYgKGV2ZW50U2VsZWN0b3IuYWN0aW9uKSB7XG4gICAgICBldmVudFNlbGVjdG9yLmFjdGlvbihub2RlLCBldmVudCk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHRoZSBub2RlIGtleSBmb3IgYSBnaXZlbiBub2RlXG4gICAgY29uc3Qgbm9kZUtleSA9IGdldE5vZGVLZXlGb3JQcmVib290KHsgcm9vdDogcm9vdCwgbm9kZTogbm9kZSB9KTtcblxuICAgIC8vIHJlY29yZCBhY3RpdmUgbm9kZVxuICAgIGlmIChDQVJFVF9FVkVOVFMuaW5kZXhPZihldmVudE5hbWUpID49IDApIHtcbiAgICAgIC8vIGlmIGl0J3MgYW4gY2FyZXQgbm9kZSwgZ2V0IHRoZSBzZWxlY3Rpb24gZm9yIHRoZSBhY3RpdmUgbm9kZVxuICAgICAgY29uc3QgaXNDYXJldE5vZGUgPSBDQVJFVF9OT0RFUy5pbmRleE9mKG5vZGUudGFnTmFtZSA/IG5vZGUudGFnTmFtZSA6ICcnKSA+PSAwO1xuXG4gICAgICBwcmVib290RGF0YS5hY3RpdmVOb2RlID0ge1xuICAgICAgICByb290OiByb290LFxuICAgICAgICBub2RlOiBub2RlLFxuICAgICAgICBub2RlS2V5OiBub2RlS2V5LFxuICAgICAgICBzZWxlY3Rpb246IGlzQ2FyZXROb2RlID8gZ2V0U2VsZWN0aW9uKG5vZGUgYXMgSFRNTElucHV0RWxlbWVudCkgOiB1bmRlZmluZWRcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChldmVudE5hbWUgIT09ICdjaGFuZ2UnICYmIGV2ZW50TmFtZSAhPT0gJ2ZvY3Vzb3V0Jykge1xuICAgICAgcHJlYm9vdERhdGEuYWN0aXZlTm9kZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBpZiBvdmVybGF5IGlzIG5vdCBkaXNhYmxlZCBhbmQgd2UgYXJlIGZyZWV6aW5nIHRoZSBVSVxuICAgIGlmIChvcHRzICYmICFvcHRzLmRpc2FibGVPdmVybGF5ICYmIGV2ZW50U2VsZWN0b3IuZnJlZXplKSB7XG4gICAgICBjb25zdCBvdmVybGF5ID0gcm9vdC5vdmVybGF5IGFzIEhUTUxFbGVtZW50O1xuXG4gICAgICAvLyBzaG93IHRoZSBvdmVybGF5XG4gICAgICBvdmVybGF5LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gICAgICAvLyBoaWRlIHRoZSBvdmVybGF5IGFmdGVyIDEwIHNlY29uZHMganVzdCBpbiBjYXNlIHByZWJvb3QuY29tcGxldGUoKSBuZXZlclxuICAgICAgLy8gY2FsbGVkXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgb3ZlcmxheS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgfSwgMTAwMDApO1xuICAgIH1cblxuICAgIC8vIHdlIHdpbGwgcmVjb3JkIGV2ZW50cyBmb3IgbGF0ZXIgcmVwbGF5IHVubGVzcyBleHBsaWNpdGx5IG1hcmtlZCBhc1xuICAgIC8vIGRvTm90UmVwbGF5XG4gICAgaWYgKGV2ZW50U2VsZWN0b3IucmVwbGF5KSB7XG4gICAgICBhcHBEYXRhLmV2ZW50cy5wdXNoKHtcbiAgICAgICAgbm9kZSxcbiAgICAgICAgbm9kZUtleSxcbiAgICAgICAgZXZlbnQsXG4gICAgICAgIG5hbWU6IGV2ZW50TmFtZVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgc2VsZWN0aW9uIGRhdGEgdGhhdCBpcyBsYXRlciB1c2VkIHRvIHNldCB0aGUgY3Vyc29yIGFmdGVyIGNsaWVudCB2aWV3XG4gKiBpcyBhY3RpdmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNlbGVjdGlvbihub2RlOiBIVE1MSW5wdXRFbGVtZW50KTogUHJlYm9vdFNlbGVjdGlvbiB7XG4gIG5vZGUgPSBub2RlIHx8IHt9IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgY29uc3Qgbm9kZVZhbHVlID0gbm9kZS52YWx1ZSB8fCAnJztcbiAgY29uc3Qgc2VsZWN0aW9uOiBQcmVib290U2VsZWN0aW9uID0ge1xuICAgIHN0YXJ0OiBub2RlVmFsdWUubGVuZ3RoLFxuICAgIGVuZDogbm9kZVZhbHVlLmxlbmd0aCxcbiAgICBkaXJlY3Rpb246ICdmb3J3YXJkJ1xuICB9O1xuXG4gIC8vIGlmIGJyb3dzZXIgc3VwcG9ydCBzZWxlY3Rpb25TdGFydCBvbiBub2RlIChDaHJvbWUsIEZpcmVGb3gsIElFOSspXG4gIHRyeSB7XG4gICAgaWYgKG5vZGUuc2VsZWN0aW9uU3RhcnQgfHwgbm9kZS5zZWxlY3Rpb25TdGFydCA9PT0gMCkge1xuICAgICAgc2VsZWN0aW9uLnN0YXJ0ID0gbm9kZS5zZWxlY3Rpb25TdGFydDtcbiAgICAgIHNlbGVjdGlvbi5lbmQgPSBub2RlLnNlbGVjdGlvbkVuZCA/IG5vZGUuc2VsZWN0aW9uRW5kIDogMDtcbiAgICAgIHNlbGVjdGlvbi5kaXJlY3Rpb24gPSBub2RlLnNlbGVjdGlvbkRpcmVjdGlvbiA/XG4gICAgICAgIG5vZGUuc2VsZWN0aW9uRGlyZWN0aW9uIGFzIFByZWJvb3RTZWxlY3Rpb25EaXJlY3Rpb24gOiAnbm9uZSc7XG4gICAgfVxuICB9IGNhdGNoIChleCkge31cblxuICByZXR1cm4gc2VsZWN0aW9uO1xufVxuXG4vKipcbiAqIENyZWF0ZSBidWZmZXIgZm9yIGEgZ2l2ZW4gbm9kZVxuICpcbiAqIEBwYXJhbSByb290IEFsbCB0aGUgZGF0YSByZWxhdGVkIHRvIGEgcGFydGljdWxhciBhcHBcbiAqIEByZXR1cm5zIFJldHVybnMgdGhlIHJvb3QgY2xpZW50IG5vZGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCdWZmZXIocm9vdDogU2VydmVyQ2xpZW50Um9vdCk6IEhUTUxFbGVtZW50IHtcbiAgY29uc3Qgc2VydmVyTm9kZSA9IHJvb3Quc2VydmVyTm9kZTtcblxuICAvLyBpZiBubyByb290U2VydmVyTm9kZSBPUiB0aGUgc2VsZWN0b3IgaXMgb24gdGhlIGVudGlyZSBodG1sIGRvYyBvciB0aGUgYm9keVxuICAvLyBPUiBubyBwYXJlbnROb2RlLCBkb24ndCBidWZmZXJcbiAgaWYgKCFzZXJ2ZXJOb2RlIHx8ICFzZXJ2ZXJOb2RlLnBhcmVudE5vZGUgfHxcbiAgICBzZXJ2ZXJOb2RlID09PSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgfHwgc2VydmVyTm9kZSA9PT0gZG9jdW1lbnQuYm9keSkge1xuICAgIHJldHVybiBzZXJ2ZXJOb2RlIGFzIEhUTUxFbGVtZW50O1xuICB9XG5cbiAgLy8gY3JlYXRlIHNoYWxsb3cgY2xvbmUgb2Ygc2VydmVyIHJvb3RcbiAgY29uc3Qgcm9vdENsaWVudE5vZGUgPSBzZXJ2ZXJOb2RlLmNsb25lTm9kZShmYWxzZSkgYXMgSFRNTEVsZW1lbnQ7XG4gIC8vIHdlIHdhbnQgdGhlIGNsaWVudCB0byB3cml0ZSB0byBhIGhpZGRlbiBkaXYgdW50aWwgdGhlIHRpbWUgZm9yIHN3aXRjaGluZ1xuICAvLyB0aGUgYnVmZmVyc1xuICByb290Q2xpZW50Tm9kZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuXG4gIC8vIGluc2VydCB0aGUgY2xpZW50IG5vZGUgYmVmb3JlIHRoZSBzZXJ2ZXIgYW5kIHJldHVybiBpdFxuICBzZXJ2ZXJOb2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHJvb3RDbGllbnROb2RlLCBzZXJ2ZXJOb2RlKTtcblxuICAvLyBtYXJrIHNlcnZlciBub2RlIGFzIG5vdCB0byBiZSB0b3VjaGVkIGJ5IEFuZ3VsYXJKUyAtIG5lZWRlZCBmb3IgbmdVcGdyYWRlXG4gIHNlcnZlck5vZGUuc2V0QXR0cmlidXRlKCduZy1ub24tYmluZGFibGUnLCAnJyk7XG5cbiAgLy8gcmV0dXJuIHRoZSByb290Q2xpZW50Tm9kZVxuICByZXR1cm4gcm9vdENsaWVudE5vZGU7XG59XG4iXX0=