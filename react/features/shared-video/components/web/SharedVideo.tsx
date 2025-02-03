import React, { Component } from 'react';
import { connect } from 'react-redux';

// @ts-ignore
import Filmstrip from '../../../../../modules/UI/videolayout/Filmstrip';
import { IReduxState } from '../../../app/types';
import { getVerticalViewMaxWidth } from '../../../filmstrip/functions.web';
import { getToolboxHeight } from '../../../toolbox/functions.web';
import { isSharedVideoEnabled } from '../../functions';

import PeerTubeVideoManager from './PeerTubeVideoManager';
import VideoManager from './VideoManager';
import YoutubeVideoManager from './YoutubeVideoManager';
import logger from '../../logger';

interface IProps {

    /**
     * The available client width.
     */
    clientHeight: number;

    /**
     * The available client width.
     */
    clientWidth: number;

    /**
     * Whether the (vertical) filmstrip is visible or not.
     */
    filmstripVisible: boolean;

    /**
     * The width of the vertical filmstrip.
     */
    filmstripWidth: number;

    /**
     * Whether the shared video is enabled or not.
     */
    isEnabled: boolean;

    /**
     * Whether or not the user is actively resizing the filmstrip.
     */
    isResizing: boolean;

    /**
     * The shared video url.
     */
    videoUrl?: string;

    /**
     * Whether the video is from PeerTube.
     */
    isPeerTube?: boolean;
}

/** .
 * Implements a React {@link Component} which represents the large video (a.k.a.
 * The conference participant who is on the local stage) on Web/React.
 *
 * @augments Component
 */
class SharedVideo extends Component<IProps> {
    /**
     * Computes the width and the height of the component.
     *
     * @returns {{
     *  height: number,
     *  width: number
     * }}
     */
    getDimensions() {
        const { clientHeight, clientWidth, filmstripVisible, filmstripWidth } = this.props;

        let width;
        let height;

        if (interfaceConfig.VERTICAL_FILMSTRIP) {
            if (filmstripVisible) {
                width = `${clientWidth - filmstripWidth}px`;
            } else {
                width = `${clientWidth}px`;
            }
            height = `${clientHeight - getToolboxHeight()}px`;
        } else {
            if (filmstripVisible) {
                height = `${clientHeight - Filmstrip.getFilmstripHeight()}px`;
            } else {
                height = `${clientHeight}px`;
            }
            width = `${clientWidth}px`;
        }

        return {
            width,
            height
        };
    }

    /**
     * Retrieves the manager to be used for playing the shared video.
     *
     * @returns {Component}
     */
    getManager(isPeertube: boolean) {
        const { videoUrl } = this.props;

        if (!videoUrl) {
            return null;
        }

        if (isPeertube) {
            const urlParts = videoUrl.split('/w/');
            const domain = urlParts[0];
            let videoId = urlParts[1];

            // Check if the URL contains '/p/'
            if (videoUrl.includes('/p/')) {
                // Handle playlist URL
                videoId = urlParts[1];
                const embedUrl = `${domain}/video-playlists/embed/${videoId}`;

                logger.info('Embed URL:', embedUrl);

                return <PeerTubeVideoManager videoId = { embedUrl } />;
            }

            // Handle regular video URL
            const embedUrl = `${domain}/videos/embed/${videoId}`;

            return <PeerTubeVideoManager videoId = { embedUrl } />;
        }

        if (videoUrl.match(/http/)) {
            return <VideoManager videoId = { videoUrl } />;
        }

        return <YoutubeVideoManager videoId = { videoUrl } />;
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {React$Element}
     */
    render() {
        const { isEnabled, isResizing, isPeerTube  } = this.props;

        if (!isEnabled) {
            return null;
        }

        return (
            <div
                className = { (!isPeerTube && isResizing) ? 'disable-pointer' : '' }
                id = 'sharedVideo'
                style = { this.getDimensions() }>
                {this.getManager(isPeerTube ?? false)}
            </div>
        );
    }
}


/**
 * Maps (parts of) the Redux state to the associated LargeVideo props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState) {
    const { videoUrl, isPeerTube } = state['features/shared-video'];
    const { clientHeight, clientWidth } = state['features/base/responsive-ui'];
    const { visible, isResizing } = state['features/filmstrip'];

    return {
        clientHeight,
        clientWidth,
        filmstripVisible: visible,
        filmstripWidth: getVerticalViewMaxWidth(state),
        isEnabled: isSharedVideoEnabled(state),
        isResizing,
        videoUrl,
        isPeerTube
    };
}

export default connect(_mapStateToProps)(SharedVideo);
