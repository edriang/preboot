import { getNodeKeyForPreboot } from '../common/get-node-key';
export function _window() {
    return {
        prebootData: window['prebootData'],
        getComputedStyle: window.getComputedStyle,
        document: document
    };
}
export class EventReplayer {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQucmVwbGF5ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2FwaS9ldmVudC5yZXBsYXllci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFlQSxPQUFPLEVBQUMsb0JBQW9CLEVBQUMsTUFBTSx3QkFBd0IsQ0FBQztBQUU1RCxNQUFNLFVBQVUsT0FBTztJQUNyQixPQUFPO1FBQ0wsV0FBVyxFQUFHLE1BQWMsQ0FBQyxhQUFhLENBQUM7UUFDM0MsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtRQUN6QyxRQUFRLEVBQUUsUUFBUTtLQUNuQixDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sT0FBTyxhQUFhO0lBQTFCO1FBQ0Usb0JBQWUsR0FBK0IsRUFBRSxDQUFDO1FBQ2pELGtCQUFhLEdBQUcsS0FBSyxDQUFDO0lBa1N4QixDQUFDO0lBL1JDOzs7T0FHRztJQUNILFNBQVMsQ0FBQyxHQUFrQjtRQUMxQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNqQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUztRQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ2IsSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLEVBQUUsQ0FBQztTQUN0QjtRQUNELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUNsQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsU0FBUztRQUNQLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUN0QixPQUFPO1NBQ1I7YUFBTTtZQUNMLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1NBQzNCO1FBRUQsd0NBQXdDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3BDLElBQUksQ0FBQyxPQUFP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Q0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQWdCLENBQUM7U0FDdEM7UUFFRCw0RUFBNEU7UUFDNUUsWUFBWTtRQUNaLE9BQU8sQ0FBQyxJQUFJLENBQ1YscUNBQXFDLGFBQWE7eUVBQ2lCLENBQ3BFLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtcbiAgTm9kZUNvbnRleHQsXG4gIFByZWJvb3RBcHBEYXRhLFxuICBQcmVib290RGF0YSxcbiAgUHJlYm9vdEV2ZW50LFxuICBQcmVib290V2luZG93LFxuICBTZXJ2ZXJDbGllbnRSb290LFxufSBmcm9tICcuLi9jb21tb24vcHJlYm9vdC5pbnRlcmZhY2VzJztcbmltcG9ydCB7Z2V0Tm9kZUtleUZvclByZWJvb3R9IGZyb20gJy4uL2NvbW1vbi9nZXQtbm9kZS1rZXknO1xuXG5leHBvcnQgZnVuY3Rpb24gX3dpbmRvdygpOiBQcmVib290V2luZG93IHtcbiAgcmV0dXJuIHtcbiAgICBwcmVib290RGF0YTogKHdpbmRvdyBhcyBhbnkpWydwcmVib290RGF0YSddLFxuICAgIGdldENvbXB1dGVkU3R5bGU6IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlLFxuICAgIGRvY3VtZW50OiBkb2N1bWVudFxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgRXZlbnRSZXBsYXllciB7XG4gIGNsaWVudE5vZGVDYWNoZTogeyBba2V5OiBzdHJpbmddOiBFbGVtZW50IH0gPSB7fTtcbiAgcmVwbGF5U3RhcnRlZCA9IGZhbHNlO1xuICB3aW46IFByZWJvb3RXaW5kb3c7XG5cbiAgLyoqXG4gICAqIFdpbmRvdyBzZXR0aW5nIGFuZCBnZXR0ZXIgdG8gZmFjaWxpdGF0ZSB0ZXN0aW5nIG9mIHdpbmRvd1xuICAgKiBpbiBub24tYnJvd3NlciBlbnZpcm9ubWVudHNcbiAgICovXG4gIHNldFdpbmRvdyh3aW46IFByZWJvb3RXaW5kb3cpIHtcbiAgICB0aGlzLndpbiA9IHdpbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBXaW5kb3cgc2V0dGluZyBhbmQgZ2V0dGVyIHRvIGZhY2lsaXRhdGUgdGVzdGluZyBvZiB3aW5kb3dcbiAgICogaW4gbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzXG4gICAqL1xuICBnZXRXaW5kb3coKSB7XG4gICAgaWYgKCF0aGlzLndpbikge1xuICAgICAgdGhpcy53aW4gPSBfd2luZG93KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLndpbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXBsYXkgYWxsIGV2ZW50cyBmb3IgYWxsIGFwcHMuIHRoaXMgY2FuIG9ubHkgYmUgcnVuIG9uY2UuXG4gICAqIGlmIGNhbGxlZCBtdWx0aXBsZSB0aW1lcywgd2lsbCBvbmx5IGRvIHNvbWV0aGluZyBvbmNlXG4gICAqL1xuICByZXBsYXlBbGwoKSB7XG4gICAgaWYgKHRoaXMucmVwbGF5U3RhcnRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlcGxheVN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8vIGxvb3AgdGhyb3VnaCBlYWNoIG9mIHRoZSBwcmVib290IGFwcHNcbiAgICBjb25zdCBwcmVib290RGF0YSA9IHRoaXMuZ2V0V2luZG93KCkucHJlYm9vdERhdGEgfHwge307XG4gICAgY29uc3QgYXBwcyA9IHByZWJvb3REYXRhLmFwcHMgfHwgW107XG4gICAgYXBwcy5mb3JFYWNoKGFwcERhdGEgPT4gdGhpcy5yZXBsYXlGb3JBcHAoYXBwRGF0YSkpO1xuXG4gICAgLy8gb25jZSBhbGwgZXZlbnRzIGhhdmUgYmVlbiByZXBsYXllZCBhbmQgYnVmZmVycyBzd2l0Y2hlZCwgdGhlbiB3ZSBjbGVhbnVwIHByZWJvb3RcbiAgICB0aGlzLmNsZWFudXAocHJlYm9vdERhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcGxheSBhbGwgZXZlbnRzIGZvciBvbmUgYXBwIChtb3N0IG9mIHRoZSB0aW1lIHRoZXJlIGlzIGp1c3Qgb25lIGFwcClcbiAgICogQHBhcmFtIGFwcERhdGFcbiAgICovXG4gIHJlcGxheUZvckFwcChhcHBEYXRhOiBQcmVib290QXBwRGF0YSkge1xuICAgIGFwcERhdGEgPSA8UHJlYm9vdEFwcERhdGE+KGFwcERhdGEgfHwge30pO1xuXG4gICAgLy8gdHJ5IGNhdGNoIGFyb3VuZCBldmVudHMgYi9jIGV2ZW4gaWYgZXJyb3Igb2NjdXJzLCB3ZSBzdGlsbCBtb3ZlIGZvcndhcmRcbiAgICB0cnkge1xuICAgICAgY29uc3QgZXZlbnRzID0gYXBwRGF0YS5ldmVudHMgfHwgW107XG5cbiAgICAgIC8vIHJlcGxheSBhbGwgdGhlIGV2ZW50cyBmcm9tIHRoZSBzZXJ2ZXIgdmlldyBvbnRvIHRoZSBjbGllbnQgdmlld1xuICAgICAgZXZlbnRzLmZvckVhY2goZXZlbnQgPT4gdGhpcy5yZXBsYXlFdmVudChhcHBEYXRhLCBldmVudCkpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICB9XG5cbiAgICAvLyBpZiB3ZSBhcmUgYnVmZmVyaW5nLCBzd2l0Y2ggdGhlIGJ1ZmZlcnNcbiAgICB0aGlzLnN3aXRjaEJ1ZmZlcihhcHBEYXRhKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXBsYXkgb25lIHBhcnRpY3VsYXIgZXZlbnRcbiAgICogQHBhcmFtIGFwcERhdGFcbiAgICogQHBhcmFtIHByZWJvb3RFdmVudFxuICAgKi9cbiAgcmVwbGF5RXZlbnQoYXBwRGF0YTogUHJlYm9vdEFwcERhdGEsIHByZWJvb3RFdmVudDogUHJlYm9vdEV2ZW50KSB7XG4gICAgYXBwRGF0YSA9IDxQcmVib290QXBwRGF0YT4oYXBwRGF0YSB8fCB7fSk7XG4gICAgcHJlYm9vdEV2ZW50ID0gPFByZWJvb3RFdmVudD4ocHJlYm9vdEV2ZW50IHx8IHt9KTtcblxuICAgIGNvbnN0IGV2ZW50ID0gcHJlYm9vdEV2ZW50LmV2ZW50IGFzIEV2ZW50O1xuICAgIGNvbnN0IHNlcnZlck5vZGUgPSBwcmVib290RXZlbnQubm9kZSB8fCB7fTtcbiAgICBjb25zdCBub2RlS2V5ID0gcHJlYm9vdEV2ZW50Lm5vZGVLZXk7XG4gICAgY29uc3QgY2xpZW50Tm9kZSA9IHRoaXMuZmluZENsaWVudE5vZGUoe1xuICAgICAgcm9vdDogYXBwRGF0YS5yb290LFxuICAgICAgbm9kZTogc2VydmVyTm9kZSxcbiAgICAgIG5vZGVLZXk6IG5vZGVLZXlcbiAgICB9KTtcblxuICAgIC8vIGlmIGNsaWVudCBub2RlIGNhbid0IGJlIGZvdW5kLCBsb2cgYSB3YXJuaW5nXG4gICAgaWYgKCFjbGllbnROb2RlKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBUcnlpbmcgdG8gZGlzcGF0Y2ggZXZlbnQgJHtldmVudC50eXBlfSB0byBub2RlICR7bm9kZUtleX1cbiAgICAgICAgYnV0IGNvdWxkIG5vdCBmaW5kIGNsaWVudCBub2RlLiBTZXJ2ZXIgbm9kZSBpczogJHtzZXJ2ZXJOb2RlfWBcbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbm93IGRpc3BhdGNoIGV2ZW50cyBhbmQgd2hhdG5vdCB0byB0aGUgY2xpZW50IG5vZGVcbiAgICAoY2xpZW50Tm9kZSBhcyBIVE1MSW5wdXRFbGVtZW50KS5jaGVja2VkID0gc2VydmVyTm9kZS5jaGVja2VkO1xuICAgIChjbGllbnROb2RlIGFzIEhUTUxPcHRpb25FbGVtZW50KS5zZWxlY3RlZCA9IHNlcnZlck5vZGUuc2VsZWN0ZWQ7XG4gICAgKGNsaWVudE5vZGUgYXMgSFRNTE9wdGlvbkVsZW1lbnQpLnZhbHVlID0gc2VydmVyTm9kZS52YWx1ZTtcbiAgICBjbGllbnROb2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN3aXRjaCB0aGUgYnVmZmVyIGZvciBvbmUgcGFydGljdWxhciBhcHAgKGkuZS4gZGlzcGxheSB0aGUgY2xpZW50XG4gICAqIHZpZXcgYW5kIGRlc3Ryb3kgdGhlIHNlcnZlciB2aWV3KVxuICAgKiBAcGFyYW0gYXBwRGF0YVxuICAgKi9cbiAgc3dpdGNoQnVmZmVyKGFwcERhdGE6IFByZWJvb3RBcHBEYXRhKSB7XG4gICAgYXBwRGF0YSA9IDxQcmVib290QXBwRGF0YT4oYXBwRGF0YSB8fCB7fSk7XG5cbiAgICBjb25zdCByb290ID0gPFNlcnZlckNsaWVudFJvb3Q+KGFwcERhdGEucm9vdCB8fCB7fSk7XG4gICAgY29uc3Qgc2VydmVyVmlldyA9IHJvb3Quc2VydmVyTm9kZTtcbiAgICBjb25zdCBjbGllbnRWaWV3ID0gcm9vdC5jbGllbnROb2RlO1xuXG4gICAgLy8gaWYgbm8gY2xpZW50IHZpZXcgb3IgdGhlIHNlcnZlciB2aWV3IGlzIHRoZSBib2R5IG9yIGNsaWVudFxuICAgIC8vIGFuZCBzZXJ2ZXIgdmlldyBhcmUgdGhlIHNhbWUsIHRoZW4gZG9uJ3QgZG8gYW55dGhpbmcgYW5kIHJldHVyblxuICAgIGlmICghY2xpZW50VmlldyB8fCAhc2VydmVyVmlldyB8fCBzZXJ2ZXJWaWV3ID09PSBjbGllbnRWaWV3IHx8IHNlcnZlclZpZXcubm9kZU5hbWUgPT09ICdCT0RZJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGRvIGEgdHJ5LWNhdGNoIGp1c3QgaW4gY2FzZSBzb21ldGhpbmcgbWVzc2VkIHVwXG4gICAgdHJ5IHtcbiAgICAgIC8vIGdldCB0aGUgc2VydmVyIHZpZXcgZGlzcGxheSBtb2RlXG4gICAgICBjb25zdCBnY3MgPSB0aGlzLmdldFdpbmRvdygpLmdldENvbXB1dGVkU3R5bGU7XG4gICAgICBjb25zdCBkaXNwbGF5ID0gZ2NzKHNlcnZlclZpZXcpLmdldFByb3BlcnR5VmFsdWUoJ2Rpc3BsYXknKSB8fCAnYmxvY2snO1xuXG4gICAgICAvLyBmaXJzdCByZW1vdmUgdGhlIHNlcnZlciB2aWV3XG4gICAgICBzZXJ2ZXJWaWV3LnJlbW92ZSA/IHNlcnZlclZpZXcucmVtb3ZlKCkgOiAoc2VydmVyVmlldy5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnKTtcblxuICAgICAgLy8gbm93IGFkZCB0aGUgY2xpZW50IHZpZXdcbiAgICAgIGNsaWVudFZpZXcuc3R5bGUuZGlzcGxheSA9IGRpc3BsYXk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5hbGx5LCBzZXQgZm9jdXMsIHJlbW92ZSBhbGwgdGhlIGV2ZW50IGxpc3RlbmVycyBhbmQgcmVtb3ZlXG4gICAqIGFueSBmcmVlemUgc2NyZWVuIHRoYXQgbWF5IGJlIHRoZXJlXG4gICAqIEBwYXJhbSBwcmVib290RGF0YVxuICAgKi9cbiAgY2xlYW51cChwcmVib290RGF0YTogUHJlYm9vdERhdGEpIHtcbiAgICBwcmVib290RGF0YSA9IHByZWJvb3REYXRhIHx8IHt9O1xuXG4gICAgY29uc3QgbGlzdGVuZXJzID0gcHJlYm9vdERhdGEubGlzdGVuZXJzIHx8IFtdO1xuXG4gICAgLy8gc2V0IGZvY3VzIG9uIHRoZSBhY3RpdmUgbm9kZSBBRlRFUiBhIHNtYWxsIGRlbGF5IHRvIGVuc3VyZSBidWZmZXJcbiAgICAvLyBzd2l0Y2hlZFxuICAgIGNvbnN0IGFjdGl2ZU5vZGUgPSBwcmVib290RGF0YS5hY3RpdmVOb2RlO1xuICAgIGlmIChhY3RpdmVOb2RlICE9IG51bGwpIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5zZXRGb2N1cyhhY3RpdmVOb2RlKSwgMSk7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGFsbCBldmVudCBsaXN0ZW5lcnNcbiAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIGxpc3RlbmVycykge1xuICAgICAgbGlzdGVuZXIubm9kZS5yZW1vdmVFdmVudExpc3RlbmVyKGxpc3RlbmVyLmV2ZW50TmFtZSwgbGlzdGVuZXIuaGFuZGxlcik7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIHRoZSBmcmVlemUgb3ZlcmxheSBpZiBpdCBleGlzdHNcbiAgICBjb25zdCBkb2MgPSB0aGlzLmdldFdpbmRvdygpLmRvY3VtZW50O1xuICAgIGNvbnN0IHByZWJvb3RPdmVybGF5ID0gZG9jLmdldEVsZW1lbnRCeUlkKCdwcmVib290T3ZlcmxheScpO1xuICAgIGlmIChwcmVib290T3ZlcmxheSkge1xuICAgICAgcHJlYm9vdE92ZXJsYXkucmVtb3ZlID9cbiAgICAgICAgcHJlYm9vdE92ZXJsYXkucmVtb3ZlKCkgOiBwcmVib290T3ZlcmxheS5wYXJlbnROb2RlICE9PSBudWxsID9cbiAgICAgICAgcHJlYm9vdE92ZXJsYXkucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChwcmVib290T3ZlcmxheSkgOlxuICAgICAgICBwcmVib290T3ZlcmxheS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH1cblxuICAgIC8vIGNsZWFyIG91dCB0aGUgZGF0YSBzdG9yZWQgZm9yIGVhY2ggYXBwXG4gICAgcHJlYm9vdERhdGEuYXBwcyA9IFtdO1xuICAgIHRoaXMuY2xpZW50Tm9kZUNhY2hlID0ge307XG5cbiAgICAvLyBzZW5kIGV2ZW50IHRvIGRvY3VtZW50IHRoYXQgc2lnbmFscyBwcmVib290IGNvbXBsZXRlXG4gICAgLy8gY29uc3RydWN0b3IgaXMgbm90IHN1cHBvcnRlZCBieSBvbGRlciBicm93c2VycyAoIGkuZS4gSUU5LTExIClcbiAgICAvLyBpbiB0aGVzZSBicm93c2VycywgdGhlIHR5cGUgb2YgQ3VzdG9tRXZlbnQgd2lsbCBiZSBcIm9iamVjdFwiXG4gICAgaWYgKHR5cGVvZiBDdXN0b21FdmVudCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3QgY29tcGxldGVFdmVudCA9IG5ldyBDdXN0b21FdmVudCgnUHJlYm9vdENvbXBsZXRlJyk7XG4gICAgICBkb2MuZGlzcGF0Y2hFdmVudChjb21wbGV0ZUV2ZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBDb3VsZCBub3QgZGlzcGF0Y2ggUHJlYm9vdENvbXBsZXRlIGV2ZW50LlxuICAgICAgIFlvdSBjYW4gZml4IHRoaXMgYnkgaW5jbHVkaW5nIGEgcG9seWZpbGwgZm9yIEN1c3RvbUV2ZW50LmApO1xuICAgIH1cbiAgfVxuXG4gIHNldEZvY3VzKGFjdGl2ZU5vZGU6IE5vZGVDb250ZXh0KSB7XG4gICAgLy8gb25seSBkbyBzb21ldGhpbmcgaWYgdGhlcmUgaXMgYW4gYWN0aXZlIG5vZGVcbiAgICBpZiAoIWFjdGl2ZU5vZGUgfHwgIWFjdGl2ZU5vZGUubm9kZSB8fCAhYWN0aXZlTm9kZS5ub2RlS2V5KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZmluZCB0aGUgY2xpZW50IG5vZGUgaW4gdGhlIG5ldyBjbGllbnQgdmlld1xuICAgIGNvbnN0IGNsaWVudE5vZGUgPSB0aGlzLmZpbmRDbGllbnROb2RlKGFjdGl2ZU5vZGUpO1xuICAgIGlmIChjbGllbnROb2RlKSB7XG4gICAgICAvLyBzZXQgZm9jdXMgb24gdGhlIGNsaWVudCBub2RlXG4gICAgICBjbGllbnROb2RlLmZvY3VzKCk7XG5cbiAgICAgIC8vIHNldCBzZWxlY3Rpb24gaWYgYSBtb2Rlcm4gYnJvd3NlciAoaS5lLiBJRTkrLCBldGMuKVxuICAgICAgY29uc3Qgc2VsZWN0aW9uID0gYWN0aXZlTm9kZS5zZWxlY3Rpb247XG4gICAgICBpZiAoKGNsaWVudE5vZGUgYXMgSFRNTElucHV0RWxlbWVudCkuc2V0U2VsZWN0aW9uUmFuZ2UgJiYgc2VsZWN0aW9uKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgKGNsaWVudE5vZGUgYXMgSFRNTElucHV0RWxlbWVudClcbiAgICAgICAgICAgIC5zZXRTZWxlY3Rpb25SYW5nZShzZWxlY3Rpb24uc3RhcnQsIHNlbGVjdGlvbi5lbmQsIHNlbGVjdGlvbi5kaXJlY3Rpb24pO1xuICAgICAgICB9IGNhdGNoIChleCkge31cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2l2ZW4gYSBub2RlIGZyb20gdGhlIHNlcnZlciByZW5kZXJlZCB2aWV3LCBmaW5kIHRoZSBlcXVpdmFsZW50XG4gICAqIG5vZGUgaW4gdGhlIGNsaWVudCByZW5kZXJlZCB2aWV3LiBXZSBkbyB0aGlzIGJ5IHRoZSBmb2xsb3dpbmcgYXBwcm9hY2g6XG4gICAqICAgICAgMS4gdGFrZSB0aGUgbmFtZSBvZiB0aGUgc2VydmVyIG5vZGUgdGFnIChleC4gZGl2IG9yIGgxIG9yIGlucHV0KVxuICAgKiAgICAgIDIuIGFkZCBlaXRoZXIgaWQgKGV4LiBkaXYjbXlpZCkgb3IgY2xhc3MgbmFtZXMgKGV4LiBkaXYuY2xhc3MxLmNsYXNzMilcbiAgICogICAgICAzLiB1c2UgdGhhdCB2YWx1ZSBhcyBhIHNlbGVjdG9yIHRvIGdldCBhbGwgdGhlIG1hdGNoaW5nIGNsaWVudCBub2Rlc1xuICAgKiAgICAgIDQuIGxvb3AgdGhyb3VnaCBhbGwgY2xpZW50IG5vZGVzIGZvdW5kIGFuZCBmb3IgZWFjaCBnZW5lcmF0ZSBhIGtleSB2YWx1ZVxuICAgKiAgICAgIDUuIGNvbXBhcmUgdGhlIGNsaWVudCBrZXkgdG8gdGhlIHNlcnZlciBrZXk7IG9uY2UgdGhlcmUgaXMgYSBtYXRjaCxcbiAgICogICAgICAgICAgd2UgaGF2ZSBvdXIgY2xpZW50IG5vZGVcbiAgICpcbiAgICogTk9URTogdGhpcyBvbmx5IHdvcmtzIHdoZW4gdGhlIGNsaWVudCB2aWV3IGlzIGFsbW9zdCBleGFjdGx5IHRoZSBzYW1lIGFzXG4gICAqIHRoZSBzZXJ2ZXIgdmlldy4gd2Ugd2lsbCBuZWVkIGFuIGltcHJvdmVtZW50IGhlcmUgaW4gdGhlIGZ1dHVyZSB0byBhY2NvdW50XG4gICAqIGZvciBzaXR1YXRpb25zIHdoZXJlIHRoZSBjbGllbnQgdmlldyBpcyBkaWZmZXJlbnQgaW4gc3RydWN0dXJlIGZyb20gdGhlXG4gICAqIHNlcnZlciB2aWV3XG4gICAqL1xuICBmaW5kQ2xpZW50Tm9kZShzZXJ2ZXJOb2RlQ29udGV4dDogTm9kZUNvbnRleHQpOiBIVE1MRWxlbWVudCB8IG51bGwge1xuICAgIHNlcnZlck5vZGVDb250ZXh0ID0gPE5vZGVDb250ZXh0PihzZXJ2ZXJOb2RlQ29udGV4dCB8fCB7fSk7XG5cbiAgICBjb25zdCBzZXJ2ZXJOb2RlID0gc2VydmVyTm9kZUNvbnRleHQubm9kZTtcbiAgICBjb25zdCByb290ID0gc2VydmVyTm9kZUNvbnRleHQucm9vdDtcblxuICAgIC8vIGlmIG5vIHNlcnZlciBvciBjbGllbnQgcm9vdCwgZG9uJ3QgZG8gYW55dGhpbmdcbiAgICBpZiAoIXJvb3QgfHwgIXJvb3Quc2VydmVyTm9kZSB8fCAhcm9vdC5jbGllbnROb2RlKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyB3ZSB1c2UgdGhlIHN0cmluZyBvZiB0aGUgbm9kZSB0byBjb21wYXJlIHRvIHRoZSBjbGllbnQgbm9kZSAmIGFzIGtleSBpblxuICAgIC8vIGNhY2hlXG4gICAgY29uc3Qgc2VydmVyTm9kZUtleSA9IHNlcnZlck5vZGVDb250ZXh0Lm5vZGVLZXkgfHwgZ2V0Tm9kZUtleUZvclByZWJvb3Qoc2VydmVyTm9kZUNvbnRleHQpO1xuXG4gICAgLy8gaWYgY2xpZW50IG5vZGUgYWxyZWFkeSBpbiBjYWNoZSwgcmV0dXJuIGl0XG4gICAgaWYgKHRoaXMuY2xpZW50Tm9kZUNhY2hlW3NlcnZlck5vZGVLZXldKSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGllbnROb2RlQ2FjaGVbc2VydmVyTm9kZUtleV0gYXMgSFRNTEVsZW1lbnQ7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHRoZSBzZWxlY3RvciBmb3IgY2xpZW50IG5vZGVzXG4gICAgY29uc3QgY2xhc3NOYW1lID0gKHNlcnZlck5vZGUuY2xhc3NOYW1lIHx8ICcnKS5yZXBsYWNlKCduZy1iaW5kaW5nJywgJycpLnRyaW0oKTtcbiAgICBsZXQgc2VsZWN0b3IgPSBzZXJ2ZXJOb2RlLnRhZ05hbWU7XG5cbiAgICBpZiAoc2VydmVyTm9kZS5pZCkge1xuICAgICAgc2VsZWN0b3IgKz0gYCMke3NlcnZlck5vZGUuaWR9YDtcbiAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSkge1xuICAgICAgc2VsZWN0b3IgKz0gYC4ke2NsYXNzTmFtZS5yZXBsYWNlKC8gL2csICcuJyl9YDtcbiAgICB9XG5cbiAgICAvLyBzZWxlY3QgYWxsIHBvc3NpYmxlIGNsaWVudCBub2RlcyBhbmQgbG9vayB0aHJvdWdoIHRoZW0gdG8gdHJ5IGFuZCBmaW5kIGFcbiAgICAvLyBtYXRjaFxuICAgIGNvbnN0IHJvb3RDbGllbnROb2RlID0gcm9vdC5jbGllbnROb2RlO1xuICAgIGxldCBjbGllbnROb2RlcyA9IHJvb3RDbGllbnROb2RlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuXG4gICAgLy8gaWYgbm90aGluZyBmb3VuZCwgdGhlbiBqdXN0IHRyeSB0aGUgdGFnIG5hbWUgYXMgYSBmaW5hbCBvcHRpb25cbiAgICBpZiAoIWNsaWVudE5vZGVzLmxlbmd0aCkge1xuICAgICAgY29uc29sZS5sb2coYG5vdGhpbmcgZm91bmQgZm9yICR7c2VsZWN0b3J9IHNvIHVzaW5nICR7c2VydmVyTm9kZS50YWdOYW1lfWApO1xuICAgICAgY2xpZW50Tm9kZXMgPSByb290Q2xpZW50Tm9kZS5xdWVyeVNlbGVjdG9yQWxsKHNlcnZlck5vZGUudGFnTmFtZSk7XG4gICAgfVxuXG4gICAgY29uc3QgbGVuZ3RoID0gY2xpZW50Tm9kZXMubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNsaWVudE5vZGUgPSBjbGllbnROb2Rlcy5pdGVtKGkpO1xuXG4gICAgICAvLyBnZXQgdGhlIGtleSBmb3IgdGhlIGNsaWVudCBub2RlXG4gICAgICBjb25zdCBjbGllbnROb2RlS2V5ID0gZ2V0Tm9kZUtleUZvclByZWJvb3Qoe1xuICAgICAgICByb290OiByb290LFxuICAgICAgICBub2RlOiBjbGllbnROb2RlXG4gICAgICB9KTtcblxuICAgICAgLy8gaWYgdGhlIGNsaWVudCBub2RlIGtleSBpcyBleGFjdCBtYXRjaCBmb3IgdGhlIHNlcnZlciBub2RlIGtleSwgdGhlbiB3ZVxuICAgICAgLy8gZm91bmQgdGhlIGNsaWVudCBub2RlXG4gICAgICBpZiAoY2xpZW50Tm9kZUtleSA9PT0gc2VydmVyTm9kZUtleSkge1xuICAgICAgICB0aGlzLmNsaWVudE5vZGVDYWNoZVtzZXJ2ZXJOb2RlS2V5XSA9IGNsaWVudE5vZGU7XG4gICAgICAgIHJldHVybiBjbGllbnROb2RlIGFzIEhUTUxFbGVtZW50O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHdlIGdldCBoZXJlIGFuZCB0aGVyZSBpcyBvbmUgY2xpZW50Tm9kZSwgdXNlIGl0IGFzIGEgZmFsbGJhY2tcbiAgICBpZiAoY2xpZW50Tm9kZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICB0aGlzLmNsaWVudE5vZGVDYWNoZVtzZXJ2ZXJOb2RlS2V5XSA9IGNsaWVudE5vZGVzWzBdO1xuICAgICAgcmV0dXJuIGNsaWVudE5vZGVzWzBdIGFzIEhUTUxFbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGlmIHdlIGdldCBoZXJlIGl0IG1lYW5zIHdlIGNvdWxkbid0IGZpbmQgdGhlIGNsaWVudCBub2RlIHNvIGdpdmUgdGhlIHVzZXJcbiAgICAvLyBhIHdhcm5pbmdcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICBgTm8gbWF0Y2hpbmcgY2xpZW50IG5vZGUgZm91bmQgZm9yICR7c2VydmVyTm9kZUtleX0uXG4gICAgICAgWW91IGNhbiBmaXggdGhpcyBieSBhc3NpZ25pbmcgdGhpcyBlbGVtZW50IGEgdW5pcXVlIGlkIGF0dHJpYnV0ZS5gXG4gICAgKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIl19