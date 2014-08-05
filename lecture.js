var Lecture = (function() {

    'use strict';

    /**
     * Lecture default options.
     */
    var defaultOptions = {
        video: {
            controls: true,
            startTime: 0,
            muted: false,
        },
        overlay: {
            margin: '10px',
        },
        transition: {
            play: true,
            duration: 0,
            stop: false,
            hide: true,
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
     * Create a Video component.
     *
     * @see Lecture#addVideo
     * @constructor
     * @name Video
     *
     * @param {Lecture} lecture - Parent lecture.
     * @param {string}  id - Video unique name.
     * @param {object}  options - Video configuration options.
     */
    function Video(lecture, id, options) {

        this.lecture = lecture;
        this.id = id;
        this.options = options;

        this.data = {};
        this.currentTime = options.startTime;

        createVideoContainer.call(this);
        createTransitionsTrack.call(this);
        addVideoListeners.call(this);
        addContainerListeners.call(this);

        this.container.video = this;
        lecture.videos[id] = this;
        lecture.container.appendChild(this.container);
    }

    /**
     * Create and setup the HTML elements for a Video.
     */
    function createVideoContainer() {

        this.container  = document.createElement('div');
        this.video      = newVideoElement.call(this);
        this.background = document.createElement('div');
        this.controls   = newControls.call(this);

        this.container.appendChild(this.video);
        this.container.appendChild(this.background);
        this.container.appendChild(this.controls);

        this.container.classList.add('video-container');
        this.background.classList.add('video-background');

        if (this.options.background) {
            this.background.style.background = this.options.background;
        }
    }

    function addContainerListeners() {

        var that = this;

        this.container.addEventListener('mouseenter', this.showFullProgress);
        this.container.addEventListener('mouseleave', this.showTinyProgress);
        this.container.addEventListener('mousemove', function() {

            that.showFullProgress();
            clearInterval(that.mouseTimer);
            that.mouseTimer = setInterval(that.showTinyProgress, 3000);
        });
    }

    /**
     * Create an HTML video element.
     *
     * @return {object} Video element.
     */
    function newVideoElement() {

        var video = document.createElement('video');

        video.classList.add('video-video');

        video.setAttribute('preload', 'metadata');
        video.setAttribute('controls', 'controls');

        if (this.options.muted) {
            video.setAttribute('muted', 'muted');
        }

        video.appendChild(document.createTextNode(
            'Sorry, your browser doesn\'t support HTML5 video.'
        ));

        return video;
    }

    /**
     * Create the HTML elements for the video controls.
     *
     * @return {object} Controls container element.
     */
    function newControls() {

        var container = document.createElement('div');
        var controls  = document.createElement('div');
        var progress  = document.createElement('div');
        var padding   = document.createElement('div');
        var loaded    = document.createElement('div');
        var bar       = document.createElement('div');
        var played    = document.createElement('div');
        var bullet    = document.createElement('div');
        var button    = document.createElement('div');
        var volume    = document.createElement('div');
        var speaker   = document.createElement('div');

        container.classList.add('controls-container');
         controls.classList.add('controls-controls');
         progress.classList.add('controls-progress');
          padding.classList.add('controls-padding');
           loaded.classList.add('controls-loaded');
              bar.classList.add('controls-bar');
           played.classList.add('controls-played');
           bullet.classList.add('controls-bullet');
           button.classList.add('controls-button');
           button.classList.add('controls-play');
           volume.classList.add('controls-volume');
          speaker.classList.add('controls-speaker');
          speaker.classList.add('controls-speaker-mute');

        container.appendChild(padding);
        container.appendChild(progress);
        container.appendChild(controls);
         progress.appendChild(loaded);
         progress.appendChild(bar);
              bar.appendChild(played);
           played.appendChild(bullet);
         controls.appendChild(button);
         controls.appendChild(volume);
           volume.appendChild(speaker);

        var that = this;

        function mouseDown(event) {

            /* Make sure it's the left button (different in IE and the rest,
             * thus the magic).
             */
            if (event.button != !event.hasOwnProperty('which')) {
                return;
            }

            var paused = that.video.paused;

            that.pause();
            that.setVideoPosition(event.pageX);
            bullet.classList.add('controlls-bullet-hover');

            function mouseMove(event) {

                if (event.button == !event.hasOwnProperty('which')) {
                    that.setVideoPosition(event.pageX);
                } else {
                    mouseUp();
                }
            }

            function mouseUp(event) {

                if (event) {
                    that.setVideoPosition(event.pageX);
                }

                bullet.classList.remove('controlls-bullet-hover');
                window.removeEventListener('mousemove', mouseMove);
                window.removeEventListener('mouseup', mouseUp);

                if (!paused) {
                    that.play();
                }
            }

            window.addEventListener('mousemove', mouseMove);
            window.addEventListener('mouseup', mouseUp);
        }

        progress.addEventListener('mousedown', mouseDown);
         padding.addEventListener('mousedown', mouseDown);
          bullet.addEventListener('mousedown', mouseDown);

        this.setVideoPosition = function(pageX) {

            var bounds = padding.getBoundingClientRect();
            var width  = bounds.right - bounds.left;
            var left   = bounds.left + window.pageXOffset;
            var pos    = that.data.duration * (pageX - left) / width;

            that.setPlayPosition(pos);
            that.currentTime = pos;
            that.video.currentTime = that.currentTime;
        }

        this.setLoadPosition = function(position) {

            var percentage = 100 * Math.max(0, Math.min(1, position / this.data.duration));

            loaded.style.width = percentage + '%';

            this.data.loadPosition = position;
        };

        this.setPlayPosition = function(position) {

            var percentage = 100 * Math.max(0, Math.min(1, position / this.data.duration));

            played.style.width = percentage + '%';

            this.data.playPosition = position;
        };

        this.showFullProgress = function() {

            if (!that.video.paused || !that.lecture.showingOverlay()) {
                progress.classList.remove('controls-progress-tiny');
                bullet.classList.remove('controls-bullet-tiny');
            }
        };

        this.showTinyProgress = function() {

            if (!that.video.paused) {
                progress.classList.add('controls-progress-tiny');
                bullet.classList.add('controls-bullet-tiny');
            }
        };

        this.showPlayButton = function() {

            button.classList.remove('controls-pause');
            button.classList.add('controls-play');
        };

        this.showPauseButton = function() {

            button.classList.remove('controls-play');
            button.classList.add('controls-pause');
        };

        button.addEventListener('click', function() {

            if (that.video.paused) {
                that.play();
            } else {
                that.pause();
            }
        });

        return container;
    }

    /**
     * Setup video event listeners.
     */
    function addVideoListeners() {

        var that = this;

        this.video.addEventListener('durationchange', function() {

            that.data.duration = this.duration;
        });

        this.video.addEventListener('loadedmetadata', function() {

            that.data.width = this.videoWidth;
            that.data.height = this.videoHeight;
        });

        this.video.addEventListener('progress', function() {

            that.progressTimer = setInterval(function () {

                var position = that.video.currentTime;
                var ranges = that.video.buffered;
                var bound = 0;

                for (var i = 0; i < ranges.length; i++) {

                    var start = ranges.start(i);
                    var end = ranges.end(i);

                    if (start <= position && position <= end && end > bound) {
                        bound = end;
                    }
                }

                that.setLoadPosition(bound);
            }, 200);
        });

        this.video.addEventListener('timeupdate', function() {

            that.setPlayPosition(this.currentTime);
        });

        this.video.addEventListener('ended', this.showFullProgress);
    }

    /**
     * Append a transitions text track to the HTML video.
     */
    function createTransitionsTrack() {

        /* IE needs this, but Chrome and Firefox don't support it by default. */
        if (this.video.addTextTrack) {

            this.transitions = this.video.addTextTrack('metadata');

        } else {

            var node = document.createElement('track');

            node.setAttribute('kind', 'metadata');
            node.setAttribute('src', '');

            this.video.appendChild(node);
            this.transitions = node.track;
        }

        this.transitions.mode = 'hidden';
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

        var node = document.createElement('track');
        var that = this;

        node.setAttribute('kind', 'metadata');
        node.setAttribute('src', source);
        node.addEventListener('load', function() {

            var cues = this.track.cues;

            for (var i = 0; i < cues.length; i++) {
                cues[i].onenter = cueEnterHandler;
                cues[i].onexit = cueExitHandler;
                cues[i].video = that.video;
            }
        });

        this.video.appendChild(node);
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

        var node = document.createElement('source');

        node.setAttribute('src', source);
        node.setAttribute('type', type);

        this.video.appendChild(node);
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

        var subtitle = document.createElement('track');

        subtitle.setAttribute('kind', 'subtitle');
        subtitle.setAttribute('src', source);
        subtitle.setAttribute('srclang', language);

        this.video.appendChild(subtitle);
        return this;
    };

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
     * Handler for cues enter event.
     */
    function cueEnterHandler() {

        this.video.currentTime = this.startTime;

        var tokens = this.text.split(' ');
        var target = this.video.lecture.getComponent(tokens[0]);
        var time = tokens[1] && parseSeconds(tokens[1]);
        var play = tokens[2] !== 'stop';

        target.show();
        target.fromCue = this;

        if (target.constructor === Video) {

            if (typeof time === "number") {
                target.currentTime = time;
            }

            if (play) {
                target.play();
            }
        }

        if (target.constructor === Overlay && this.startTime === this.endTime) {
            this.video.pause();
        }
    };

    /**
     * Handler for cues exit event.
     */
    function cueExitHandler() {

        var target = this.video.lecture.getComponent(this.text);

        if (target.constructor === Overlay && this.startTime !== this.endTime) {
            target.hide();
        }
    };

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
     * @param {number}  [options.duration=0] - If not 0, duration of the Overlay (video will continue playing).
     *
     * @return {Video} This video, to allow method chaining.
     */
    Video.prototype.addTransition = function(target, time, options) {

        options = options || {};

        var until = time + (options.duration || 0);
        var text  = target.id;

        if (options.hasOwnProperty('time')) {
            text += ' ' + options.time;
        }

        if (options.hasOwnProperty('play') && !options.play) {
            text += ' stop';
        }

        var cue = new (VTTCue || TextTrackCue)(time, until, text);

        cue.onenter = cueEnterHandler;
        cue.onexit = cueExitHandler;
        cue.video = this;

        /* Needed due to a Chrome bug. */
        Lecture.cues = Lecture.cues || [];
        Lecture.cues.push(cue);

        this.transitions.addCue(cue);

        return this;
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
                this.video.currentTime = this.currentTime;
            }

            this.video.play();
            this.showPauseButton();
        }
    };

    /**
     * Stop video reproduction.
     *
     * @memberof Video
     */
    Video.prototype.pause = function() {

        this.video.pause();
        this.showPlayButton();
        this.showFullProgress();
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
     * @param {string}  id - Overlay unique name.
     * @param {string}  source - Overlay source URI.
     * @param {object}  options - Overlay configuration options.
     */
    function Overlay(lecture, id, source, options) {

        this.lecture = lecture;
        this.id = id;
        this.source = source;
        this.options = options;

        this.container = newOverlay.call(this);
        this.container.overlay = this;

        lecture.overlays[id] = this;
        lecture.container.appendChild(this.container);
    }

    /**
     * Create an overlay HTML element.
     *
     * @return {object} New overlay element.
     */
    function newOverlay() {

        var container  = document.createElement('div');
        var background = document.createElement('div');
        var foreground = document.createElement('iframe');

         container.classList.add('overlay-container');
        background.classList.add('overlay-background');
        foreground.classList.add('overlay-foreground');

        container.appendChild(background);
        container.appendChild(foreground);

        if (this.options.background) {
            background.style.background = this.options.background;
        }

        if (this.options.opacity) {
            background.style.opacity = this.options.opacity;
            background.style.filter = 'alpha(opacity=' + this.options.opacity + ')';
        }

        foreground.setAttribute('src', this.source);
        foreground.setAttribute('seamless', 'seamless');

        foreground.addEventListener('load', function() {

            function doTransition(options) {
                frameElement.parentNode.overlay.doTransition(options);
            }

            var html = this.contentDocument.firstChild;

            html.style.margin = '15px';

            var script = this.contentDocument.createElement('script');

            script.type = 'text/javascript';
            script.text = doTransition.toString();

            html.getElementsByTagName('head')[0].appendChild(script);
        });

        return container;
    };

    /**
     * TODO
     *
     * @memberof Overlay
     *
     * @param {object}  [options]
     * @param {object}  [options.target=last_video]
     * @param {number}  [options.time=target.currentTime]
     * @param {boolean} [options.stop=false]
     * @param {boolean} [options.hide=true]
     */
    Overlay.prototype.doTransition = function(options) {

        options = options || {};

        extend(options, {
            target: this.lecture.currentVideo.id,
            stop: false,
            hide: true,
        });

        options.target = this.lecture.getComponent(options.target);

        extend(options, {time: options.target.currentTime});

        var returning = options.target === this.lecture.currentVideo &&
                        options.time   === this.lecture.currentVideo.currentTime;

        options.target.show();
        options.target.currentTime = options.time;

        if (options.hide) {
            this.hide();
        }

        if (!options.stop) {
            options.target.play(returning);
        }
    };

    /**
     * Show overlay HTML element.
     *
     * @memberof Overlay
     */
    Overlay.prototype.show = function() {

        if (this.lecture.currentOverlays.hasOwnProperty(this.id)) {
            return;
        }

        this.lecture.currentOverlays[this.id] = this;
        this.container.style.zIndex = ++this.lecture.zIndexCount;
        this.container.classList.add('overlay-show');
        this.lecture.currentVideo.showTinyProgress();
    };

    /**
     * Hide overlay HTML element.
     *
     * @memberof Overlay
     */
    Overlay.prototype.hide = function() {

        if (!this.lecture.currentOverlays.hasOwnProperty(this.id)) {
            return;
        }

        delete this.lecture.currentOverlays[this.id];
        this.container.classList.remove('overlay-show');
        this.lecture.currentVideo.showFullProgress();
    };

    /**
     * Create a Lecture.
     *
     * A lecture is made of a series of interconnected components. Each
     * component is either a Video or an Overlay.
     *
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

        this.container = document.createElement('div');
        this.container.classList.add('lecture-container');
    }

    /**
     * Create a Video component.
     *
     * A video should have:
     * - one source per available format/encoding.
     * - one subtitle per supported language.
     * - as many transitions as necessary.
     *
     * A transition is fired when the video reaches a given time, and either
     * switches to another video, or shows an overlay.
     *
     * @memberof Lecture
     *
     * @param {string}  id - Video unique name.
     * @param {object}  [options] - Video configuration options.
     * @param {number}  [options.startTime=0] - Video start time.
     * @param {boolean} [options.muted=false] - Whether the video is muted.
     * @param {boolean} [options.controls=true] - Whether the video controls are shown.
     * @param {string}  [options.background=black] - Background color.
     *
     * @return {Video} New Video component.
     */
    Lecture.prototype.addVideo = function(id, options) {

        options = options || {};
        extend(options, this.options.video);

        return new Video(lecture, id, options);
    };

    /**
     * Create an Overlay component.
     *
     * An overlay is an HTML that's shown over the video. An overlay can be
     * used to control the flow of the lecture, or simply show something to the
     * user in a static format. It has color background that can be made
     * transparent.
     *
     * From an overlay, you can use the function doTransition to control the
     * flow of the lecture.
     *
     * @example
     * <input type="submit" value="Restart" onclick="doTransition({time: 0})" />
     *
     * @memberof Lecture
     * @see Overlay#doTransition
     *
     * @param {string} id - Overlay unique name.
     * @param {string} source - Overlay source URI.
     * @param {object} [options] - Overlay configuration options.
     * @param {string} [options.margin=10px] - Overlay margin size.
     * @param {number} [options.opacity=1] - Background opacity.
     * @param {string} [options.background=white] - Background color.
     *
     * @return {Overlay} New Overlay component.
     */
    Lecture.prototype.addOverlay = function(id, source, options) {

        options = options || {};
        extend(options, this.options.overlay);

        return new Overlay(lecture, id, source, options);
    };

    /**
     * Get a lecture component (either a Video or an Overlay) by id.
     *
     * @memberof Lecture
     *
     * @param {string} id - Component unique name.
     *
     * @return {Video|Overlay} Existing Lecture component.
     */
    Lecture.prototype.getComponent = function(id) {

        return this.videos[id] || this.overlays[id] || null;
    };

    /**
     * TODO
     *
     * @memberof Lecture
     *
     * @param {string} id - Component unique name.
     *
     * @return {Lecture} This lecture, to allow method chaining.
     */
    Lecture.prototype.attach = function(id) {

        document.getElementById(id).appendChild(this.container);
        return this;
    };

    /**
     * TODO
     *
     * @memberof Lecture
     *
     * @return {boolean} TODO
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
