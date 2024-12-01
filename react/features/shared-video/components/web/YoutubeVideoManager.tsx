/* eslint-disable no-invalid-this */
/* eslint-disable */

import React from 'react';
import { connect } from 'react-redux';
import YouTube from 'react-youtube';
import logger from '../../logger';

import { PLAYBACK_STATUSES } from '../../constants';

import AbstractVideoManager, {
    IProps,
    _mapDispatchToProps,
    _mapStateToProps
} from './AbstractVideoManager';

/**
 * Manager of shared video.
 *
 * @returns {void}
 */
class YoutubeVideoManager extends AbstractVideoManager {
    isPlayerAPILoaded: boolean;
    player?: any;

    constructor(props: IProps) {
        super(props);
        logger.info("YTVM: Constructor initialized", { props });
        this.isPlayerAPILoaded = false;
    }

    getPlaybackStatus() {
        let status;

        if (!this.player) {
            logger.info("YTVM: GetPlaybackStatus called but player not initialized");
            return;
        }

        const playerState = this.player.getPlayerState();
        logger.info("YTVM: Current player state", { playerState });

        if (playerState === YouTube.PlayerState.PLAYING) {
            status = PLAYBACK_STATUSES.PLAYING;
        }

        if (playerState === YouTube.PlayerState.PAUSED) {
            status = PLAYBACK_STATUSES.PAUSED;
        }

        logger.info("YTVM: Playback status", { status });
        return status;
    }

    isMuted() {
        const muted = this.player?.isMuted();
        logger.info("YTVM: Mute status checked", { muted });
        return muted;
    }

    getVolume() {
        const volume = this.player?.getVolume();
        logger.info("YTVM: Volume retrieved", { volume });
        return volume;
    }

    getTime() {
        const time = this.player?.getCurrentTime();
        logger.info("YTVM: Current time retrieved", { time });
        return time;
    }

    seek(time: number) {
        logger.info("YTVM: Seeking to time", { time });
        return this.player?.seekTo(time);
    }

    play() {
        logger.info("YTVM: Play called");
        return this.player?.playVideo();
    }

    pause() {
        logger.info("YTVM: Pause called");
        return this.player?.pauseVideo();
    }

    mute() {
        logger.info("YTVM: Mute called");
        return this.player?.mute();
    }

    unMute() {
        logger.info("YTVM: Unmute called");
        return this.player?.unMute();
    }

    dispose() {
        logger.info("YTVM: Disposing player");
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    }

    onPlayerStateChange = (event: any) => {
        logger.info("YTVM: Player state changed", { 
            newState: event.data,
            stateName: this.getStateName(event.data)
        });

        if (event.data === YouTube.PlayerState.PLAYING) {
            this.onPlay();
        } else if (event.data === YouTube.PlayerState.PAUSED) {
            this.onPause();
        }
    };

    // Helper method to convert YouTube state numbers to readable names
    private getStateName(state: number): string {
        const states = {
            [-1]: 'UNSTARTED',
            [0]: 'ENDED',
            [1]: 'PLAYING',
            [2]: 'PAUSED',
            [3]: 'BUFFERING',
            [5]: 'CUED'
        };
        return states[state] || 'UNKNOWN';
    }

    onPlayerReady = (event: any) => {
        const { _isOwner } = this.props;
        logger.info("YTVM: Player ready", { isOwner: _isOwner });

        this.player = event.target;

        this.player.addEventListener('onVolumeChange', () => {
            logger.info("YTVM: Volume changed", { newVolume: this.getVolume() });
            this.onVolumeChange();
        });

        if (_isOwner) {
            logger.info("YTVM: Setting up owner-specific event listeners");
            this.player.addEventListener('onVideoProgress', this.throttledFireUpdateSharedVideoEvent);
        }

        logger.info("YTVM: Starting initial playback");
        this.play();

        if (this.isMuted()) {
            logger.info("YTVM: Initial state was muted, unmuting");
            this.unMute();
        }
    };

    getPlayerOptions = () => {
        const { _isOwner, videoId } = this.props;
        const showControls = _isOwner ? 1 : 0;

        const options = {
            id: 'sharedVideoPlayer',
            opts: {
                height: '100%',
                width: '100%',
                playerVars: {
                    'origin': location.origin,
                    'fs': '0',
                    'autoplay': 0,
                    'controls': showControls,
                    'rel': 0
                }
            },
            onError: (e: any) => {
                logger.error("YTVM: Player error occurred", { error: e });
                this.onError(e);
            },
            onReady: this.onPlayerReady,
            onStateChange: this.onPlayerStateChange,
            videoId
        };

        logger.info("YTVM: Player options configured", { 
            videoId, 
            isOwner: _isOwner,
            showControls
        });
        
        return options;
    };

    render() {
        logger.info("YTVM: Rendering YouTube component");
        return (
            <YouTube
                { ...this.getPlayerOptions() } />
        );
    }
}

export default connect(_mapStateToProps, _mapDispatchToProps)(YoutubeVideoManager);