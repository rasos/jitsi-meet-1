/* eslint-disable */

import { PeerTubePlayer } from '@peertube/embed-api';
import React from 'react';
import { connect } from 'react-redux';

import { PLAYBACK_STATUSES } from '../../constants';
import logger from '../../logger';

import AbstractVideoManager, {
    IProps,
    _mapDispatchToProps,
    _mapStateToProps
} from './AbstractVideoManager';

class PeerTubeVideoManager extends AbstractVideoManager {
    isPlayerAPILoaded: boolean;
    player?: typeof PeerTubePlayer;
    currentPlaybackState?: string;

    constructor(props: IProps) {
        super(props);
        this.isPlayerAPILoaded = false;
        this.currentPlaybackState = PLAYBACK_STATUSES.PAUSED;
    }

    getPlaybackStatus() {
        let status;

        if (!this.player) {
            return;
        }

        status = this.currentPlaybackState;

        return status;
    }

    isMuted() {
        return this._isMuted;
    }

    getVolume() {
        return this._volume * 100;
    }

    getTime() {
        return this._currentTime;
    }

    // In PeerTubeVideoManager, update these methods:
    async play() {
        logger.info("Play called eee");
        if (!this.player) {
            return;
        }
        try {
            logger.info("entered try");
            await this.player.ready;
            logger.info("waited for ready");
            await new Promise(resolve => setTimeout(resolve, 500)); // Add small delay
            logger.info("waited for the delay");
            await this.player.play();
            logger.info("finished awaiting");
        } catch (error) {
            logger.error("Error playing:", error);
        }
    }
    
    async pause() {
        logger.info("Pause called eee");
        if (!this.player) {
            return;
        }
        try {
            await this.player.ready;
            await new Promise(resolve => setTimeout(resolve, 500)); // Add small delay
            await this.player.pause();
            logger.info("finished awaiting");
        } catch (error) {
            logger.error("Error pausing:", error);
        }
    }

    async seek(time: number) {
        if (!this.player) {
            return;
        }
        try {
            await this.player.ready;
            await new Promise(resolve => setTimeout(resolve, 500)); // Add small delay
            await this.player.seek(time);
        } catch (error) {
            logger.error("Error seeking:", error);
        }
    }

    mute() {
        this.player?.setVolume(0);
        this._isMuted = true;
    }

    unMute() {
        this.player?.setVolume(1);
        this._isMuted = false;
    }

    dispose() {
        if (this.player) {
            this.player = null;
        }
    }

    _isMuted = false;
    _volume = 1;
    _currentTime = 0;

    _updateState = async () => {
        if (this.player) {
            const volume = await this.player.getVolume();
            this._volume = volume;
            this._isMuted = volume === 0;
        }
    };

    setupEventListeners() {
        const { _isOwner } = this.props;

        // Common events for all users
        this.player.addEventListener('play', () => {
            this.currentPlaybackState = PLAYBACK_STATUSES.PLAYING;
            logger.info("play clicked");
            this.onPlay();
        });
        
        this.player.addEventListener('volumeChange', () => {
            this._updateState().then(() => this.onVolumeChange());
        });
        
        this.player.addEventListener('playbackStatusUpdate', (event) => {
            if (this.currentPlaybackState == PLAYBACK_STATUSES.PAUSED && event.playbackState === 'playing') {
                logger.info("playing");
                this.currentPlaybackState = PLAYBACK_STATUSES.PLAYING;
                this.onPlay();
            } else if (this.currentPlaybackState == PLAYBACK_STATUSES.PLAYING &&  event.playbackState === 'paused') {
                logger.info("paused");
                this.currentPlaybackState = PLAYBACK_STATUSES.PAUSED;
                this.onPause();
            }
        });
        // Owner-only events
        if (_isOwner) {
            this.player.addEventListener('playbackStatusUpdate', this.throttledFireUpdateSharedVideoEvent);
        }
    }

    onPlayerReady = async () => {
        await this.player.ready;
        this.setupEventListeners();

        setTimeout(() => {
            logger.info("onPlayerReady");
            this.play();
            if (this.isMuted()) {
                this.unMute();
            }
        }, 1000);
    };

    render() {
        const { videoId, _isOwner } = this.props;
        const showControls = _isOwner ? 1 : 1;

        return (
            <iframe
                ref={iframe => {
                    if (iframe) {
                        this.player = new PeerTubePlayer(iframe);
                        this.onPlayerReady();
                    }
                }}
                id="sharedVideoPlayer"
                src={`${videoId}?api=1&controls=${showControls}`} // autoplay=1
                width="100%"
                height="100%"
                allowFullScreen
            />
        );
    }
}

export default connect(_mapStateToProps, _mapDispatchToProps)(PeerTubeVideoManager);