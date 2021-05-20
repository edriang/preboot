import { getNodeKeyForPreboot } from '../common/get-node-key';
import { initAll, start, createOverlay, getAppRoot, handleEvents, createListenHandler, getSelection, createBuffer } from './event.recorder';
const eventRecorder = {
    start,
    createOverlay,
    getAppRoot,
    handleEvents,
    createListenHandler,
    getSelection,
    createBuffer
};
export const initFunctionName = 'prebootInitFn';
// exporting default options in case developer wants to use these + custom on
// top
export const defaultOptions = {
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
export function getEventRecorderCode() {
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
export function getInlineDefinition(customOptions) {
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
export function getInlineInvocation() {
    return `${initFunctionName}();`;
}
/**
 * Throw an error if issues with any options
 * @param opts
 */
export function validateOptions(opts) {
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
export function assign(target, ...optionSets) {
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
export function stringifyWithFunctions(obj) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lLnByZWJvb3QuY29kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9saWIvYXBpL2lubGluZS5wcmVib290LmNvZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBUUEsT0FBTyxFQUFDLG9CQUFvQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQsT0FBTyxFQUNMLE9BQU8sRUFDUCxLQUFLLEVBQ0wsYUFBYSxFQUNiLFVBQVUsRUFDVixZQUFZLEVBQ1osbUJBQW1CLEVBQ25CLFlBQVksRUFDWixZQUFZLEVBQ2IsTUFBTSxrQkFBa0IsQ0FBQztBQUUxQixNQUFNLGFBQWEsR0FBRztJQUNwQixLQUFLO0lBQ0wsYUFBYTtJQUNiLFVBQVU7SUFDVixZQUFZO0lBQ1osbUJBQW1CO0lBQ25CLFlBQVk7SUFDWixZQUFZO0NBQ2IsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQztBQUVoRCw2RUFBNkU7QUFDN0UsTUFBTTtBQUNOLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBbUI7SUFDNUMsTUFBTSxFQUFFLElBQUk7SUFDWixNQUFNLEVBQUUsSUFBSTtJQUNaLGNBQWMsRUFBRSxLQUFLO0lBRXJCLDBFQUEwRTtJQUMxRSw2QkFBNkI7SUFDN0IsY0FBYyxFQUFFO1FBQ2QseUNBQXlDO1FBQ3pDO1lBQ0UsUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixNQUFNLEVBQUUsQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDO1NBQzVEO1FBQ0QsRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBRWpELCtDQUErQztRQUMvQztZQUNFLFFBQVEsRUFBRSxPQUFPO1lBQ2pCLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNqQixjQUFjLEVBQUUsSUFBSTtZQUNwQixRQUFRLEVBQUUsQ0FBQyxFQUFF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QUksV0FBbUIsQ0FBQztJQUN4QixJQUFJLEVBQVUsQ0FBQztJQUNmLE9BQU8sWUFBWSxJQUFJLENBQUMsRUFBRTtRQUN4QixXQUFXLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVyQyxrQkFBa0I7UUFDbEIsRUFBRSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDbEUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRTlCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUMzQyxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BELFlBQVksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0tBQ3hDO0lBRUQsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge1ByZWJvb3RPcHRpb25zfSBmcm9tICcuLi9jb21tb24vcHJlYm9vdC5pbnRlcmZhY2VzJztcbmltcG9ydCB7Z2V0Tm9kZUtleUZvclByZWJvb3R9IGZyb20gJy4uL2NvbW1vbi9nZXQtbm9kZS1rZXknO1xuXG5pbXBvcnQge1xuICBpbml0QWxsLFxuICBzdGFydCxcbiAgY3JlYXRlT3ZlcmxheSxcbiAgZ2V0QXBwUm9vdCxcbiAgaGFuZGxlRXZlbnRzLFxuICBjcmVhdGVMaXN0ZW5IYW5kbGVyLFxuICBnZXRTZWxlY3Rpb24sXG4gIGNyZWF0ZUJ1ZmZlclxufSBmcm9tICcuL2V2ZW50LnJlY29yZGVyJztcblxuY29uc3QgZXZlbnRSZWNvcmRlciA9IHtcbiAgc3RhcnQsXG4gIGNyZWF0ZU92ZXJsYXksXG4gIGdldEFwcFJvb3QsXG4gIGhhbmRsZUV2ZW50cyxcbiAgY3JlYXRlTGlzdGVuSGFuZGxlcixcbiAgZ2V0U2VsZWN0aW9uLFxuICBjcmVhdGVCdWZmZXJcbn07XG5cbmV4cG9ydCBjb25zdCBpbml0RnVuY3Rpb25OYW1lID0gJ3ByZWJvb3RJbml0Rm4nO1xuXG4vLyBleHBvcnRpbmcgZGVmYXVsdCBvcHRpb25zIGluIGNhc2UgZGV2ZWxvcGVyIHdhbnRzIHRvIHVzZSB0aGVzZSArIGN1c3RvbSBvblxuLy8gdG9wXG5leHBvcnQgY29uc3QgZGVmYXVsdE9wdGlvbnMgPSA8UHJlYm9vdE9wdGlvbnM+e1xuICBidWZmZXI6IHRydWUsXG4gIHJlcGxheTogdHJ1ZSxcbiAgZGlzYWJsZU92ZXJsYXk6IGZhbHNlLFxuXG4gIC8vIHRoZXNlIGFyZSB0aGUgZGVmYXVsdCBldmVudHMgYXJlIGFyZSBsaXN0ZW5pbmcgZm9yIGFuIHRyYW5zZmVycmluZyBmcm9tXG4gIC8vIHNlcnZlciB2aWV3IHRvIGNsaWVudCB2aWV3XG4gIGV2ZW50U2VsZWN0b3JzOiBbXG4gICAgLy8gZm9yIHJlY29yZGluZyBjaGFuZ2VzIGluIGZvcm0gZWxlbWVudHNcbiAgICB7XG4gICAgICBzZWxlY3RvcjogJ2lucHV0LHRleHRhcmVhJyxcbiAgICAgIGV2ZW50czogWydrZXlwcmVzcycsICdrZXl1cCcsICdrZXlkb3duJywgJ2lucHV0JywgJ2NoYW5nZSddXG4gICAgfSxcbiAgICB7IHNlbGVjdG9yOiAnc2VsZWN0LG9wdGlvbicsIGV2ZW50czogWydjaGFuZ2UnXSB9LFxuXG4gICAgLy8gd2hlbiB1c2VyIGhpdHMgcmV0dXJuIGJ1dHRvbiBpbiBhbiBpbnB1dCBib3hcbiAgICB7XG4gICAgICBzZWxlY3RvcjogJ2lucHV0JyxcbiAgICAgIGV2ZW50czogWydrZXl1cCddLFxuICAgICAgcHJldmVudERlZmF1bHQ6IHRydWUsXG4gICAgICBrZXlDb2RlczogWzEzXSxcbiAgICAgIGZyZWV6ZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAvLyB3aGVuIHVzZXIgc3VibWl0IGZvcm0gKHByZXNzIGVudGVyLCBjbGljayBvbiBidXR0b24vaW5wdXRbdHlwZT1cInN1Ym1pdFwiXSlcbiAgICB7XG4gICAgICBzZWxlY3RvcjogJ2Zvcm0nLFxuICAgICAgZXZlbnRzOiBbJ3N1Ym1pdCddLFxuICAgICAgcHJldmVudERlZmF1bHQ6IHRydWUsXG4gICAgICBmcmVlemU6IHRydWVcbiAgICB9LFxuXG4gICAgLy8gZm9yIHRyYWNraW5nIGZvY3VzIChubyBuZWVkIHRvIHJlcGxheSlcbiAgICB7XG4gICAgICBzZWxlY3RvcjogJ2lucHV0LHRleHRhcmVhJyxcbiAgICAgIGV2ZW50czogWydmb2N1c2luJywgJ2ZvY3Vzb3V0JywgJ21vdXNlZG93bicsICdtb3VzZXVwJ10sXG4gICAgICByZXBsYXk6IGZhbHNlXG4gICAgfSxcblxuICAgIC8vIHVzZXIgY2xpY2tzIG9uIGEgYnV0dG9uXG4gICAge1xuICAgICAgc2VsZWN0b3I6ICdidXR0b24nLFxuICAgICAgZXZlbnRzOiBbJ2NsaWNrJ10sXG4gICAgICBwcmV2ZW50RGVmYXVsdDogdHJ1ZSxcbiAgICAgIGZyZWV6ZTogdHJ1ZVxuICAgIH1cbiAgXVxufTtcblxuLyoqXG4gKiBHZXQgdGhlIGV2ZW50IHJlY29yZGVyIGNvZGUgYmFzZWQgb24gYWxsIGZ1bmN0aW9ucyBpbiBldmVudC5yZWNvcmRlci50c1xuICogYW5kIHRoZSBnZXROb2RlS2V5Rm9yUHJlYm9vdCBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEV2ZW50UmVjb3JkZXJDb2RlKCk6IHN0cmluZyB7XG4gIGNvbnN0IGV2ZW50UmVjb3JkZXJGdW5jdGlvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgZm9yIChjb25zdCBmdW5jTmFtZSBpbiBldmVudFJlY29yZGVyKSB7XG4gICAgaWYgKGV2ZW50UmVjb3JkZXIuaGFzT3duUHJvcGVydHkoZnVuY05hbWUpKSB7XG4gICAgICBjb25zdCBmbiA9ICg8YW55PmV2ZW50UmVjb3JkZXIpW2Z1bmNOYW1lXS50b1N0cmluZygpO1xuICAgICAgY29uc3QgZm5DbGVhbmVkID0gZm4ucmVwbGFjZSgnY29tbW9uXzEuJywgJycpO1xuICAgICAgZXZlbnRSZWNvcmRlckZ1bmN0aW9ucy5wdXNoKGZuQ2xlYW5lZCk7XG4gICAgfVxuICB9XG5cbiAgLy8gdGhpcyBpcyBjb21tb24gZnVuY3Rpb24gdXNlZCB0byBnZXQgdGhlIG5vZGUga2V5XG4gIGV2ZW50UmVjb3JkZXJGdW5jdGlvbnMucHVzaChnZXROb2RlS2V5Rm9yUHJlYm9vdC50b1N0cmluZygpKTtcblxuICAvLyBhZGQgbmV3IGxpbmUgY2hhcmFjdGVycyBmb3IgcmVhZGFiaWxpdHlcbiAgcmV0dXJuICdcXG5cXG4nICsgZXZlbnRSZWNvcmRlckZ1bmN0aW9ucy5qb2luKCdcXG5cXG4nKSArICdcXG5cXG4nO1xufVxuXG4vKipcbiAqIFVzZWQgYnkgdGhlIHNlcnZlciBzaWRlIHZlcnNpb24gb2YgcHJlYm9vdC4gVGhlIG1haW4gcHVycG9zZSBpcyB0byBnZXQgdGhlXG4gKiBpbmxpbmUgY29kZSB0aGF0IGNhbiBiZSBpbnNlcnRlZCBpbnRvIHRoZSBzZXJ2ZXIgdmlldy5cbiAqIFJldHVybnMgdGhlIGRlZmluaXRpb25zIG9mIHRoZSBwcmVib290SW5pdCBmdW5jdGlvbiBjYWxsZWQgaW4gY29kZSByZXR1cm5lZCBieVxuICogZ2V0SW5saW5lSW52b2NhdGlvbiBmb3IgZWFjaCBzZXJ2ZXIgbm9kZSBzZXBhcmF0ZWx5LlxuICpcbiAqIEBwYXJhbSBjdXN0b21PcHRpb25zIFByZWJvb3RSZWNvcmRPcHRpb25zIHRoYXQgb3ZlcnJpZGUgdGhlIGRlZmF1bHRzXG4gKiBAcmV0dXJucyBHZW5lcmF0ZWQgaW5saW5lIHByZWJvb3QgY29kZSB3aXRoIGp1c3QgZnVuY3Rpb25zIGRlZmluaXRpb25zXG4gKiB0byBiZSB1c2VkIHNlcGFyYXRlbHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldElubGluZURlZmluaXRpb24oY3VzdG9tT3B0aW9ucz86IFByZWJvb3RPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3Qgb3B0cyA9IDxQcmVib290T3B0aW9ucz5hc3NpZ24oe30sIGRlZmF1bHRPcHRpb25zLCBjdXN0b21PcHRpb25zKTtcblxuICAvLyBzYWZldHkgY2hlY2sgdG8gbWFrZSBzdXJlIG9wdGlvbnMgcGFzc2VkIGluIGFyZSB2YWxpZFxuICB2YWxpZGF0ZU9wdGlvbnMob3B0cyk7XG5cbiAgY29uc3Qgc2NyaXB0Q29kZSA9IGdldEV2ZW50UmVjb3JkZXJDb2RlKCk7XG4gIGNvbnN0IG9wdHNTdHIgPSBzdHJpbmdpZnlXaXRoRnVuY3Rpb25zKG9wdHMpO1xuXG4gIC8vIHdyYXAgaW5saW5lIHByZWJvb3QgY29kZSB3aXRoIGEgc2VsZiBleGVjdXRpbmcgZnVuY3Rpb24gaW4gb3JkZXIgdG8gY3JlYXRlIHNjb3BlXG4gIGNvbnN0IGluaXRBbGxTdHIgPSBpbml0QWxsLnRvU3RyaW5nKCk7XG4gIHJldHVybiBgdmFyICR7aW5pdEZ1bmN0aW9uTmFtZX0gPSAoZnVuY3Rpb24oKSB7XG4gICAgICAke3NjcmlwdENvZGV9XG4gICAgICByZXR1cm4gKCR7aW5pdEFsbFN0ci5yZXBsYWNlKCdjb21tb25fMS4nLCAnJyl9KSgke29wdHNTdHJ9KTtcbiAgICB9KSgpO2A7XG59XG5cblxuLyoqXG4gKiBVc2VkIGJ5IHRoZSBzZXJ2ZXIgc2lkZSB2ZXJzaW9uIG9mIHByZWJvb3QuIFRoZSBtYWluIHB1cnBvc2UgaXMgdG8gZ2V0IHRoZVxuICogaW5saW5lIGNvZGUgdGhhdCBjYW4gYmUgaW5zZXJ0ZWQgaW50byB0aGUgc2VydmVyIHZpZXcuXG4gKiBJbnZva2VzIHRoZSBwcmVib290SW5pdCBmdW5jdGlvbiBkZWZpbmVkIGluIGdldElubGluZURlZmluaXRpb24gd2l0aCBwcm9wZXJcbiAqIHBhcmFtZXRlcnMuIEVhY2ggYXBwUm9vdCBzaG91bGQgZ2V0IGEgc2VwYXJhdGUgaW5saW5lZCBjb2RlIGZyb20gYSBzZXBhcmF0ZVxuICogY2FsbCB0byBnZXRJbmxpbmVJbnZvY2F0aW9uIGJ1dCBvbmx5IG9uZSBpbmxpbmVkIGNvZGUgZnJvbSBnZXRJbmxpbmVEZWZpbml0aW9uLlxuICpcbiAqIEByZXR1cm5zIEdlbmVyYXRlZCBpbmxpbmUgcHJlYm9vdCBjb2RlIHdpdGgganVzdCBpbnZvY2F0aW9ucyBvZiBmdW5jdGlvbnMgZnJvbVxuICogZ2V0SW5saW5lRGVmaW5pdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5saW5lSW52b2NhdGlvbigpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7aW5pdEZ1bmN0aW9uTmFtZX0oKTtgO1xufVxuXG4vKipcbiAqIFRocm93IGFuIGVycm9yIGlmIGlzc3VlcyB3aXRoIGFueSBvcHRpb25zXG4gKiBAcGFyYW0gb3B0c1xuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVPcHRpb25zKG9wdHM6IFByZWJvb3RPcHRpb25zKSB7XG4gIGlmICghb3B0cy5hcHBSb290IHx8ICFvcHRzLmFwcFJvb3QubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1RoZSBhcHBSb290IGlzIG1pc3NpbmcgZnJvbSBwcmVib290IG9wdGlvbnMuICcgK1xuICAgICAgICAnVGhpcyBpcyBuZWVkZWQgdG8gZmluZCB0aGUgcm9vdCBvZiB5b3VyIGFwcGxpY2F0aW9uLiAnICtcbiAgICAgICAgJ1NldCB0aGlzIHZhbHVlIGluIHRoZSBwcmVib290IG9wdGlvbnMgdG8gYmUgYSBzZWxlY3RvciBmb3IgdGhlIHJvb3QgZWxlbWVudCBvZiB5b3VyIGFwcC4nXG4gICAgKTtcbiAgfVxufVxuXG4vKipcbiAqIE9iamVjdC5hc3NpZ24oKSBpcyBub3QgZnVsbHkgc3VwcG9ydGluZyBpbiBUeXBlU2NyaXB0LCBzb1xuICogdGhpcyBpcyBqdXN0IGEgc2ltcGxlIGltcGxlbWVudGF0aW9uIG9mIGl0XG4gKlxuICogQHBhcmFtIHRhcmdldCBUaGUgdGFyZ2V0IG9iamVjdFxuICogQHBhcmFtIG9wdGlvblNldHMgQW55IG51bWJlciBvZiBhZGRpdGlvbiBvYmplY3RzIHRoYXQgYXJlIGFkZGVkIG9uIHRvcCBvZiB0aGVcbiAqIHRhcmdldFxuICogQHJldHVybnMgQSBuZXcgb2JqZWN0IHRoYXQgY29udGFpbnMgYWxsIHRoZSBtZXJnZWQgdmFsdWVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhc3NpZ24odGFyZ2V0OiBPYmplY3QsIC4uLm9wdGlvblNldHM6IGFueVtdKTogT2JqZWN0IHtcbiAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8IHRhcmdldCA9PT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuICB9XG5cbiAgY29uc3Qgb3V0cHV0ID0gT2JqZWN0KHRhcmdldCk7XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBvcHRpb25TZXRzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgIGNvbnN0IHNvdXJjZSA9IG9wdGlvblNldHNbaW5kZXhdO1xuICAgIGlmIChzb3VyY2UgIT09IHVuZGVmaW5lZCAmJiBzb3VyY2UgIT09IG51bGwpIHtcbiAgICAgIGZvciAoY29uc3QgbmV4dEtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eSAmJiBzb3VyY2UuaGFzT3duUHJvcGVydHkobmV4dEtleSkpIHtcbiAgICAgICAgICBvdXRwdXRbbmV4dEtleV0gPSBzb3VyY2VbbmV4dEtleV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0cHV0O1xufVxuXG4vKipcbiAqIFN0cmluZ2lmeSBhbiBvYmplY3QgYW5kIGluY2x1ZGUgZnVuY3Rpb25zLiBUaGlzIGlzIG5lZWRlZCBzaW5jZSB3ZSBhcmVcbiAqIGxldHRpbmcgdXNlcnMgcGFzcyBpbiBvcHRpb25zIHRoYXQgaW5jbHVkZSBjdXN0b20gZnVuY3Rpb25zIGZvciB0aGluZ3MgbGlrZVxuICogdGhlIGZyZWV6ZSBoYW5kbGVyIG9yIGFjdGlvbiB3aGVuIGFuIGV2ZW50IG9jY3Vyc1xuICpcbiAqIEBwYXJhbSBvYmogVGhpcyBpcyB0aGUgb2JqZWN0IHlvdSB3YW50IHRvIHN0cmluZ2lmeSB0aGF0IGluY2x1ZGVzIHNvbWVcbiAqIGZ1bmN0aW9uc1xuICogQHJldHVybnMgVGhlIHN0cmluZ2lmaWVkIHZlcnNpb24gb2YgYW4gb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlXaXRoRnVuY3Rpb25zKG9iajogT2JqZWN0KTogc3RyaW5nIHtcbiAgY29uc3QgRlVOQ19TVEFSVCA9ICdTVEFSVF9GVU5DVElPTl9IRVJFJztcbiAgY29uc3QgRlVOQ19TVE9QID0gJ1NUT1BfRlVOQ1RJT05fSEVSRSc7XG5cbiAgLy8gZmlyc3Qgc3RyaW5naWZ5IGV4Y2VwdCBtYXJrIG9mZiBmdW5jdGlvbnMgd2l0aCBtYXJrZXJzXG4gIGxldCBzdHIgPSBKU09OLnN0cmluZ2lmeShvYmosIGZ1bmN0aW9uKF9rZXksIHZhbHVlKSB7XG4gICAgLy8gaWYgdGhlIHZhbHVlIGlzIGEgZnVuY3Rpb24sIHdlIHdhbnQgdG8gd3JhcCBpdCB3aXRoIG1hcmtlcnNcbiAgICBpZiAoISEodmFsdWUgJiYgdmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY2FsbCAmJiB2YWx1ZS5hcHBseSkpIHtcbiAgICAgIHJldHVybiBGVU5DX1NUQVJUICsgdmFsdWUudG9TdHJpbmcoKSArIEZVTkNfU1RPUDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gbm93IHdlIHVzZSB0aGUgbWFya2VycyB0byByZXBsYWNlIGZ1bmN0aW9uIHN0cmluZ3Mgd2l0aCBhY3R1YWwgZnVuY3Rpb25zXG4gIGxldCBzdGFydEZ1bmNJZHggPSBzdHIuaW5kZXhPZihGVU5DX1NUQVJUKTtcbiAgbGV0IHN0b3BGdW5jSWR4OiBudW1iZXI7XG4gIGxldCBmbjogc3RyaW5nO1xuICB3aGlsZSAoc3RhcnRGdW5jSWR4ID49IDApIHtcbiAgICBzdG9wRnVuY0lkeCA9IHN0ci5pbmRleE9mKEZVTkNfU1RPUCk7XG5cbiAgICAvLyBwdWxsIHN0cmluZyBvdXRcbiAgICBmbiA9IHN0ci5zdWJzdHJpbmcoc3RhcnRGdW5jSWR4ICsgRlVOQ19TVEFSVC5sZW5ndGgsIHN0b3BGdW5jSWR4KTtcbiAgICBmbiA9IGZuLnJlcGxhY2UoL1xcXFxuL2csICdcXG4nKTtcblxuICAgIHN0ciA9IHN0ci5zdWJzdHJpbmcoMCwgc3RhcnRGdW5jSWR4IC0gMSkgKyBmbiArXG4gICAgICBzdHIuc3Vic3RyaW5nKHN0b3BGdW5jSWR4ICsgRlVOQ19TVE9QLmxlbmd0aCArIDEpO1xuICAgIHN0YXJ0RnVuY0lkeCA9IHN0ci5pbmRleE9mKEZVTkNfU1RBUlQpO1xuICB9XG5cbiAgcmV0dXJuIHN0cjtcbn1cbiJdfQ==