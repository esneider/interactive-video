var Lecture = (function(window, document) {

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
     * Format seconds as hh:mm:ss.xxx (xxx indicates milliseconds).
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
     * @see Lecture#newVideo
     * @constructor
     * @param {string} id - Video id.
     * @param {object} options - Video configuration options.
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

        this.transitions = this._HTMLTransitions(video);
        this.transitions.mode = "hidden";
        this.transitions.oncuechange = function () {
            console.log(this.activeCues);
        }

        video.appendChild(document.createTextNode(
            'Sorry, your browser doesn\'t support HTML5 video.'
        ));

        return video;
    };

    /**
     * Append a transitions text track to an HTML video.
     *
     * @private
     * @param {object} video - HTML video element.
     *
     * @return {object} new HTML TextTrack element.
     */
    Video.prototype._HTMLTransitions = function(video) {

        var src = this.options.transitions || "";

        /* IE needs this, but Chrome and Firefox don't support it by default. */
        if (video.hasOwnProperty('addTextTrack') && !src) {

            return video.addTextTrack('metadata');
        }

        var track = document.createElement('track');

        track.setAttribute('kind', 'metadata');
        track.setAttribute('src', src);
        video.appendChild(track);
        return track.track;
    };

    /**
     * Add a video source for a given video format/encoding.
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

        var element = document.createElement('source');

        element.setAttribute('src', source);
        element.setAttribute('type', type);

        this.element.appendChild(element);
        return this;
    };

    /**
     * Add a subtitle track to the video.
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

        this.element.appendChild(subtitle);
        return this;
    };

    /**
     * Add a transition to another component.
     *
     * @param {string}  target - Target Video or Overlay.
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
            text += ' ' + secondsToString(options.time);
        }

        if (options.hasOwnProperty('play') && !options.play) {
            text += ' stop';
        }

        var cue = window.hasOwnProperty('VTTCue') ?
                  new window.VTTCue(time, until, text) :
                  new window.TextTrackCue(time, until, text);

        this.transitions.addCue(cue);
        console.log(this.transitions);
        return this;
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
     * @see Lecture#newOverlay
     * @constructor
     * @param {string} id - Overlay id.
     * @param {string} source - Overlay source URI.
     * @param {object} options - Overlay configuration options.
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

        foreground.setAttribute('src', this.source);
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
     * A lecture is made of a series of interconnected components. Each
     * component is either a Video or an Overlay.
     *
     * @constructor
     * @param {object} element - Base HTML element on which to build the Lecture.
     * @param {string} width - Lecture HTML element width.
     * @param {string} height - Lecture HTML element height.
     * @param {object} [options] - Lecture configuration options.
     * @param {object} [options.video] - Default Video configuration options.
     * @param {object} [options.overlay] - Default Overlay configuration options.
     */
    function Lecture(element, width, height, options) {

        this.width = width;
        this.height = height;
        this.element = element;
        this.options = options || {};

        extend(this.options, defaultOptions);

        this.videos = {};
        this.overlays = {};
        this.currentVideo = null;
        this.currentComponent = null;

        element.lecture = this;
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
        options.width = this.width;
        options.height = this.height;
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
     * An overlay is an HTML that's shown over the video. An overlay can be
     * used to control the flow of the lecture, or simply show something to the
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
        options.width = this.width;
        options.height = this.height;
        extend(options, this.options.overlay);

        var overlay = new Overlay(id, source, options);

        this.overlays[id] = overlay;
        this.currentComponent = this.currentComponent || id;

        this.element.appendChild(overlay.element);

        return overlay;
    };

    /**
     * Get a lecture component (either a Video or an Overlay) by id.
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

}(window, document));
