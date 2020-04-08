/*********************************************************************
 * Copyright (c) 2018-2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import * as WS from 'ws';
import { ILogger } from '@theia/core';

/**
 * Websocket class wapper on top of ws package in order to handle reconnect in case of failures
 */
export class Websocket {

    /**
     * Logger.
     */
    private readonly logger: ILogger;

    /**
     * Delay/interval before trying to reconnect (2 seconds)
     */
    private static RECONNECT_INTERVAL: number = 2000;

    /**
     * Instance of the websocket library. (keeping it private)
     */
    private instance: WS;

    /**
     * URL on which we want to be connected
     */
    private readonly url: string;

    /**
     * Open URL when constructing it.
     */
    constructor(logger: ILogger, url: string) {
        this.logger = logger;
        this.url = url;
        this.open();
    }

    /**
     * Open the websocket. If error, try to reconnect
     * If success, register the callbacks.
     */
    open(): void {
        this.instance = new WS(this.url);

        // When open, add our callback
        this.instance.on('open', () => {
            this.onOpen(this.url);
        });

        // on message callback
        this.instance.on('message', (data: WS.Data) => {
            this.onMessage(data);
        });

        // if closed, check error code
        this.instance.on('close', (code: number, reason: string) => {
            // reconnect if closed not normally
            if (code !== 1000) {
                this.reconnect(reason);
            }
            this.onClose(reason);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.instance.on('error', (e: any) => {
            if ('ECONNREFUSED' === e.code) {
                this.reconnect(e);
            } else {
                this.onError(e);
            }
        });
    }
    public send(data: WS.Data): void {
        try {
            this.instance.send(data);
        } catch (e) {
            this.instance.emit('error', e);
        }
    }
    private reconnect(reason: string): void {
        this.logger.debug(`WebSocket: Reconnecting in ${Websocket.RECONNECT_INTERVAL}ms due to ${reason}`);
        this.instance.removeAllListeners();
        setTimeout(() => {
            this.logger.debug('Remote plugin endpoint runtime webSocket: Reconnecting...');
            this.open();
        }, Websocket.RECONNECT_INTERVAL);
    }

    // Empty callbacks that can be overrided by clients
    public onOpen(url: string): void { }
    public onMessage(data: WS.Data): void { }
    private onError(e: Error): void { }
    private onClose(reason: string): void { }

    /***
     * Closing websocket with proper error code.
     */
    public close(): void {
        this.instance.close(1000);
    }
}
