(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common'), require('rxjs/operators')) :
    typeof define === 'function' && define.amd ? define('preboot', ['exports', '@angular/core', '@angular/common', 'rxjs/operators'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.preboot = {}, global.ng.core, global.ng.common, global.rxjs.operators));
}(this, (function (exports, core, common, operators) { 'use strict';

    /**
     * Attempt to generate key from node position in the DOM
     */
    function getNodeKeyForPreboot(nodeContext) {
        var ancestors = [];
        var root = nodeContext.root;
        var node = nodeContext.node;
        var temp = node;
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
        var name = node.nodeName || 'unknown';
        var key = name;
        var len = ancestors.length;
        for (var i = len - 1; i >= 0; i--) {
            temp = ancestors[i];
            if (temp.childNodes && i > 0) {
                for (var j = 0, n = 1; j < temp.childNodes.length; j++) {
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
    var PREBOOT_NONCE = new core.InjectionToken('PrebootNonce');

    /**
     * @license
     * Copyright Google LLC All Rights Reserved.
     *
     * Use of this source code is governed by an MIT-style license that can be
     * found in the LICENSE file at https://angular.io/license
     */

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }
    var __assign = function () {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    function __rest(s, e) {
        var t = {};
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
            r = Reflect.decorate(decorators, target, key, desc);
        else
            for (var i = decorators.length - 1; i >= 0; i--)
                if (d = decorators[i])
                    r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }
    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); };
    }
    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
            return Reflect.metadata(metadataKey, metadataValue);
    }
    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try {
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            } }
            function rejected(value) { try {
                step(generator["throw"](value));
            }
            catch (e) {
                reject(e);
            } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }
    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function () { if (t[0] & 1)
                throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f)
                throw new TypeError("Generator is already executing.");
            while (_)
                try {
                    if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                        return t;
                    if (y = 0, t)
                        op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2])
                                _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                }
                catch (e) {
                    op = [6, e];
                    y = 0;
                }
                finally {
                    f = t = 0;
                }
            if (op[0] & 5)
                throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    }
    var __createBinding = Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    });
    function __exportStar(m, o) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
                __createBinding(o, m, p);
    }
    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
            return m.call(o);
        if (o && typeof o.length === "number")
            return {
                next: function () {
                    if (o && i >= o.length)
                        o = void 0;
                    return { value: o && o[i++], done: !o };
                }
            };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
            return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                ar.push(r.value);
        }
        catch (error) {
            e = { error: error };
        }
        finally {
            try {
                if (r && !r.done && (m = i["return"]))
                    m.call(i);
            }
            finally {
                if (e)
                    throw e.error;
            }
        }
        return ar;
    }
    /** @deprecated */
    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }
    /** @deprecated */
    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    function __spreadArray(to, from) {
        for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
            to[j] = from[i];
        return to;
    }
    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }
    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n])
            i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try {
            step(g[n](v));
        }
        catch (e) {
            settle(q[0][3], e);
        } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length)
            resume(q[0][0], q[0][1]); }
    }
    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }
    function __asyncValues(o) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function (v) { resolve({ value: v, done: d }); }, reject); }
    }
    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) {
            Object.defineProperty(cooked, "raw", { value: raw });
        }
        else {
            cooked.raw = raw;
        }
        return cooked;
    }
    ;
    var __setModuleDefault = Object.create ? (function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function (o, v) {
        o["default"] = v;
    };
    function __importStar(mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    }
    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }
    function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f)
            throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
            throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }
    function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (kind === "m")
            throw new TypeError("Private method is not writable");
        if (kind === "a" && !f)
            throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
            throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    }

    function _window() {
        return {
            prebootData: window['prebootData'],
            getComputedStyle: window.getComputedStyle,
            document: document
        };
    }
    var EventReplayer = /** @class */ (function () {
        function EventReplayer() {
            this.clientNodeCache = {};
            this.replayStarted = false;
        }
        /**
         * Window setting and getter to facilitate testing of window
         * in non-browser environments
         */
        EventReplayer.prototype.setWindow = function (win) {
            this.win = win;
        };
        /**
         * Window setting and getter to facilitate testing of window
         * in non-browser environments
         */
        EventReplayer.prototype.getWindow = function () {
            if (!this.win) {
                this.win = _window();
            }
            return this.win;
        };
        /**
         * Replay all events for all apps. this can only be run once.
         * if called multiple times, will only do something once
         */
        EventReplayer.prototype.replayAll = function () {
            var _this = this;
            if (this.replayStarted) {
                return;
            }
            else {
                this.replayStarted = true;
            }
            // loop through each of the preboot apps
            var prebootData = this.getWindow().prebootData || {};
            var apps = prebootData.apps || [];
            apps.forEach(function (appData) { return _this.replayForApp(appData); });
            // once all events have been replayed and buffers switched, then we cleanup preboot
            this.cleanup(prebootData);
        };
        /**
         * Replay all events for one app (most of the time there is just one app)
         * @param appData
         */
        EventReplayer.prototype.replayForApp = function (appData) {
            var _this = this;
            appData = (appData || {});
            // try catch around events b/c even if error occurs, we still move forward
            try {
                var events = appData.events || [];
                // replay all the events from the server view onto the client view
                events.forEach(function (event) { return _this.replayEvent(appData, event); });
            }
            catch (ex) {
                console.error(ex);
            }
            // if we are buffering, switch the buffers
            this.switchBuffer(appData);
        };
        /**
         * Replay one particular event
         * @param appData
         * @param prebootEvent
         */
        EventReplayer.prototype.replayEvent = function (appData, prebootEvent) {
            appData = (appData || {});
            prebootEvent = (prebootEvent || {});
            var event = prebootEvent.event;
            var serverNode = prebootEvent.node || {};
            var nodeKey = prebootEvent.nodeKey;
            var clientNode = this.findClientNode({
                root: appData.root,
                node: serverNode,
                nodeKey: nodeKey
            });
            // if client node can't be found, log a warning
            if (!clientNode) {
                console.warn("Trying to dispatch event " + event.type + " to node " + nodeKey + "\n        but could not find client node. Server node is: " + serverNode);
                return;
            }
            // now dispatch events and whatnot to the client node
            clientNode.checked = serverNode.checked;
            clientNode.selected = serverNode.selected;
            clientNode.value = serverNode.value;
            clientNode.dispatchEvent(event);
        };
        /**
         * Switch the buffer for one particular app (i.e. display the client
         * view and destroy the server view)
         * @param appData
         */
        EventReplayer.prototype.switchBuffer = function (appData) {
            appData = (appData || {});
            var root = (appData.root || {});
            var serverView = root.serverNode;
            var clientView = root.clientNode;
            // if no client view or the server view is the body or client
            // and server view are the same, then don't do anything and return
            if (!clientView || !serverView || serverView === clientView || serverView.nodeName === 'BODY') {
                return;
            }
            // do a try-catch just in case something messed up
            try {
                // get the server view display mode
                var gcs = this.getWindow().getComputedStyle;
                var display = gcs(serverView).getPropertyValue('display') || 'block';
                // first remove the server view
                serverView.remove ? serverView.remove() : (serverView.style.display = 'none');
                // now add the client view
                clientView.style.display = display;
            }
            catch (ex) {
                console.error(ex);
            }
        };
        /**
         * Finally, set focus, remove all the event listeners and remove
         * any freeze screen that may be there
         * @param prebootData
         */
        EventReplayer.prototype.cleanup = function (prebootData) {
            var e_1, _a;
            var _this = this;
            prebootData = prebootData || {};
            var listeners = prebootData.listeners || [];
            // set focus on the active node AFTER a small delay to ensure buffer
            // switched
            var activeNode = prebootData.activeNode;
            if (activeNode != null) {
                setTimeout(function () { return _this.setFocus(activeNode); }, 1);
            }
            try {
                // remove all event listeners
                for (var listeners_1 = __values(listeners), listeners_1_1 = listeners_1.next(); !listeners_1_1.done; listeners_1_1 = listeners_1.next()) {
                    var listener = listeners_1_1.value;
                    listener.node.removeEventListener(listener.eventName, listener.handler);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (listeners_1_1 && !listeners_1_1.done && (_a = listeners_1.return)) _a.call(listeners_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // remove the freeze overlay if it exists
            var doc = this.getWindow().document;
            var prebootOverlay = doc.getElementById('prebootOverlay');
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
                var completeEvent = new CustomEvent('PrebootComplete');
                doc.dispatchEvent(completeEvent);
            }
            else {
                console.warn("Could not dispatch PrebootComplete event.\n       You can fix this by including a polyfill for CustomEvent.");
            }
        };
        EventReplayer.prototype.setFocus = function (activeNode) {
            // only do something if there is an active node
            if (!activeNode || !activeNode.node || !activeNode.nodeKey) {
                return;
            }
            // find the client node in the new client view
            var clientNode = this.findClientNode(activeNode);
            if (clientNode) {
                // set focus on the client node
                clientNode.focus();
                // set selection if a modern browser (i.e. IE9+, etc.)
                var selection = activeNode.selection;
                if (clientNode.setSelectionRange && selection) {
                    try {
                        clientNode
                            .setSelectionRange(selection.start, selection.end, selection.direction);
                    }
                    catch (ex) { }
                }
            }
        };
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
        EventReplayer.prototype.findClientNode = function (serverNodeContext) {
            serverNodeContext = (serverNodeContext || {});
            var serverNode = serverNodeContext.node;
            var root = serverNodeContext.root;
            // if no server or client root, don't do anything
            if (!root || !root.serverNode || !root.clientNode) {
                return null;
            }
            // we use the string of the node to compare to the client node & as key in
            // cache
            var serverNodeKey = serverNodeContext.nodeKey || getNodeKeyForPreboot(serverNodeContext);
            // if client node already in cache, return it
            if (this.clientNodeCache[serverNodeKey]) {
                return this.clientNodeCache[serverNodeKey];
            }
            // get the selector for client nodes
            var className = (serverNode.className || '').replace('ng-binding', '').trim();
            var selector = serverNode.tagName;
            if (serverNode.id) {
                selector += "#" + serverNode.id;
            }
            else if (className) {
                selector += "." + className.replace(/ /g, '.');
            }
            // select all possible client nodes and look through them to try and find a
            // match
            var rootClientNode = root.clientNode;
            var clientNodes = rootClientNode.querySelectorAll(selector);
            // if nothing found, then just try the tag name as a final option
            if (!clientNodes.length) {
                console.log("nothing found for " + selector + " so using " + serverNode.tagName);
                clientNodes = rootClientNode.querySelectorAll(serverNode.tagName);
            }
            var length = clientNodes.length;
            for (var i = 0; i < length; i++) {
                var clientNode = clientNodes.item(i);
                // get the key for the client node
                var clientNodeKey = getNodeKeyForPreboot({
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
            console.warn("No matching client node found for " + serverNodeKey + ".\n       You can fix this by assigning this element a unique id attribute.");
            return null;
        };
        return EventReplayer;
    }());

    /**
     * Called right away to initialize preboot
     *
     * @param opts All the preboot options
     * @param win
     */
    function initAll(opts, win) {
        var theWindow = (win || window);
        // Add the preboot options to the preboot data and then add the data to
        // the window so it can be used later by the client.
        // Only set new options if they're not already set - we may have multiple app roots
        // and each of them invokes the init function separately.
        var data = (theWindow.prebootData = {
            opts: opts,
            apps: [],
            listeners: []
        });
        return function () { return start(data, theWindow); };
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
        var theWindow = (win || window);
        var _document = (theWindow.document || {});
        // Remove the current script from the DOM so that child indexes match
        // between the client & the server. The script is already running so it
        // doesn't affect it.
        var currentScript = _document.currentScript ||
            // Support: IE 9-11 only
            // IE doesn't support document.currentScript. Since the script is invoked
            // synchronously, though, the current running script is just the last one
            // currently in the document.
            [].slice.call(_document.getElementsByTagName('script'), -1)[0];
        if (!currentScript) {
            console.error('Preboot initialization failed, no currentScript has been detected.');
            return;
        }
        var serverNode = currentScript.parentNode;
        if (!serverNode) {
            console.error('Preboot initialization failed, the script is detached');
            return;
        }
        serverNode.removeChild(currentScript);
        var opts = prebootData.opts || {};
        var eventSelectors = opts.eventSelectors || [];
        // get the root info
        var appRoot = prebootData.opts ? getAppRoot(_document, prebootData.opts, serverNode) : null;
        // we track all events for each app in the prebootData object which is on
        // the global scope; each `start` invocation adds data for one app only.
        var appData = { root: appRoot, events: [] };
        if (prebootData.apps) {
            prebootData.apps.push(appData);
        }
        eventSelectors = eventSelectors.map(function (eventSelector) {
            if (!eventSelector.hasOwnProperty('replay')) {
                eventSelector.replay = true;
            }
            return eventSelector;
        });
        // loop through all the eventSelectors and create event handlers
        eventSelectors.forEach(function (eventSelector) { return handleEvents(_document, prebootData, appData, eventSelector); });
    }
    /**
     * Create an overlay div and add it to the DOM so it can be used
     * if a freeze event occurs
     *
     * @param _document The global document object (passed in for testing purposes)
     * @returns Element The overlay node is returned
     */
    function createOverlay(_document) {
        var overlay = _document.createElement('div');
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
        var root = { serverNode: serverNode };
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
        var serverRoot = appData.root.serverNode;
        // don't do anything if no server root
        if (!serverRoot) {
            return;
        }
        // Attach delegated event listeners for each event selector.
        // We need to use delegated events as only the top level server node
        // exists at this point.
        eventSelector.events.forEach(function (eventName) {
            // get the appropriate handler and add it as an event listener
            var handler = createListenHandler(_document, prebootData, eventSelector, appData);
            // attach the handler in the capture phase so that it fires even if
            // one of the handlers below calls stopPropagation()
            serverRoot.addEventListener(eventName, handler, true);
            // need to keep track of listeners so we can do node.removeEventListener()
            // when preboot done
            if (prebootData.listeners) {
                prebootData.listeners.push({
                    node: serverRoot,
                    eventName: eventName,
                    handler: handler
                });
            }
        });
    }
    /**
     * Create handler for events that we will record
     */
    function createListenHandler(_document, prebootData, eventSelector, appData) {
        var CARET_EVENTS = ['keyup', 'keydown', 'focusin', 'mouseup', 'mousedown'];
        var CARET_NODES = ['INPUT', 'TEXTAREA'];
        // Support: IE 9-11 only
        // IE uses a prefixed `matches` version
        var matches = _document.documentElement.matches ||
            _document.documentElement.msMatchesSelector;
        var opts = prebootData.opts;
        return function (event) {
            var node = event.target;
            // a delegated handlers on document is used so we need to check if
            // event target matches a desired selector
            if (!matches.call(node, eventSelector.selector)) {
                return;
            }
            var root = appData.root;
            var eventName = event.type;
            // if no node or no event name, just return
            if (!node || !eventName) {
                return;
            }
            // if key codes set for eventSelector, then don't do anything if event
            // doesn't include key
            var keyCodes = eventSelector.keyCodes;
            if (keyCodes && keyCodes.length) {
                var matchingKeyCodes = keyCodes.filter(function (keyCode) { return event.which === keyCode; });
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
            var nodeKey = getNodeKeyForPreboot({ root: root, node: node });
            // record active node
            if (CARET_EVENTS.indexOf(eventName) >= 0) {
                // if it's an caret node, get the selection for the active node
                var isCaretNode = CARET_NODES.indexOf(node.tagName ? node.tagName : '') >= 0;
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
                var overlay_1 = root.overlay;
                // show the overlay
                overlay_1.style.display = 'block';
                // hide the overlay after 10 seconds just in case preboot.complete() never
                // called
                setTimeout(function () {
                    overlay_1.style.display = 'none';
                }, 10000);
            }
            // we will record events for later replay unless explicitly marked as
            // doNotReplay
            if (eventSelector.replay) {
                appData.events.push({
                    node: node,
                    nodeKey: nodeKey,
                    event: event,
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
        var nodeValue = node.value || '';
        var selection = {
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
        var serverNode = root.serverNode;
        // if no rootServerNode OR the selector is on the entire html doc or the body
        // OR no parentNode, don't buffer
        if (!serverNode || !serverNode.parentNode ||
            serverNode === document.documentElement || serverNode === document.body) {
            return serverNode;
        }
        // create shallow clone of server root
        var rootClientNode = serverNode.cloneNode(false);
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

    var eventRecorder = {
        start: start,
        createOverlay: createOverlay,
        getAppRoot: getAppRoot,
        handleEvents: handleEvents,
        createListenHandler: createListenHandler,
        getSelection: getSelection,
        createBuffer: createBuffer
    };
    var initFunctionName = 'prebootInitFn';
    // exporting default options in case developer wants to use these + custom on
    // top
    var defaultOptions = {
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
        var eventRecorderFunctions = [];
        for (var funcName in eventRecorder) {
            if (eventRecorder.hasOwnProperty(funcName)) {
                var fn = eventRecorder[funcName].toString();
                var fnCleaned = fn.replace('common_1.', '');
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
        var opts = assign({}, defaultOptions, customOptions);
        // safety check to make sure options passed in are valid
        validateOptions(opts);
        var scriptCode = getEventRecorderCode();
        var optsStr = stringifyWithFunctions(opts);
        // wrap inline preboot code with a self executing function in order to create scope
        var initAllStr = initAll.toString();
        return "var " + initFunctionName + " = (function() {\n      " + scriptCode + "\n      return (" + initAllStr.replace('common_1.', '') + ")(" + optsStr + ");\n    })();";
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
        return initFunctionName + "();";
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
    function assign(target) {
        var optionSets = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            optionSets[_i - 1] = arguments[_i];
        }
        if (target === undefined || target === null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        var output = Object(target);
        for (var index = 0; index < optionSets.length; index++) {
            var source = optionSets[index];
            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
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
        var FUNC_START = 'START_FUNCTION_HERE';
        var FUNC_STOP = 'STOP_FUNCTION_HERE';
        // first stringify except mark off functions with markers
        var str = JSON.stringify(obj, function (_key, value) {
            // if the value is a function, we want to wrap it with markers
            if (!!(value && value.constructor && value.call && value.apply)) {
                return FUNC_START + value.toString() + FUNC_STOP;
            }
            else {
                return value;
            }
        });
        // now we use the markers to replace function strings with actual functions
        var startFuncIdx = str.indexOf(FUNC_START);
        var stopFuncIdx;
        var fn;
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
    var PREBOOT_SCRIPT_CLASS = 'preboot-inline-script';
    var PREBOOT_OPTIONS = new core.InjectionToken('PrebootOptions');
    function createScriptFromCode(doc, nonce, inlineCode) {
        var script = doc.createElement('script');
        if (nonce) {
            script.nonce = nonce;
        }
        script.className = PREBOOT_SCRIPT_CLASS;
        script.textContent = inlineCode;
        return script;
    }
    function PREBOOT_FACTORY(doc, prebootOpts, nonce, platformId, appRef, eventReplayer) {
        return function () {
            validateOptions(prebootOpts);
            if (common.isPlatformServer(platformId)) {
                var inlineCodeDefinition = getInlineDefinition(prebootOpts);
                var scriptWithDefinition = createScriptFromCode(doc, nonce, inlineCodeDefinition);
                var inlineCodeInvocation_1 = getInlineInvocation();
                var existingScripts = doc.getElementsByClassName(PREBOOT_SCRIPT_CLASS);
                // Check to see if preboot scripts are already inlined before adding them
                // to the DOM. If they are, update the nonce to be current.
                if (existingScripts.length === 0) {
                    var baseList = [];
                    var appRootSelectors = baseList.concat(prebootOpts.appRoot);
                    doc.head.appendChild(scriptWithDefinition);
                    appRootSelectors
                        .map(function (selector) { return ({
                        selector: selector,
                        appRootElem: doc.querySelector(selector)
                    }); })
                        .forEach(function (_a) {
                        var selector = _a.selector, appRootElem = _a.appRootElem;
                        if (!appRootElem) {
                            console.log("No server node found for selector: " + selector);
                            return;
                        }
                        var scriptWithInvocation = createScriptFromCode(doc, nonce, inlineCodeInvocation_1);
                        appRootElem.insertBefore(scriptWithInvocation, appRootElem.firstChild);
                    });
                }
                else if (existingScripts.length > 0 && nonce) {
                    existingScripts[0].nonce = nonce;
                }
            }
            if (common.isPlatformBrowser(platformId)) {
                var replay = prebootOpts.replay != null ? prebootOpts.replay : true;
                if (replay) {
                    appRef.isStable
                        .pipe(operators.filter(function (stable) { return stable; }), operators.take(1)).subscribe(function () {
                        eventReplayer.replayAll();
                    });
                }
            }
        };
    }
    var PREBOOT_PROVIDER = {
        provide: core.APP_BOOTSTRAP_LISTENER,
        useFactory: PREBOOT_FACTORY,
        deps: [
            common.DOCUMENT,
            PREBOOT_OPTIONS,
            [new core.Optional(), new core.Inject(PREBOOT_NONCE)],
            core.PLATFORM_ID,
            core.ApplicationRef,
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
    var PrebootModule = /** @class */ (function () {
        function PrebootModule() {
        }
        PrebootModule.withConfig = function (opts) {
            return {
                ngModule: PrebootModule,
                providers: [{ provide: PREBOOT_OPTIONS, useValue: opts }]
            };
        };
        return PrebootModule;
    }());
    PrebootModule.decorators = [
        { type: core.NgModule, args: [{
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

    exports.EventReplayer = EventReplayer;
    exports.PREBOOT_NONCE = PREBOOT_NONCE;
    exports.PrebootModule = PrebootModule;
    exports._window = _window;
    exports.assign = assign;
    exports.createBuffer = createBuffer;
    exports.createListenHandler = createListenHandler;
    exports.createOverlay = createOverlay;
    exports.defaultOptions = defaultOptions;
    exports.getAppRoot = getAppRoot;
    exports.getEventRecorderCode = getEventRecorderCode;
    exports.getInlineDefinition = getInlineDefinition;
    exports.getInlineInvocation = getInlineInvocation;
    exports.getNodeKeyForPreboot = getNodeKeyForPreboot;
    exports.getSelection = getSelection;
    exports.handleEvents = handleEvents;
    exports.initAll = initAll;
    exports.initFunctionName = initFunctionName;
    exports.start = start;
    exports.stringifyWithFunctions = stringifyWithFunctions;
    exports.validateOptions = validateOptions;
    exports.ɵa = PREBOOT_OPTIONS;
    exports.ɵb = PREBOOT_FACTORY;
    exports.ɵc = PREBOOT_PROVIDER;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=preboot.umd.js.map
