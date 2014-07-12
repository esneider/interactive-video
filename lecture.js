var Lecture = (function(document) {

    'use strict';

    /**
     * Defaults for Lecture's options.
     */
    var defaultOptions = {
        width: '500px',
        height: '300px',
        video: {
            controls: true,
            startTime: 0,
            muted: false,
        },
        overlay: {
            padding: '10px',
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
     * Format seconds as hh:mm:ss.xxx (xxx indicates miliseconds).
     *
     * @param {number} seconds - Number of seconds.
     *
     * @return {string} Formatted string.
     */
    function secondsToString(seconds) {

        function getDecimals(n, places) {
            return (n - Math.floor(n) + 1e-6).toString().substr(2, places);
        }

        var s = '';

        s += getDecimals(seconds / 360000, 2) + ':';
        s += getDecimals((seconds % 3600) / 6000, 2) + ':';
        s += getDecimals((seconds % 60) / 100, 2) + '.';
        s += getDecimals(seconds, 3);

        return s;
    }

    /**
     * Create a Video component.
     *
     * @constructor
     * @param {string} id - Video id.
     * @param {object} options - Video configuration options.
     * @see Lecture#newVideo
     */
    function Video(id, options) {

        this.id = id;
        this.options = options;
        this.currentTime = options.startTime;
        this.element = this._HTMLVideo();
        this.element.video = this;
    }

    /**
     * Create a video HTML element.
     *
     * @private
     * @return {object} New video HTML element.
     */
    Video.prototype._HTMLVideo = function() {

        var video = document.createElement('video');

        video.setAttribute('width', this.options.width);
        video.setAttribute('height', this.options.height);
        video.setAttribute('preload', 'metadata');

        video.style.display = 'none';
        video.style.position = 'absolute';

        if (this.options.controls) {
            video.setAttribute('controls', 'controls');
        }

        if (this.options.muted) {
            video.setAttribute('muted', 'muted');
        }

        var transitions = document.createElement('track');

        transitions.setAttribute('default', 'default');
        transitions.setAttribute('kind', 'metadata');

        if (this.options.transitions) {
            transitions.setAttribute('src', this.options.transitions);
        }

        video.appendChild(transitions);
        video.appendChild(document.createTextNode(
            'Sorry, your browser doesn\'t suport HTML5 video.'
        ));

        this.transitions = transitions;

        return video;
    };

    /**
     * Add a video source for a given video format/encoding.
     *
     * @param {string} source - Video source URI.
     * @param {string} [type] - Video MIME type.
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

        var element = document.createElement('source');

        element.setAttribute('src', source);
        element.setAttribute('type', type);

        this.element.appendChild(element);
    };

    /**
     * Add a subtitle track to the video.
     *
     * @param {string} language - Language of the subtitles (en, es, ...).
     * @param {string} source - Subtitles file URI.
     * @param {string} [label] - User readable title.
     */
    Video.prototype.addSubtitle = function(language, source, label) {

        var subtitle = document.createElement('track');

        subtitle.setAttribute('kind', 'subtitle');
        subtitle.setAttribute('src', source);
        subtitle.setAttribute('srclang', language);

        if (label) {
            subtitle.setAttribute('label', label);
        }

        this.element.appendChild(subtitle);
    };

    /**
     * Add a transition to another Video.
     *
     * @param {number} time - Trigger the transition at this given time (in seconds).
     * @param {string} videoId - TODO
     * @param {number} [startingTime] -
     * @param {boolean} [startPlaying=true] -
     */
    Video.prototype.addVideoTransition = function(time, videoId, startingTime, startPlaying) {

        var text = videoId;

        if (typeof startingTime !== 'undefined') {
            text += ' ' + secondsToString(startingTime);
        }

        if (typeof startPlaying !== 'undefined' && !startPlaying) {
            text += ' stop';
        }

        this.transitions.addCue(new TextTrackCue(time, time, text));
    };

    /**
     * TODO
     */
    Video.prototype.addOverlayTransition = function() {

    };

    /**
     * Show video HTML element.
     */
    Video.prototype.show = function() {

        this.element.setAttribute('preload', 'auto');
        this.element.style.display = 'block';
    };

    /**
     * Hide video HTML element.
     */
    Video.prototype.hide = function() {

        this.element.setAttribute('preload', 'metadata');
        this.element.style.display = 'none';
    };

    /**
     * Create an Overlay component.
     *
     * @constructor
     * @param {string} id - Overlay id.
     * @param {string} source - Overlay source URI.
     * @param {object} options - Overlay configuration options.
     * @see Lecture#newOverlay
     */
    function Overlay(id, source, options) {

        this.id = id;
        this.source = source;
        this.options = options;
        this.element = this._HTMLOverlay();
        this.element.overlay = this;
    }

    /**
     * Create an overlay HTML element.
     *
     * @private
     * @return {object} New overlay element.
     */
    Overlay.prototype._HTMLOverlay = function() {

        var overlay = document.createElement('div');

        overlay.style.width = this.options.width;
        overlay.style.height = this.options.height;
        overlay.style.display = 'none';
        overlay.style.position = 'absolute';

        var background = document.createElement('div');

        background.style.width = this.options.width;
        background.style.height = this.options.height;
        background.style.position = 'absolute';
        background.style.background = this.options.background_color;
        background.style.opacity = this.options.background_opacity;
        background.style.filter = 'alpha(opacity=' + this.options.background_opacity + ')';

        var foreground = document.createElement('iframe');

        foreground.setAttribute('src', this.options.source);
        foreground.setAttribute('width', this.options.width);
        foreground.setAttribute('height', this.options.height);

        foreground.style.position = 'absolute';
        // TODO: add padding

        overlay.appendChild(background);
        overlay.appendChild(foreground);

        return overlay;
    };

    /**
     * Show overlay HTML element.
     */
    Overlay.prototype.show = function() {

        this.element.style.display = 'block';
    };

    /**
     * Hide overlay HTML element.
     */
    Overlay.prototype.hide = function() {

        this.element.style.display = 'none';
    };

    /**
     * Create a Lecture.
     *
     * A Lecture is made of a series of interconnected components. Each
     * component is either a Video or an Overlay.
     *
     * @constructor
     * @param {object} element - Base HTML element on which to build the Lecture.
     * @param {object} options - Lecture configuration options.
     * @param {number} options.width - Lecture HTML elements width.
     * @param {number} options.height - Lecture HTML elements height.
     * @param {object} [options.video] - Default Video configuration options.
     * @param {object} [options.overlay] - Default Overlay configuration options.
     */
    function Lecture(element, options) {

        this.videos   = {};
        this.overlays = {};
        this.element  = element;
        this.options  = options || {};

        extend(this.options, defaultOptions);

        this.currentVideo = null;
        this.currentComponent = null;

        element.lecture = this;
    }

    // Lecture.prototype.start
    // Lecture.prototype.resize
    // Lecture.prototype.addVideo - DONE
    // Lecture.prototype.addOverlay - DOING

    /**
     * Create a Video component.
     *
     * A Video should have:
     * - one source per available format/encoding.
     * - one subtitle per supported language.
     * - as many transitions as necessary.
     *
     * A transition is fired when the video reaches a given time, and either
     * switches to another Video, or shows an Overlay.
     *
     * @param {string}  id - Video id.
     * @param {object}  [options] - Video configuration options.
     * @param {string}  [options.transitions] - Transitions file URI.
     * @param {number}  [options.startTime=0] - Video start time.
     * @param {boolean} [options.muted=false] - Whether the video is muted.
     * @param {boolean} [options.controls=true] - Whether the video controls are shown.
     *
     * @return {Video} New Video component.
     */
    Lecture.prototype.addVideo = function(id, options) {

        options = options || {};
        options.width = this.options.width;
        options.height = this.options.height;
        extend(options, this.options.video);

        var video = new Video(id, options);

        this.videos[id] = video;
        this.currentVideo = this.currentVideo || id;
        this.currentComponent = this.currentComponent || id;

        this.element.appendChild(video.element);

        return video;
    };

    /**
     * Create an Overlay component.
     *
     * An Overlay is an HTML that's shown over the video. An overlay can be
     * used to control the flow of the lecture, or simply show somthing to the
     * user in a static format.
     *
     * @param {string} id - Overlay id.
     * @param {string} source - Overlay source URI.
     * @param {object} [options] - Overlay configuration options.
     * @param {string} [options.padding=10px] - Overlay padding size.
     * @param {number} [options.background_opacity=1] - Opacity of the background.
     * @param {string} [options.background_color=white] - Color of the background.
     *
     * @return {Overlay} New Overlay component.
     */
    Lecture.prototype.addOverlay = function(id, source, options) {

        options = options || {};
        options.width = this.options.width;
        options.height = this.options.height;
        extend(options, this.options.overlay);

        var overlay = new Overlay(id, source, options);

        this.overlays[id] = overlay;
        this.currentComponent = this.currentComponent || id;

        this.element.appendChild(overlay.element);

        return overlay;
    };

    /**
     * Get a Video or an Overlay component by id.
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

    return Lecture;

}(document));
