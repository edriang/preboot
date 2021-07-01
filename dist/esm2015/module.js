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
export class PrebootModule {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztHQU1HO0FBQ0gsT0FBTyxFQUFzQixRQUFRLEVBQUMsTUFBTSxlQUFlLENBQUM7QUFFNUQsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRW5ELE9BQU8sRUFBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFLN0QsTUFBTSxPQUFPLGFBQWE7SUFDeEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFvQjtRQUNwQyxPQUFPO1lBQ0wsUUFBUSxFQUFFLGFBQWE7WUFDdkIsU0FBUyxFQUFFLENBQUMsRUFBQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUMsQ0FBQztTQUN4RCxDQUFDO0lBQ0osQ0FBQzs7O1lBVEYsUUFBUSxTQUFDO2dCQUNSLFNBQVMsRUFBRSxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQzthQUM3QyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuaW1wb3J0IHtNb2R1bGVXaXRoUHJvdmlkZXJzLCBOZ01vZHVsZX0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7RXZlbnRSZXBsYXllcn0gZnJvbSAnLi9hcGkvZXZlbnQucmVwbGF5ZXInO1xuaW1wb3J0IHtQcmVib290T3B0aW9uc30gZnJvbSAnLi9jb21tb24vcHJlYm9vdC5pbnRlcmZhY2VzJztcbmltcG9ydCB7UFJFQk9PVF9PUFRJT05TLCBQUkVCT09UX1BST1ZJREVSfSBmcm9tICcuL3Byb3ZpZGVyJztcblxuQE5nTW9kdWxlKHtcbiAgcHJvdmlkZXJzOiBbRXZlbnRSZXBsYXllciwgUFJFQk9PVF9QUk9WSURFUl1cbn0pXG5leHBvcnQgY2xhc3MgUHJlYm9vdE1vZHVsZSB7XG4gIHN0YXRpYyB3aXRoQ29uZmlnKG9wdHM6IFByZWJvb3RPcHRpb25zKTogTW9kdWxlV2l0aFByb3ZpZGVyczxQcmVib290TW9kdWxlPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5nTW9kdWxlOiBQcmVib290TW9kdWxlLFxuICAgICAgcHJvdmlkZXJzOiBbe3Byb3ZpZGU6IFBSRUJPT1RfT1BUSU9OUywgdXNlVmFsdWU6IG9wdHN9XVxuICAgIH07XG4gIH1cbn1cbiJdfQ==