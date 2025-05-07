import type { WalletName } from '@solana/wallet-adapter-base';
import {
    BaseMessageSignerWalletAdapter,
    scopePollingDetectionStrategy,
    WalletNotConnectedError,
    WalletNotReadyError,
    WalletReadyState,
    WalletSignMessageError,
    WalletSignTransactionError,
} from '@solana/wallet-adapter-base';
import { Transaction, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { initialize } from './index.js';
import type { Cactus } from './window.js';
import { icon } from './icon.js';

export const CactusWalletName = 'Cactus' as WalletName<'Cactus'>;

export interface CactusWalletAdapterConfig {}

export class CactusWalletAdapter extends BaseMessageSignerWalletAdapter {
    name = CactusWalletName;
    url = 'https://www.mycactus.com/';
    icon = icon;
    readonly supportedTransactionVersions = new Set(['legacy', 0] as const);

    private _connecting: boolean;
    private _cactus: Cactus | null;
    private _publicKey: PublicKey | null;
    private _readyState: WalletReadyState =
        typeof window === 'undefined' || typeof document === 'undefined'
            ? WalletReadyState.Unsupported
            : WalletReadyState.NotDetected;

    constructor(config: CactusWalletAdapterConfig = {}) {
        super();
        this._connecting = false;
        this._cactus = null;
        this._publicKey = null;

        if (this._readyState !== WalletReadyState.Unsupported) {
            scopePollingDetectionStrategy(() => {
                if (window.cactus?.isCactusWallet) {
                    this._readyState = WalletReadyState.Installed;
                    this.emit('readyStateChange', this._readyState);
                    return true;
                }
                return false;
            });
        }
    }

    get publicKey() {
        return this._publicKey;
    }

    get connecting() {
        return this._connecting;
    }

    get readyState() {
        return this._readyState;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            if (this._readyState !== WalletReadyState.Installed) throw new WalletNotReadyError();

            this._connecting = true;

            if (!window.cactus) {
                throw new WalletNotReadyError();
            }

            initialize(window.cactus);
            this._cactus = window.cactus;

            const { publicKey } = await this._cactus.connect();
            this._publicKey = publicKey;

            this.emit('connect', publicKey);
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        const cactus = this._cactus;
        if (cactus) {
            await cactus.disconnect();
            this._cactus = null;
            this._publicKey = null;
        }

        this.emit('disconnect');
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        try {
            const cactus = this._cactus;
            if (!cactus) throw new WalletNotConnectedError();

            try {
                const signedTransaction = await cactus.signTransaction(transaction);
                return signedTransaction as T;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        try {
            const cactus = this._cactus;
            if (!cactus) throw new WalletNotConnectedError();

            try {
                return await cactus.signAllTransactions(transactions);
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            const cactus = this._cactus;
            if (!cactus) throw new WalletNotConnectedError();

            try {
                const { signature } = await cactus.signMessage(message);
                return signature;
            } catch (error: any) {
                throw new WalletSignMessageError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }
} 