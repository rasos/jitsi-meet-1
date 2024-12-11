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
    player?: any;
    currentPlaybackState?: string;

    constructor(props: IProps) {
        super(props);
        this.isPlayerAPILoaded = false;
        this.currentPlaybackState = PLAYBACK_STATUSES.PAUSED;
    }

    getPlaybackStatus() {
        return this.currentPlaybackState;
    }

    isMuted() {
        return this._isMuted;
    }

    getVolume() {
        return this._volume * 100;
    }

    // getTime() {
    //     return this._currentTime;
    // }

    async play() {
        if (!this.player) {
            logger.error('Player not initialized');
            return;
        }

        try {            
            await this.player.play();
            logger.info('Play command executed');
        } catch (error) {
            logger.error('Error playing:', error);
        }
    }
    
    async pause() {
        if (!this.player) {
            logger.error('Player not initialized');
            return;
        }

        try {
            this.player.pause();
            logger.info('Pause command executed');
        } catch (error) {
            logger.error('Error pausing:', error);
        }
    }

    async getTime(): Promise<number> {
        if (!this.player) {
            logger.error('No player when getting current time:', this._currentTime);
            return -1;
        }
        
        try {
            this._currentTime = await this.player.getCurrentTime();
            logger.error('_currentTime:', this._currentTime);
            return this._currentTime;
        } catch (error) {
            logger.error('Error getting current time:', error);
            return -1;
        }
    }

    async seek(time: number) {
        if (!this.player) {
            logger.error('Player not initialized');
            return;
        }

        try {
            this.player.seek(time);
            logger.info(`Seek to ${time} executed`);
        } catch (error) {
            logger.error('Error seeking:', error);
        }
    }

    async mute() {
        if (!this.player) {
            logger.error('Player not initialized');
            return;
        }

        try {
            await this.player.setVolume(0);
            this._isMuted = true;
        } catch (error) {
            logger.error('Error muting:', error);
        }
    }

    async unMute() {
        if (!this.player) {
            logger.error('Player not initialized');
            return;
        }

        try {
            await this.player.setVolume(1);
            this._isMuted = false;
        } catch (error) {
            logger.error('Error unmuting:', error);
        }
    }

    dispose() {
        this.player = null;
    }

    _isMuted = false;
    _volume = 1;
    _currentTime = 0;

    async _updateState() {
        if (this.player) {
            try {
                const volume = await this.player.getVolume();
                this._volume = volume;
                this._isMuted = volume === 0;
            } catch (error) {
                logger.error('Error updating state:', error);
            }
        }
    }

    setupEventListeners() {
        const { _isOwner } = this.props;

        // Common events for all users
        this.player.addEventListener('play', () => {
            this.currentPlaybackState = PLAYBACK_STATUSES.PLAYING;
            this.onPlay();
        });
        
        this.player.addEventListener('volumeChange', () => {
            this._updateState().then(() => this.onVolumeChange());
        });
        
        this.player.addEventListener('playbackStatusUpdate', (event: { playbackState: string }) => {
            if (this.currentPlaybackState === PLAYBACK_STATUSES.PAUSED && 
                event.playbackState === 'playing') {
                this.currentPlaybackState = PLAYBACK_STATUSES.PLAYING;
                this.onPlay();
            } else if (this.currentPlaybackState === PLAYBACK_STATUSES.PLAYING && 
                      event.playbackState === 'paused') {
                this.currentPlaybackState = PLAYBACK_STATUSES.PAUSED;
                this.onPause();
            }
        });

        // Owner-only events
        if (_isOwner) {
            this.player.addEventListener('playbackStatusUpdate', 
                this.throttledFireUpdateSharedVideoEvent
            );
        }

        logger.info('Event listeners set up successfully');
    }

    onPlayerReady = async () => {
        if (!this.player) {
            const iframe = document.getElementById('sharedVideoPlayer');
            if (!iframe || !(iframe instanceof HTMLIFrameElement)) {
                logger.error('Cannot find iframe element or element is not an iframe');
                return;
            }
            this.player = new PeerTubePlayer(iframe);
        }

        try {
            logger.info('Awaiting player ready...');
            await this.player.ready;
            logger.info('Player is ready');
            
            // Setup event listeners first
            this.setupEventListeners();

            // Initialize player state
            if (this.isMuted()) {
                await this.unMute();
            }

            // Start playback
            await this.play();
        } catch (error) {
            logger.error('Error in player ready handler:', error);
        }
    };

    componentDidMount() {
        super.componentDidMount();
        // Initialize player after component mounts
        this.onPlayerReady();
    }

    render() {
        const { videoId, _isOwner } = this.props;
        const showControls = _isOwner ? 1 : 1;

        return (
            <iframe
                id="sharedVideoPlayer"
                src={`${videoId}?api=1&autoplay=1&controls=${showControls}`}
                width="100%"
                height="100%"
                allow="fullscreen"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
        );
    }
}

export default connect(_mapStateToProps, _mapDispatchToProps)(PeerTubeVideoManager);