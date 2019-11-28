/********************************************************************************
 * Copyright (C) 2019 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as React from 'react';
import { ChePluginMenu } from './che-plugin-menu';

interface ToolbarProps {
    chePluginMenu: ChePluginMenu;
    filter: string;
    onFilterChanged: (filter: string) => void;
    status: string;
}

interface ToolbarState {
    menuButtonPressed: boolean;
    filter: string;
}

export class ChePluginViewToolbar extends React.Component<ToolbarProps, ToolbarState> {

    constructor(props: ToolbarProps) {
        super(props);

        this.state = {
            menuButtonPressed: false,
            filter: props.filter
        };

        props.chePluginMenu.onMenuClosed(() => {
            this.setState({
                menuButtonPressed: false,
                filter: this.state.filter
            });
        });
    }

    protected readonly onInputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
        const filterString = event.target.value;
        this.props.onFilterChanged(filterString);
    }

    protected isDisabled(): boolean {
        return this.props.status === 'loading' || this.props.status === 'update_cache';
    }

    protected renderInput(): React.ReactNode {
        const value = this.props.filter;

        if (this.isDisabled()) {
            return <input
                className='search'
                type='text'
                value={value}
                onChange={this.onInputChanged}
                disabled
            />;
        } else {
            return <input
                className='search'
                type='text'
                value={value}
                onChange={this.onInputChanged}
            />;
        }
    }

    protected renderMenuButton(): React.ReactNode {
        const enabled = !this.isDisabled();
        const menuButtonStyle = this.state.menuButtonPressed
            ? 'menu-button-active'
            : enabled
                ? 'menu-button'
                : 'menu-button-disabled';

        if (enabled) {
            return <div tabIndex={0} className={menuButtonStyle} onFocus={this.onFocus} >
                <i className='fa fa-ellipsis-v' />
            </div>;
        } else {
            return <div tabIndex={0} className={menuButtonStyle} >
                <i className='fa fa-ellipsis-v' />
            </div>;
        }
    }

    render(): React.ReactNode {
        const input = this.renderInput();
        const menuButton = this.renderMenuButton();

        return <div className='che-plugin-control-panel'>
            <div>
                {input}
                {menuButton}
            </div>
        </div>;
    }

    protected onFocus = async () => {
        const rect = document.activeElement!.getBoundingClientRect();

        const left = rect.left;
        const top = rect.top + rect.height - 2;

        this.setState({
            menuButtonPressed: true,
            filter: this.state.filter
        });

        this.props.chePluginMenu.show(left, top);
    }

}
