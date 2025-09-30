import React, { PureComponent } from 'react'
import { browser, Tabs } from 'webextension-polyfill-ts'

import { remoteFunction } from '../../util/webextensionRPC'

import FeaturesInfo from './components/FeaturesInfo'
import FeatureInfo from './components/FeatureInfo'
import { FEATURES_INFO } from './constants'
import { EVENT_NAMES } from '../../analytics/internal/constants'

export interface Props {
    tabs: Tabs.Static
}

class Tutorial extends PureComponent<Props> {
    static defaultProps: Pick<Props, 'tabs'> = {
        tabs: browser.tabs,
    }

    private processEventRPC = remoteFunction('processEvent')

    private openNewUrl = url => () => {
        this.processEventRPC({ type: EVENT_NAMES.OPEN_URL_FEATURE })

        this.props.tabs.create({ url })
    }

    renderFeaturesInfo = () => {
        return FEATURES_INFO.map((feature, index) => (
            <FeatureInfo
                key={index}
                heading={feature.heading}
                subheading={feature.subheading}
                handleClick={this.openNewUrl(feature.url)}
            />
        ))
    }

    render() {
        return <FeaturesInfo>{this.renderFeaturesInfo()}</FeaturesInfo>
    }
}

export default Tutorial
