var Lecture = (function(document) {

    'use strict';

    /**
     * Lecture default options.
     */
    var defaultOptions = {
        video: {
            controls: true,
            startTime: 0,
            muted: false,
            background_color: 'black',
        },
        overlay: {
            margin: '10px',
            background_color: 'white',
            background_opacity: 1,
        },
    };

    /**
     * Video MIME types with file extensions.
     */
    var videoMIME = {
        'video/mp4': /^(mp4|m4a|m4p|m4b|m4r|m4v)$/i,
        'video/ogg': /^(ogg|ogv|oga|ogx|ogm|spx|opus)$/i,
        'video/webm': /^(webm)$/i,
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
     * @constructor
     * @name Video
     * @see Lecture#addVideo
     *
     * @param {string} id - Video id.
     * @param {object} options - Video configuration options.
     */
    function Video(id, options) {

        this.id = id;
        this.options = options;
        this.currentTime = options.startTime;

        this.container = this._VideoHTML();
        this.container.video = this;
    }

    /**
     * Create a video HTML element.
     *
     * @return {object} New video HTML element.
     */
    Video.prototype._VideoHTML = function() {

        var container = document.createElement('div');

        container.style.width = 'inherit';
        container.style.height = 'inherit';
        container.style.display = 'none';

        var video = document.createElement('video');

        video.setAttribute('preload', 'metadata');

        if (this.options.controls) {
            video.setAttribute('controls', 'controls');
        }

        if (this.options.muted) {
            video.setAttribute('muted', 'muted');
        }

        video.style.width = 'inherit';
        video.style.height = 'inherit';
        video.style['z-index'] = 0;

        video.appendChild(document.createTextNode(
            'Sorry, your browser doesn\'t support HTML5 video.'
        ));

        container.appendChild(video);

        if (this.options.background_color) {

            var background = document.createElement('div');

            background.style.top = 0;
            background.style.width = '100%';
            background.style.height = '100%';
            background.style.position = 'absolute';
            background.style['z-index'] = -1;
            background.style.background = this.options.background_color;

            container.appendChild(background);
        }

        this.video = video;
        this.transitions = this._TransitionsTrackHTML();

        var controls = this._ControlsHTML();
        this.controls = controls;
        container.appendChild(controls);

        return container;
    };

    /**
     * Append a transitions text track to an HTML video.
     *
     * @return {object} new HTML TextTrack element.
     */
    Video.prototype._TransitionsTrackHTML = function() {

        var src = this.options.transitions || '';

        /* IE needs this, but Chrome and Firefox don't support it by default. */
        if (this.video.hasOwnProperty('addTextTrack') && !src) {

            var track = this.video.addTextTrack('metadata');
            track.mode = 'hidden';
            return track;
        }

        var node = document.createElement('track');

        node.setAttribute('kind', 'metadata');
        node.setAttribute('src', src);
        node.addEventListener('load', function() {

            var cues = this.track.cues;

            for (var i = 0; i < cues.length; i++) {
                cues[i].onenter = cueEnterHandler;
                cues[i].onexit = cueExitHandler;
                cues[i].video = this.video;
            }
        });

        this.video.appendChild(node);
        node.track.mode = 'hidden';
        return node.track;
    };

    /**
     * TODO
     */
    Video.prototype._ControlsHTML = function() {

        var container = document.createElement('div');

        container.style.height = '35px';
        container.style.background = '#1b1b1b';

        var progress = document.createElement('div');

        progress.style.height = '8px';
        progress.style.background = '#444';
        progress.style.position = 'relative';

        container.appendChild(progress);

        var loaded = document.createElement('div');

        loaded.style.height = '100%';
        loaded.style.width = '50%';
        loaded.style.position = 'absolute';
        loaded.style.background = '#777';

        progress.appendChild(loaded);

        var done = document.createElement('div');

        done.style.height = '100%';
        done.style.width = '0%';
        done.style.background = '#cc181e';
        done.style.position = 'absolute';

        progress.appendChild(done);

        var bullet = document.createElement('div');

        bullet.style.height = '6px';
        bullet.style.width = '6px';
        bullet.style.position = 'absolute';
        bullet.style.top = '-4px';
        bullet.style.background = '#aeaeae';
        bullet.style.right = '-8px';
        bullet.style['border-radius'] = '8px';
        bullet.style.border = '5px solid #eaeaea';

        done.appendChild(bullet);

        return container;
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

            var extension = source.match(/[a-zA-Z0-9]+$/);

            for (var mime in videoMIME) {
                if (videoMIME[mime].test(extension)) {
                    type = mime;
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
     * @param {string} [label] - User readable title.
     *
     * @return {Video} This video, to allow method chaining.
     */
    Video.prototype.addSubtitle = function(language, source, label) {

        var subtitle = document.createElement('track');

        subtitle.setAttribute('kind', 'subtitle');
        subtitle.setAttribute('src', source);
        subtitle.setAttribute('srclang', language);

        if (label) {
            subtitle.setAttribute('label', label);
        }

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
    var cueEnterHandler = function() {

        this.video.currentTime = this.startTime;

        var tokens = this.text.split(' ');
        var target = this.video.lecture.getComponent(tokens[0]);
        var time = tokens[1] && parseSeconds(tokens[1]);
        var play = tokens[2] !== 'stop';

        target.show();

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
    var cueExitHandler = function() {

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

        if (this.video.paused) {

            if (!returning) {
                this.video.currentTime = this.currentTime;
            }

            this.video.play();
        }
    };

    /**
     * Stop video reproduction.
     *
     * @memberof Video
     */
    Video.prototype.pause = function() {

        this.video.pause();
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
        this.container.style.display = 'block';
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
        this.container.style.display = 'none';
    };

    /**
     * Create an Overlay component.
     *
     * @constructor
     * @name Overlay
     * @see Lecture#addOverlay
     *
     * @param {string} id - Overlay id.
     * @param {string} source - Overlay source URI.
     * @param {object} options - Overlay configuration options.
     */
    function Overlay(id, source, options) {

        this.id = id;
        this.source = source;
        this.options = options;
        this.container = this._OverlayHTML();
        this.container.overlay = this;
    }

    /**
     * Create an overlay HTML element.
     *
     * @return {object} New overlay element.
     */
    Overlay.prototype._OverlayHTML = function() {

        var container = document.createElement('div');

        container.style.top = 0;
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'absolute';
        container.style.display = 'none';

        if (this.options.background_color) {

            var background = document.createElement('div');

            background.style.width = '100%';
            background.style.height = '100%';
            background.style.position = 'absolute';
            background.style.background = this.options.background_color;
            background.style.opacity = this.options.background_opacity;
            background.style.filter = 'alpha(opacity=' + this.options.background_opacity + ')';

            container.appendChild(background);
        }

        var foreground = document.createElement('iframe');

        foreground.setAttribute('src', this.source);
        foreground.setAttribute('seamless', 'seamless');

        foreground.style.border = 0;
        foreground.style.width = '100%';
        foreground.style.height = '100%';
        foreground.style.position = 'absolute';

        container.appendChild(foreground);

        var margin = this.options.margin;

        foreground.addEventListener('load', function() {

            function doTransition(options) {
                frameElement.parentNode.overlay.doTransition(options);
            }

            var html = this.contentDocument.firstChild;

            html.style.margin = margin;

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
        this.container.style.display = 'block';
        this.container.style['z-index'] = ++this.lecture.zIndexCount;
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
        this.container.style.display = 'none';
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
        this.zIndexCount = 0;
        this.currentVideo = null;
        this.currentOverlays = {};
        this.container = this._LectureHTML();
    }

    /**
     * TODO
     */
    Lecture.prototype._LectureHTML = function() {

        var container = document.createElement('div');

        container.style.width = 'inherit';
        container.style.height = 'inherit';
        container.style.position = 'absolute';

        return container;
    };

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
     * @param {string}  id - Video id.
     * @param {object}  [options] - Video configuration options.
     * @param {string}  [options.transitions] - Transitions file URI.
     * @param {number}  [options.startTime=0] - Video start time.
     * @param {boolean} [options.muted=false] - Whether the video is muted.
     * @param {boolean} [options.controls=true] - Whether the video controls are shown.
     * @param {string}  [options.background_color=black] - Color of the background.
     *
     * @return {Video} New Video component.
     */
    Lecture.prototype.addVideo = function(id, options) {

        options = options || {};
        extend(options, this.options.video);

        var video = new Video(id, options);

        video.lecture = this;
        this.videos[id] = video;
        this.container.appendChild(video.container);

        return video;
    };

    /**
     * Create an Overlay component.
     *
     * An overlay is an HTML that's shown over the video. An overlay can be
     * used to control the flow of the lecture, or simply show something to the
     * user in a static format.
     *
     * @memberof Lecture
     *
     * @param {string} id - Overlay id.
     * @param {string} source - Overlay source URI.
     * @param {object} [options] - Overlay configuration options.
     * @param {string} [options.margin=10px] - Overlay margin size.
     * @param {number} [options.background_opacity=1] - Opacity of the background.
     * @param {string} [options.background_color=white] - Color of the background.
     *
     * @return {Overlay} New Overlay component.
     */
    Lecture.prototype.addOverlay = function(id, source, options) {

        options = options || {};
        extend(options, this.options.overlay);

        var overlay = new Overlay(id, source, options);

        overlay.lecture = this;
        this.overlays[id] = overlay;
        this.container.appendChild(overlay.container);

        return overlay;
    };

    /**
     * Get a lecture component (either a Video or an Overlay) by id.
     *
     * @memberof Lecture
     *
     * @param {string} id - Component id.
     *
     * @return {Video|Overlay} Existing Lecture component.
     */
    Lecture.prototype.getComponent = function(id) {

        if (this.videos.hasOwnProperty(id)) {
            return this.videos[id];
        }

        if (this.overlays.hasOwnProperty(id)) {
            return this.overlays[id];
        }

        return null;
    };

    /**
     * TODO
     */
    Lecture.prototype.attach = function(id) {

        document.getElementById(id).appendChild(this.container);
        return this;
    };

    return Lecture;

}(document));
