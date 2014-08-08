var Lecture = (function() {

    'use strict';

    /**
     * Lecture default options.
     */
    var defaultOptions = {
        video: {
            muted: false,
            markers: true,
            controls: 'show',
            transition: {
                play: true,
                duration: 0,
            },
        },
        overlay: {
            opacity: 1,
            background: 'white',
            transition: {
                play: true,
                hide: true,
            },
        },
    };

    /**
     * Video MIME types with file extensions.
     */
    var videoMIME = {
        'video/mp4': /\.(mp4|m4a|m4p|m4b|m4r|m4v)$/i,
        'video/ogg': /\.(ogg|ogv|oga|ogx|ogm|spx|opus)$/i,
        'video/webm': /\.(webm)$/i,
    };

    /**
     * Limit a number to a given range.
     *
     * @param {number} a - Lower bound of the range.
     * @param {number} b - Number to clamp.
     * @param {number} c - Upper bound of the range.
     *
     * @return {number} Number in the range [a, c].
     */
    function clamp(a, b, c) {

        return Math.max(a, Math.min(b, c));
    }

    /**
     * Extend an object's properties with another's.
     *
     * @param {object} target - Target object.
     * @param {object} source - Source object.
     */
    function extend(target, source) {

        for (var attr in source) {
            if (source.hasOwnProperty(attr)) {
                if (!target.hasOwnProperty(attr)) {
                    target[attr] = source[attr];
                }
            }
        }
    }

    /**
     * Parse a time string that has one of the following formats:
     * - hh:mm:ss(.xx)?
     * - mm:ss(.xx)?
     * - ss(.xx)?
     * - .xx
     *
     * Where hh, mm, ss and xx are hours, minutes, seconds and
     * second decimals. hh, mm, ss and xx can have any number of
     * digits (at least one though).
     *
     * @param {string} str - Input string to parse.
     *
     * @return {number} Amount of seconds represented by str.
     */
    function parseSeconds(str) {

        var pattern = /^(\d+:)?(\d+:)?(\d*\.?\d*)$/;
        var tokens = str.match(pattern);

        if (!tokens) {
            return undefined;
        }

        tokens = tokens.map(parseFloat);

        if (isNaN(tokens[1])) {
            return tokens[3];
        }

        if (isNaN(tokens[2])) {
            return tokens[3] + 60 * tokens[1];
        }

        return tokens[3] + 60 * tokens[2] + 3600 * tokens[1];
    }

    /**
     * Format an amount of seconds as (hh:)?mm:ss
     *
     * @param {number} time - Number of seconds.
     *
     * @return {string} Formatted string.
     */
    function formatSeconds(time) {

        var roundTime = Math.floor(time);

        var seconds = roundTime % 60;
        var minutes = Math.floor(roundTime / 60) % 60;
        var hours   = Math.floor(roundTime / 3600);

        var minuteSep = seconds < 10 ? ':0' : ':';
        var hourSep   = minutes < 10 ? ':0' : ':';

        return (hours ? hours + hourSep : '') + minutes + minuteSep + seconds;
    }

    /**
     * Create an HTML element.
     *
     * @param {string} type - HTML element type.
     * @param {(string|string[])} [classes] - CSS classes for the new element.
     * @param {object} [parent] - Parent HTML element.
     *
     * @return {object} The new element.
     */
    function createElement(type, classes, parent) {

        var element = document.createElement(type);

        if (typeof classes === 'string') {
            classes = [classes];
        }

        if (typeof classes === 'object' && classes.constructor === Array) {
            classes.forEach(function(c) {
                element.classList.add(c);
            });
        }

        if (typeof classes === 'object' && classes.constructor !== Array) {
            parent = classes;
        }

        if (parent) {
            parent.appendChild(element);
        }

        return element;
    }

    /**
     * Generate a mouseDown listener function that supports mouse movements
     * outside the target while the mouse is down.
     *
     * @param {function} mouseDownFn - What to do on mouseDown.
     * @param {function} mouseMoveFn - What to do on mouseMove.
     * @param {function} mouseUpFn - What to do on mouseUp.
     *
     * @return {function} mouseDown listener.
     */
    function mouseDownHandler(mouseDownFn, mouseMoveFn, mouseUpFn) {

        var active = false;

        function leftButtonPressed(event) {

            if ('buttons' in event) {
                return event.buttons === 1;
            }

            if ('which' in event) {
                return event.which === 1;
            }

            return event.button === 1;
        }

        function mouseDown(event) {

            if (!leftButtonPressed(event) || active) {
                return;
            }

            active = true;
            mouseDownFn(event);

            window.addEventListener('mousemove', mouseMove);
            window.addEventListener('mouseup', mouseUp);
        }

        function mouseMove(event) {

            if (!leftButtonPressed(event)) {
                mouseUp();
                return;
            }

            mouseMoveFn(event);
        }

        function mouseUp(event) {

            window.removeEventListener('mousemove', mouseMove);
            window.removeEventListener('mouseup', mouseUp);

            active = false;
            mouseUpFn(event);
        }

        return mouseDown;
    }

    /**
     * Create a Video component.
     *
     * @see Lecture#addVideo
     * @constructor
     * @name Video
     *
     * @param {Lecture} lecture - Parent lecture.
     * @param {string}  name - Video unique name.
     * @param {object}  options - Video configuration options.
     */
    function Video(lecture, name, options) {

        lecture.videos[name] = this;

        this.lecture = lecture;
        this.name = name;
        this.options = options;

        this.data = {};
        this.data.currentTime = 0;
        this.container = createElement('div', 'video-container');
        this.container.video = this;

        createVideoElement(this);
        createTransitionsTrack(this);
        createVideoControls(this);

        addVideoContainerListeners(this);
        addVideoElementListeners(this);

        lecture.container.appendChild(this.container);
    }

    /**
     * Create and setup an HTML video element and its background.
     *
     * @param {Video} video - Parent Video.
     */
    function createVideoElement(video) {

        video.video = createElement('video', 'video-element', video.container);

        video.video.appendChild(document.createTextNode(
            'Sorry, your browser doesn\'t support HTML5 video.'
        ));

        video.video.setAttribute('preload', 'metadata');
        video.video.setAttribute('tabindex', -1);

        if (video.options.muted) {
            video.video.setAttribute('muted', 'muted');
        }

        video.background = createElement('div', 'video-background', video.container);
    }

    /**
     * Append a transitions text track to the HTML video element.
     *
     * @param {Video} video - Parent Video.
     */
    function createTransitionsTrack(video) {

        /* IE needs this, but Chrome and Firefox don't support it by default. */
        if (video.video.addTextTrack) {

            video.transitions = video.video.addTextTrack('metadata');

        } else {

            var node = createElement('track', video.video);

            node.setAttribute('kind', 'metadata');
            node.setAttribute('src', '');

            video.transitions = node.track;
        }

        video.transitions.mode = 'hidden';
    }

    /**
     * Create and setup the HTML elements for the video controls.
     *
     * @param {Video} video - Parent Video.
     */
    function createVideoControls(video) {

        var container = createElement('div', 'controls-container', video.container);

        createVideoProgressBar(video, container);

        var controls = createElement('div', 'controls-buttons', container);

        createVideoPlayPauseButton(video, controls);
        createVideoVolumeButton(video, controls);
        createVideoTimeIndicator(video, controls);

        // TODO: fullscreen, captions, etc.
    }

    /**
     * Create and setup the HTML elements for the video controls progress bar.
     *
     * @param {Video} video - Parent Video.
     * @param {object} controls - Parent controls HTML element.
     */
    function createVideoProgressBar(video, controls) {

        var padding  = createElement('div', 'controls-progress-padding', controls);
        var progress = createElement('div', 'controls-progress',         controls);
        var loaded   = createElement('div', 'controls-progress-loaded',  progress);
        var bar      = createElement('div', 'controls-progress-bar',     progress);
        var played   = createElement('div', 'controls-progress-played',  bar);
        var bullet   = createElement('div', 'controls-progress-bullet',  played);

        video.deferredOverlayMarkers = [];

        video.addOverlayMarker = function(position) {

            if (!video.data.duration) {
                video.deferredOverlayMarkers.push(position);
                return;
            }

            var container = createElement('div', 'controls-progress-overlay-marker-container', progress);
            var padding   = createElement('div', 'controls-progress-overlay-marker-padding',   container);
            var marker    = createElement('div', 'controls-progress-overlay-marker',    padding);

            position = clamp(0, position, video.data.duration);
            marker.style.width = 100 * position / video.data.duration + '%';
        };

        video.showFullProgressBar = function() {

            if (!video.video.paused || !video.lecture.showingOverlay()) {
                progress.classList.remove('controls-progress-tiny');
                bullet.classList.remove('controls-progress-bullet-tiny');
            }
        };

        video.showTinyProgressBar = function() {

            if (!video.video.paused) {
                progress.classList.add('controls-progress-tiny');
                bullet.classList.add('controls-progress-bullet-tiny');
            }
        };

        video.setProgressLoadPosition = function(position) {

            position = clamp(0, position, video.data.duration);
            loaded.style.width = 100 * position / video.data.duration + '%';
            video.data.loadPosition = position;
        };

        video.setProgressPlayPosition = function(position) {

            position = clamp(0, position, video.data.duration);
            played.style.width = 100 * position / video.data.duration + '%';
            video.data.playPosition = position;
        };

        var listener = getProgressBarListener(video, controls, bullet);

        progress.addEventListener('mousedown', listener);
         padding.addEventListener('mousedown', listener);
          bullet.addEventListener('mousedown', listener);
    }

    /**
     * Create the mouseDown event handler for the progress bar components.
     *
     * @param {Video} video - Parent Video.
     * @param {object} controls - Parent controls HTML element.
     * @param {object} bullet - Progress bar bullet HTML element.
     */
    function getProgressBarListener(video, controls, bullet) {

        var paused;
        var position;
        var timer;
        var timeout;

        function setVideoPosition(pageX, notVideo) {

            var bounds = controls.getBoundingClientRect();
            var width  = bounds.right - bounds.left;
            var left   = bounds.left + window.pageXOffset;
            var pos    = video.data.duration * (pageX - left) / width;

            if (notVideo) {
                video.setProgressPlayPosition(pos);
                video.setCurrentTime(pos);
            } else {
                video.setPosition(pos);
            }
        }

        function mouseDown(event) {

            paused = video.video.paused;

            if (!paused) {
                video.pause();
                video.showVideoPauseButton();
            }

            position = event.pageX;
            timer = setInterval(function() {
                clearTimeout(timeout);
                setVideoPosition(position);
            }, 200);

            setVideoPosition(event.pageX);
            bullet.classList.add('controls-progress-bullet-hover');
        }

        function mouseMove(event) {

            position = event.pageX;
            setVideoPosition(position, true);

            clearTimeout(timeout);
            timeout = setTimeout(function() {
                setVideoPosition(position);
            }, 50);
        }

        function mouseUp(event) {

            clearTimeout(timeout);
            clearInterval(timer);

            if (event) {
                position = event.pageX;
            }

            setVideoPosition(position);
            bullet.classList.remove('controls-progress-bullet-hover');

            if (!paused) {
                video.play();
            }
        }

        return mouseDownHandler(mouseDown, mouseMove, mouseUp);
    }

    /**
     * Create and setup the video controls play/pause button.
     *
     * @param {Video} video - Parent Video.
     * @param {object} controls - Parent controls HTML element.
     */
    function createVideoPlayPauseButton(video, controls) {

        var button = createElement('div', ['controls-playpause-button', 'controls-play-button'], controls);

        button.setAttribute('tabindex', 0);

        video.showVideoPlayButton = function() {

            button.classList.remove('controls-pause-button');
            button.classList.add('controls-play-button');
        };

        video.showVideoPauseButton = function() {

            button.classList.remove('controls-play-button');
            button.classList.add('controls-pause-button');
        };

        button.addEventListener('click', function() {

            video.toggle();
        });

        button.addEventListener('keypress', function(event) {

            var code = event.charCode || event.keyCode || event.which;

            if (code == 13 || code == 32) {
                video.toggle();
            }
        });
    }

    /**
     * Create and setup the video controls volume button and slider.
     *
     * @param {Video} video - Parent Video.
     * @param {object} controls - Parent controls HTML element.
     */
    function createVideoVolumeButton(video, controls) {

        var volume  = createElement('div', 'controls-volume', controls);
        var speaker = createElement('div', ['controls-volume-speaker', 'controls-volume-mute'], volume);
        var outer   = createElement('div', 'controls-volume-slider-outer', volume);
        var middle  = createElement('div', 'controls-volume-slider-middle', outer);
        var inner   = createElement('div', 'controls-volume-slider-inner', middle);
        var slider  = createElement('div', 'controls-volume-slider', inner);

        // TODO: slider and speaker events
    }

    /**
     * Create and setup the video controls time indicators.
     *
     * @param {Video} video - Parent Video.
     * @param {object} controls - Parent controls HTML element.
     */
    function createVideoTimeIndicator(video, controls) {

        var time      = createElement('div', 'controls-time', controls);
        var current   = createElement('span', 'controls-time-current', time);
        var separator = createElement('span', time);
        var duration  = createElement('span', time);

          current.appendChild(document.createTextNode('0:00'));
        separator.appendChild(document.createTextNode(' / '));
         duration.appendChild(document.createTextNode('0:00'));

        video.setCurrentTime = function(time) {

            current.firstChild.nodeValue = formatSeconds(time);
        };

        video.setDurationTime = function(time) {

            duration.firstChild.nodeValue = formatSeconds(time);
        };
    }

    /**
     * Add mouse listeners for the Video container.
     *
     * @param {Video} video - Parent Video.
     */
    function addVideoContainerListeners(video) {

        video.container.addEventListener('mouseenter', video.showFullProgressBar);
        video.container.addEventListener('mouseleave', video.showTinyProgressBar);
        video.container.addEventListener('mousemove', function() {

            video.showFullProgressBar();
            clearInterval(video.mouseTimer);
            video.mouseTimer = setInterval(video.showTinyProgressBar, 3000);
        });
    }

    /**
     * Setup HTML video event listeners.
     *
     * @param {Video} video - Parent Video.
     */
    function addVideoElementListeners(video) {

        video.video.addEventListener('click', function() {

            video.toggle();
        });

        video.video.addEventListener('durationchange', function() {

            video.data.duration = this.duration;
            video.setDurationTime(this.duration);
            video.deferredOverlayMarkers.forEach(video.addOverlayMarker);
        });

        video.video.addEventListener('loadedmetadata', function() {

            video.data.width = this.videoWidth;
            video.data.height = this.videoHeight;
        });

        video.video.addEventListener('progress', function() {

            video.progressTimer = setInterval(function () {

                var position = video.video.currentTime;
                var ranges = video.video.buffered;
                var bound = 0;

                for (var i = 0; i < ranges.length; i++) {

                    var start = ranges.start(i);
                    var end = ranges.end(i);

                    if (start <= position && position <= end && end > bound) {
                        bound = end;
                    }
                }

                video.setProgressLoadPosition(bound);

                if (video.data.duration && video.data.duration <= bound) {
                    clearInterval(video.progressTimer);
                }
            }, 200);
        });

        video.video.addEventListener('timeupdate', function() {

            video.setProgressPlayPosition(this.currentTime);
            video.setCurrentTime(this.currentTime);
        });

        video.video.addEventListener('ended', function() {

            video.pause();
        });
    }

    /**
     * Add a transitions file to the video.
     *
     * @memberof Video
     *
     * @param {string} source - Transition file URI.
     *
     * @return {Video} This video, to allow method chaining.
     */
    Video.prototype.addTransitionFile = function(source) {

        var node = createElement('track', this.video);
        var that = this;

        node.setAttribute('kind', 'metadata');
        node.setAttribute('src', source);
        node.addEventListener('load', function() {

            var cues = this.track.cues;

            for (var i = 0; i < cues.length; i++) {
                cues[i].onenter = cueEnterHandler;
                cues[i].onexit = cueExitHandler;
                cues[i].video = that.video;

                that.addCueMarker(cues[i].startTime);
            }
        });

        this.transitions = node.track;
        this.transitions.mode = 'hidden';

        return this;
    };

    /**
     * Add a video source for a given video format/encoding.
     *
     * @memberof Video
     *
     * @param {string} source - Video source URI.
     * @param {string} [type] - Video MIME type.
     *
     * @return {Video} This video, to allow method chaining.
     */
    Video.prototype.addSource = function(source, type) {

        if (typeof type === 'undefined') {
            for (type in videoMIME) {
                if (videoMIME[type].test(source)) {
                    break;
                }
            }
        }

        var node = createElement('source', this.video);

        node.setAttribute('src', source);
        node.setAttribute('type', type);

        return this;
    };

    /**
     * Add a subtitle track to the video.
     *
     * @memberof Video
     *
     * @param {string} language - Language of the subtitles (en, es, ...).
     * @param {string} source - Subtitles file URI.
     *
     * @return {Video} This video, to allow method chaining.
     */
    Video.prototype.addSubtitle = function(language, source) {

        var node = createElement('track', this.video);

        node.setAttribute('kind', 'subtitle');
        node.setAttribute('src', source);
        node.setAttribute('srclang', language);

        return this;
    };

    /**
     * Handler for cues enter event.
     */
    function cueEnterHandler() {

        // TODO: fix this.

        /* jshint validthis: true */

        var tokens = this.text.split(' ');
        var target = this.video.lecture.getComponent(tokens[0]);

        target.show();
        target.fromCue = this;

        if (target.constructor === Video) {

            var time = tokens[1] && parseSeconds(tokens[1]);
            var play = tokens[2] !== 'stop';

            if (typeof time === "number") {
                target.currentTime = time;
                target.setCurrentTime(time);
                target.video.currentTime = time;
            }

            if (play) {
                target.play();
            }

            this.video.currentTime = this.startTime;
            this.video.setCurrentTime(this.startTime);
            // this.video.video.currentTime = this.startTime;
        }

        if (target.constructor === Overlay && this.startTime === this.endTime) {
            this.video.pause();
            this.video.currentTime = this.startTime;
            this.video.setCurrentTime(this.startTime);
            // this.video.video.currentTime = this.startTime;
        }
    }

    /**
     * Handler for cues exit event.
     */
    function cueExitHandler() {

        // TODO: fix this.

        /* jshint validthis: true */

        var target = this.video.lecture.getComponent(this.text);

        if (target.constructor === Overlay && this.startTime !== this.endTime) {
            target.hide();
        }
    }

    /**
     * Add a transition to another component.
     *
     * @memberof Video
     *
     * @param {object}  target - Target Video or Overlay.
     * @param {number}  time - When to trigger the transition.
     * @param {object}  [options] - Transition configuration options.
     * @param {number}  [options.time] - Start time of the target Video (if not set, continue from last position).
     * @param {boolean} [options.play=true] - Start playing the target Video automatically.
     * @param {number}  [options.duration=0] - If not 0, duration of the Overlay (and video will continue playing).
     *
     * @return {Video} This video, to allow method chaining.
     */
    Video.prototype.addTransition = function(target, time, options) {

        options = options || {};
        extend(options, video.options.transition);

        var until = time + options.duration;
        var text  = target.name;

        if (options.hasOwnProperty('time')) {
            text += ' ' + options.time;
        }

        if (!options.play) {
            text += ' stop';
        }

        var Cue = window.VTTCue || window.TextTrackCue;
        var cue = new Cue(time, until, text);

        cue.onenter = cueEnterHandler;
        cue.onexit = cueExitHandler;
        cue.video = this;

        /* Needed due to a Chrome bug. */
        Lecture.cues = Lecture.cues || [];
        Lecture.cues.push(cue);

        this.addOverlayMarker(time);
        this.transitions.addCue(cue);

        return this;
    };

    /**
     * Set the current video reproduction position.
     *
     * @memberof Video
     *
     * @param {number} time - Number of seconds.
     */
    Video.prototype.setPosition = function(time) {

        this.data.currentTime = time;
        this.video.currentTime = time;
    };

    /**
     * Toggle video reproduction.
     *
     * @memberof Video
     */
    Video.prototype.toggle = function() {

        if (this.video.paused) {
            this.play();
        } else {
            this.pause();
        }
    };

    /**
     * Start video reproduction.
     *
     * @memberof Video
     *
     * @param {boolean} [returning=false] - Whether we are returning from an overlay.
     */
    Video.prototype.play = function(returning) {

        this.show();

        if (this.video.paused && !this.lecture.showingOverlay()) {

            if (!returning) {
                this.setPosition(this.data.currentTime);
            }

            this.video.play();
            this.showVideoPauseButton();
        }
    };

    /**
     * Stop video reproduction.
     *
     * @memberof Video
     */
    Video.prototype.pause = function() {

        this.video.pause();
        this.showVideoPlayButton();
        this.showFullProgressBar();
        this.setPosition(this.video.currentTime);
    };

    /**
     * Show video HTML element.
     *
     * @memberof Video
     */
    Video.prototype.show = function() {

        if (this.lecture.currentVideo === this) {
            return;
        }

        if (this.lecture.currentVideo) {
            this.lecture.currentVideo.hide();
        }

        this.lecture.currentVideo = this;
        this.video.setAttribute('preload', 'auto');
        this.container.classList.add('video-show');
    };

    /**
     * Hide video HTML element.
     *
     * @memberof Video
     */
    Video.prototype.hide = function() {

        if (this.lecture.currentVideo !== this) {
            return;
        }

        this.pause();
        this.lecture.currentVideo = null;
        this.video.setAttribute('preload', 'metadata');
        this.container.classList.remove('video-show');
    };

    /**
     * Create an Overlay component.
     *
     * @see Lecture#addOverlay
     * @constructor
     * @name Overlay
     *
     * @param {Lecture} lecture - Parent lecture.
     * @param {string}  name - Overlay unique name.
     * @param {string}  source - Overlay source URI.
     * @param {object}  options - Overlay configuration options.
     */
    function Overlay(lecture, name, source, options) {

        lecture.overlays[name] = this;

        this.lecture = lecture;
        this.name = name;
        this.source = source;
        this.options = options;

        this.container = createElement('div', 'overlay-container');
        this.container.overlay = this;

        createOverlayElements(this);

        lecture.container.appendChild(this.container);
    }

    /**
     * Create and setup the overlay HTML elements.
     *
     * @param {Overlay} overlay - Parent Overlay.
     */
    function createOverlayElements(overlay) {

        var background = createElement('div',    'overlay-background', overlay.container);
        var foreground = createElement('iframe', 'overlay-foreground', overlay.container);

        background.style.opacity = overlay.options.opacity;
        background.style.background = overlay.options.background;

        foreground.setAttribute('src', overlay.source);
        foreground.setAttribute('seamless', 'seamless');

        foreground.addEventListener('load', function() {

            function doTransition(options) {
                frameElement.parentNode.overlay.doTransition(options);
            }

            var head = this.contentDocument.getElementsByTagName('head')[0];
            var body = this.contentDocument.getElementsByTagName('body')[0];

            body.style.margin = '20px';

            var script = this.contentDocument.createElement('script');

            script.type = 'text/javascript';
            script.text = doTransition.toString();

            head.appendChild(script);
        });
    }

    /**
     * TODO
     *
     * @memberof Overlay
     *
     * @param {object}  [options] - Overlay transition configuration options.
     * @param {object}  [options.target=last_video] - Target component.
     * @param {number}  [options.time=target.currentTime] - Target video position.
     * @param {boolean} [options.play=true] - Whether to start playing the target Video.
     * @param {boolean} [options.hide=true] - Whether to hide the current Overlay.
     */
    Overlay.prototype.doTransition = function(options) {

        options = options || {};
        extend(options, this.options.transition);

        options.target = options.target || this.lecture.currentVideo.name;

        var target    = this.lecture.getComponent(options.target);
        var time      = options.time || target.data.currentTime;
        var returning = target === this.lecture.currentVideo &&
                        time   === target.data.currentTime;

        target.show();

        if (target.constructor === Video) {
            target.data.currentTime = time;
        }

        if (options.hide) {
            this.hide();
        }

        if (!options.stop) {
            target.play(returning);
        }
    };

    /**
     * Show overlay HTML element.
     *
     * @memberof Overlay
     */
    Overlay.prototype.show = function() {

        if (this.lecture.currentOverlays.hasOwnProperty(this.name)) {
            return;
        }

        this.lecture.currentOverlays[this.name] = this;
        this.container.style.zIndex = ++this.lecture.zIndexCount;
        this.container.classList.add('overlay-show');
        this.lecture.currentVideo.showTinyProgressBar();
    };

    /**
     * Hide overlay HTML element.
     *
     * @memberof Overlay
     */
    Overlay.prototype.hide = function() {

        if (!this.lecture.currentOverlays.hasOwnProperty(this.name)) {
            return;
        }

        delete this.lecture.currentOverlays[this.name];
        this.container.classList.remove('overlay-show');
        this.lecture.currentVideo.showFullProgressBar();
    };

    /**
     * Create a Lecture.
     *
     * A lecture is made of a series of interconnected components. Each
     * component is either a Video or an Overlay.
     *
     * @see Lecture#addVideo
     * @see Lecture#addOverlay
     * @constructor
     * @name Lecture
     *
     * @param {object} [options] - Lecture configuration options.
     * @param {object} [options.video] - Default Video configuration options.
     * @param {object} [options.overlay] - Default Overlay configuration options.
     */
    function Lecture(options) {

        this.options = options || {};
        extend(this.options, defaultOptions);

        this.videos = {};
        this.overlays = {};
        this.currentVideo = null;
        this.currentOverlays = {};
        this.zIndexCount = 0;
        this.container = createElement('div', 'lecture-container');
    }

    /**
     * Create a Video component.
     *
     * A video has:
     * - one source per available format/encoding.
     * - one subtitle per supported language.
     * - as many transitions as necessary.
     *
     * A video transition is fired when the video reaches a given time, and
     * either switches to another video, or shows an overlay.
     *
     * @see Video#addTransition
     * @memberof Lecture
     *
     * @param {string}  name - Video unique name.
     * @param {object}  [options] - Video configuration options.
     * @param {boolean} [options.muted=false] - Whether the video is muted.
     * @param {boolean} [options.markers=true] - Wheter the overlay markers are shown.
     * @param {string}  [options.controls='show'] - Whether the video controls are shown, hidden, or none.
     * @param {object}  [options.transition] - Video transitions options.
     *
     * @return {Video} New Video component.
     */
    Lecture.prototype.addVideo = function(name, options) {

        options = options || {};
        extend(options, this.options.video);

        return new Video(lecture, name, options);
    };

    /**
     * Create an Overlay component.
     *
     * An overlay is an HTML document that's shown over the video. It can be
     * used to control the flow of the lecture, or simply present something to
     * the user in a static format. It has a color background that can be made
     * transparent.
     *
     * An overlay can be static, meaning that the underlaying video will be
     * paused until there is an overlay transition; or it can be dynamic,
     * meaning that the video won't be stopped, and the overlay will be
     * displayed until the video reaches a given time.
     *
     * An overlay transition is fired when the doTransition function is called
     * from an overlay. You can use it to control the flow of the lecture.
     *
     * @example
     * <input type="submit" value="Restart" onclick="doTransition({time: 0})" />
     *
     * @see Overlay#doTransition
     * @memberof Lecture
     *
     * @param {string} name - Overlay unique name.
     * @param {string} source - Overlay HTML source URI.
     * @param {object} [options] - Overlay configuration options.
     * @param {number} [options.opacity=1] - Overlay background opacity.
     * @param {string} [options.background='white'] - Overlay background color.
     * @param {object} [options.transition] - Overlay transitions options.
     *
     * @return {Overlay} New Overlay component.
     */
    Lecture.prototype.addOverlay = function(name, source, options) {

        options = options || {};
        extend(options, this.options.overlay);

        return new Overlay(lecture, name, source, options);
    };

    /**
     * Get a lecture component (either a Video or an Overlay) by name.
     *
     * @memberof Lecture
     *
     * @param {string} name - Component unique name.
     *
     * @return {Video|Overlay} Existing Lecture component, or null if not found.
     */
    Lecture.prototype.getComponent = function(name) {

        return this.videos[name] || this.overlays[name] || null;
    };

    /**
     * Attach the Lecture container to a given HTML element.
     *
     * @memberof Lecture
     *
     * @param {string} id - HTML element id.
     *
     * @return {Lecture} This lecture, to allow method chaining.
     */
    Lecture.prototype.attach = function(id) {

        document.getElementById(id).appendChild(this.container);
        return this;
    };

    /**
     * Detect whether we are currently showing a static overlay.
     *
     * @see Lecture#Overlay
     * @memberof Lecture
     *
     * @return {boolean} True if we are showing a static overlay.
     */
    Lecture.prototype.showingOverlay = function() {

        for (var overlay in this.currentOverlays) {

            if (this.currentOverlays.hasOwnProperty(overlay)) {

                var cue = this.currentOverlays[overlay].fromCue;

                if (cue && cue.startTime === cue.endTime) {
                    return true;
                }
            }
        }

        return false;
    };

    return Lecture;

}());
