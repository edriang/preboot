/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ModuleWithProviders } from '@angular/core';
import { PrebootOptions } from './common/preboot.interfaces';
import * as i0 from "@angular/core";
export declare class PrebootModule {
    static withConfig(opts: PrebootOptions): ModuleWithProviders<PrebootModule>;
    static ɵfac: i0.ɵɵFactoryDef<PrebootModule, never>;
    static ɵmod: i0.ɵɵNgModuleDefWithMeta<PrebootModule, never, never, never>;
    static ɵinj: i0.ɵɵInjectorDef<PrebootModule>;
}
