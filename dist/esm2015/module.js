/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModule } from '@angular/core';
import { EventReplayer } from './api/event.replayer';
import { PREBOOT_OPTIONS, PREBOOT_PROVIDER } from './provider';
import * as i0 from "@angular/core";
export class PrebootModule {
    static withConfig(opts) {
        return {
            ngModule: PrebootModule,
            providers: [{ provide: PREBOOT_OPTIONS, useValue: opts }]
        };
    }
}
PrebootModule.ɵfac = function PrebootModule_Factory(t) { return new (t || PrebootModule)(); };
PrebootModule.ɵmod = i0.ɵɵdefineNgModule({ type: PrebootModule });
PrebootModule.ɵinj = i0.ɵɵdefineInjector({ providers: [EventReplayer, PREBOOT_PROVIDER] });
(function () { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(PrebootModule, [{
        type: NgModule,
        args: [{
                providers: [EventReplayer, PREBOOT_PROVIDER]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBQ0gsT0FBTyxFQUFzQixRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFNUQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRW5ELE9BQU8sRUFBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxZQUFZLENBQUM7O0FBSzdELE1BQU0sT0FBTyxhQUFhO0lBQ3hCLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBb0I7UUFDcEMsT0FBTztZQUNMLFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLFNBQVMsRUFBRSxDQUFDLEVBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFDLENBQUM7U0FDeEQsQ0FBQztJQUNKLENBQUM7OzBFQU5VLGFBQWE7aURBQWIsYUFBYTtzREFGYixDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQzt1RkFFakMsYUFBYTtjQUh6QixRQUFRO2VBQUM7Z0JBQ1IsU0FBUyxFQUFFLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDO2FBQzdDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5pbXBvcnQge01vZHVsZVdpdGhQcm92aWRlcnMsIE5nTW9kdWxlfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHtFdmVudFJlcGxheWVyfSBmcm9tICcuL2FwaS9ldmVudC5yZXBsYXllcic7XG5pbXBvcnQge1ByZWJvb3RPcHRpb25zfSBmcm9tICcuL2NvbW1vbi9wcmVib290LmludGVyZmFjZXMnO1xuaW1wb3J0IHtQUkVCT09UX09QVElPTlMsIFBSRUJPT1RfUFJPVklERVJ9IGZyb20gJy4vcHJvdmlkZXInO1xuXG5ATmdNb2R1bGUoe1xuICBwcm92aWRlcnM6IFtFdmVudFJlcGxheWVyLCBQUkVCT09UX1BST1ZJREVSXVxufSlcbmV4cG9ydCBjbGFzcyBQcmVib290TW9kdWxlIHtcbiAgc3RhdGljIHdpdGhDb25maWcob3B0czogUHJlYm9vdE9wdGlvbnMpOiBNb2R1bGVXaXRoUHJvdmlkZXJzPFByZWJvb3RNb2R1bGU+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmdNb2R1bGU6IFByZWJvb3RNb2R1bGUsXG4gICAgICBwcm92aWRlcnM6IFt7cHJvdmlkZTogUFJFQk9PVF9PUFRJT05TLCB1c2VWYWx1ZTogb3B0c31dXG4gICAgfTtcbiAgfVxufVxuIl19