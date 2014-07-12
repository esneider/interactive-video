var Lecture = (function(document) {

    'use strict';

    /**
     * Default values for all Lecture options.
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
            margin: '10px',
            background_color: 'white',
            background_opacity: 1,
        },
    };

    /**
     * Video MIME types with possible file extensions.
     */
    var videoMIME = {
        'video/mp4': /^(mp4|m4a|m4p|m4b|m4r|m4v)$/i,
        'video/ogg': /^(ogg|ogv|oga|ogx|ogm|spx|opus)$/i,
        'video/webm': /^(webm)$/i,
    };

    /**
     * Create a new XMLHttpRequest.
     */
    function newRequest() {

        try {
            return new XMLHttpRequest();
        } catch (error) {}

        try {
            return new ActiveXObject('Msxml2.XMLHTTP');
        } catch (error) {}

        try {
            return new ActiveXObject('Microsoft.XMLHTTP');
        } catch (error) {}

        throw new Error('Could not create HTTP request object.');
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
     * Format seconds as hh:mm:ss.xxx (xxx indicates miliseconds).
     *
     * @param {number} seconds - Number of seconds to format.
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
     * Create a new video.
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
     * Create a new Video HTML element.
     *
     * @private
     * @return {object} New Video HTML element.
     */
    Video.prototype._HTMLVideo = function() {

        var video = document.createElement('video');

        video.setAttribute('width', this.options.width);
        video.setAttribute('height', this.options.height);
        video.setAttribute('preload', 'metadata');

        video.style.display = 'none';
        video.style.position = 'absolute';

        if (this.options.controls)
            video.setAttribute('controls', 'controls');

        if (this.options.muted)
            video.setAttribute('muted', 'muted');

        var transitions = document.createElement('track');

        transitions.setAttribute('default', 'default');
        transitions.setAttribute('kind', 'metadata');

        if (this.options.transitions)
            transitions.setAttribute('src', this.options.transitions);

        video.appendChild(transitions);
        video.appendChild(document.createTextNode(
            'Your browser does not suport HTML5 video. Please update it.'
        ));

        this.transitions = transitions;

        return video;
    };

    /**
     * Add a source for a given video format/encoding.
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
     * Add a subtitle track to the Video.
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
     * TODO
     *
     * @param {number} time - Trigger the transition at this given time (in seconds).
     * @param {string} videoId -
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
     * Create a new overlay.
     *
     * @constructor
     * @param {string} id - Overlay element id.
     * @param {string} uri - Overlay URI.
     * @param {object} options - Overlay configuration options.
     */
    function Overlay(id, uri, options) {

        this.id = id;
        this.uri = uri;
        this.options = options;
        this.element = this._newHTML();
    }

    /**
     * Create a new overlay HTML element.
     *
     * @private
     * @return {object} New overlay element.
     */
    Overlay.prototype._newHTML = function() {

        var opt = this.options;

        var overlay = document.createElement('div');

        overlay.setAttribute('id', this.id);
        overlay.style.width = opt.width;
        overlay.style.height = opt.height;
        overlay.style.display = 'none';
        overlay.style.position = 'absolute';

        var background = document.createElement('div');

        background.style.width = opt.width;
        background.style.height = opt.height;
        background.style.position = 'absolute';
        background.style.opacity = opt.background.opacity;
        background.style.filter = 'alpha(opacity=' + opt.background.opacity + ')';
        background.style['background-color'] = opt.background.color;

        var foreground = document.createElement('div');

        foreground.setAttribute('id', '_' + opt.id);
        foreground.style.width = opt.width;
        foreground.style.height = opt.height;
        foreground.style.position = 'absolute';

        overlay.appendChild(background);
        overlay.appendChild(foreground);

        var r = newRequest();

        r.onreadystatechange = function() {
            if (r.readyState == 4 && (r.status == 200 || r.status == 304)) {
                foreground.innerHTML = r.responseText;
            }
        };

        try {
            r.open('GET', this.uri, true);
            r.send();
        } catch (error) {}

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
     * Create a new Lecture.
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
     * Create a new Video component.
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
     * Create a new Overlay component.
     *
     * An Overlay is an HTML that's shown over the video. An overlay can be
     * used to control the flow of the lecture, or simply show somthing to the
     * user in a static format.
     *
     * @param {string} id - Overlay id.
     * @param {string} source - Overlay source URI.
     * @param {object} [options] - Overlay configuration options.
     * @param {string} [options.margin=10px] -
     * @param {string} [options.background_color=white] -
     * @param {number} [options.background_opacity=1] -
     *
     * @return {Overlay} New overlay.
     */
    Lecture.prototype.addOverlay = function(id, source, options) {

        options = options || {};
        extend(options, this.options.overlay);
        extend(options, this.options, false);

        var overlay = new Overlay(id, source, options);

        this.overlays[id] = overlay;
        this.currentComponent = this.currentComponent || id;

        this.element.appendChild(overlay.element);

        return overlay;
    };

    /**
     * Get a video or a overlay object by id.
     *
     * @param {string} id - Component id.
     * @return {Video|Overlay} Lecture component.
     */
    Lecture.prototype.getComponent = function(id) {

        if (this.videos.hasOwnProperty(id)) {
            return this.videos[id];
        }

        if (this.overlays.hasOwnProperty(id)) {
            return this.overlays[id];
        }

        return undefined;
    };

    /**
     * Set the initial component for this lecture.
     *
     * @param {string} id - Component id.
     */
    Lecture.prototype.setInitialComponent = function(id) {

        this.getComponent(this.initial || id).hide();
        this.getComponent(id).show();
        this.initial = id;
    };

    return Lecture;

}(document));
