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

    async testPlayerFunctionality() {
        logger.info("=== Starting player functionality test ===");
        try {
            logger.info("1. Testing play...");
            await this.player.play();
            logger.info("Play command sent successfully");

            // Wait a second
            await new Promise(resolve => setTimeout(resolve, 1000));

            logger.info("2. Testing seek...");
            await this.player.seek(20);
            logger.info("Seek command sent successfully");

            // Get current time to verify seek worked
            const currentTime = await this.player.getCurrentTime();
            logger.info(`Current time after seek: ${currentTime}`);

            // Test if player is actually playing
            const isPlaying = await this.player.isPlaying();
            logger.info(`Is player actually playing? ${isPlaying}`);

        } catch (error) {
            logger.error("Error during player functionality test:", error);
        }
        logger.info("=== Player functionality test complete ===");
    }

    async onPlayerReady() {
        try {
            logger.info('=== Player Initialization Starting ===');
            logger.info('1. Waiting for player ready...');
            await this.player.ready;
            logger.info('2. Player ready promise resolved!');
            
            // Log the player object to see what we're working with
            logger.info('3. Player object state:', {
                player: this.player,
                methods: Object.keys(this.player)
            });

            this.isPlayerAPILoaded = true;
            logger.info('4. Player API marked as loaded');
            
            // Run test immediately after initialization
            logger.info('5. Running player functionality test...');
            await this.testPlayerFunctionality(); // this function actually works but the rest doesn't!
            
            // Setup event listeners after player is ready
            this.setupEventListeners();
            logger.info('6. Event listeners setup complete');

            // Initial play if needed
            const { _status } = this.props;
            if (_status === PLAYBACK_STATUSES.PLAYING) {
                await this.play();
            }
            logger.info('=== Player Initialization Complete ===');
        } catch (error) {
            logger.error('Error in onPlayerReady:', error);
            this.isPlayerAPILoaded = false;
        }
    }

    play() {
        logger.info("Play called eee");
        if (!this.player) {
            return;
        }
        this.player.play()
        this.player.seek(20)
        logger.info("seek called");
    }
    
    pause() {
        logger.info("Pause called eee");
        if (!this.player) {
            return;
        }
        this.player.pause()
    }

    setupEventListeners() {
        logger.info('Setting up event listeners');
        const { _isOwner } = this.props;

        // Test event listener registration
        this.player.addEventListener('play', () => {
            logger.info('Play event received!');
            this.currentPlaybackState = PLAYBACK_STATUSES.PLAYING;
            this.onPlay();
        });

        this.player.addEventListener('pause', () => {
            logger.info('Pause event received!');
            this.currentPlaybackState = PLAYBACK_STATUSES.PAUSED;
            this.onPause();
        });

        this.player.addEventListener('playbackStatusUpdate', (event: any) => {
            logger.info('Playback status update received:', event);
            if (event.playbackState === 'playing') {
                logger.info('Status update: playing');
                this.currentPlaybackState = PLAYBACK_STATUSES.PLAYING;
                this.onPlay();
            } else if (event.playbackState === 'paused') {
                logger.info('Status update: paused');
                this.currentPlaybackState = PLAYBACK_STATUSES.PAUSED;
                this.onPause();
            }
        });

        if (_isOwner) {
            this.player.addEventListener('playbackStatusUpdate', this.throttledFireUpdateSharedVideoEvent);
        }

        logger.info('Event listeners setup complete');
    }

    render() {
        const { videoId, _isOwner } = this.props;
        const showControls = _isOwner ? 1 : 1;

        return (
            <iframe
                ref={iframe => {
                    if (iframe) {
                        logger.info('Creating new PeerTube player instance');
                        this.player = new PeerTubePlayer(iframe);
                        this.onPlayerReady();
                    }
                }}
                id="sharedVideoPlayer"
                src={`${videoId}?api=1&controls=${showControls}`}
                width="100%"
                height="100%"
                allowFullScreen
            />
        );
    }
}

export default connect(_mapStateToProps, _mapDispatchToProps)(PeerTubeVideoManager);