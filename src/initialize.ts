import { registerWallet } from './register.js';
import { CactusWallet } from './wallet.js';
import type { Cactus } from './window.js';

export function initialize(cactus: Cactus): void {
    registerWallet(new CactusWallet(cactus));
}
