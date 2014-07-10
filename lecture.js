var Lecture = (function(document) {

    'use strict';

    /**
     * Default values for all options.
     */
    var lectureOptions = {
        width: '500px',
        height: '300px',
        overlay: {
            background: {
                color: 'white',
                opacity: 1,
            },
        },
        video: {
            controls: true,
            autoplay: false,
            currentTime: 0,
            defaultPlaybackRate: 1,
            loop: false,
            muted: false,
            volume: 1,
        },
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
     * @param {boolean} [recursive=true] - Whether to make a deep extension.
     */
    function extend(target, source, recursive) {

        recursive = typeof recursive !== 'undefined' ? recursive : true;

        if (target.__extending__) {
            return;
        }
        target.__extending__ = true;

        for (var attr in source) {
            if (source.hasOwnProperty(attr)) {

                if (!target.hasOwnProperty(attr)) {
                    target[attr] = source[attr];
                    continue;
                }

                if (typeof source[attr] === 'object' &&
                    typeof target[attr] === 'object' &&
                    recursive)
                {
                    extend(target[attr], source[attr]);
                }
            }
        }

        delete target.__extending__;
    }

    /**
     * Create a new video.
     *
     * @constructor
     * @name Video
     * @param {string} id - Video element id.
     * @param {string} uri - Video URI.
     * @param {object} options - Video configuration options.
     */
    function Video(id, uri, options) {

        this.id = id;
        this.uri = uri;
        this.options = options;
        this.element = this._newHTML();
        this.overlays = [];
        this.currentTime = 0;

        this.element.addEventListener('timeupdate', this._timeUpdateListener.bind(this));
    }

    /**
     * Create a new video HTML element.
     *
     * @private
     * @memberof Video
     * @return {object} New video element.
     */
    Video.prototype._newHTML = function() {

        var video = document.createElement('video');

        video.setAttribute('id', this.id);
        video.style.display = 'none';
        video.style.position = 'fixed';

        var source = document.createElement('source');

        source.setAttribute('src', this.uri);
        source.setAttribute('type', 'video/mp4');

        var text = document.createTextNode('Your browser does not html5 video');

        video.appendChild(source);
        video.appendChild(text);

        var opts = this.options;

        for (var attr in opts) {
            if (opts.hasOwnProperty(attr) &&
                (typeof opts[attr] !== 'object') &&
                (typeof opts[attr] !== 'boolean' || opts[attr]))
            {
                video.setAttribute(attr, opts[attr]);
            }
        }

        return video;
    };

    /**
     * Listener for the timeUpdate event of the video HTML element.
     *
     * @private
     * @memberof Video
     */
    Video.prototype._timeUpdateListener = function() {

        function between(a, b, c) { return a < b && b <= c; }

        /* The [timeupdate] event thus is not to be fired faster than about
         * 66Hz or slower than 4Hz (assuming the event handlers don't take
         * longer than 250ms to run).
         */
        var MAX_UPDATE_PERIOD = 0.3;
        var time = this.element.currentTime;

        if (this.overlays.length &&
            between(0, time - this.currentTime, MAX_UPDATE_PERIOD))
        {
            var entry = this.overlays[this.indexOf(time)];

            if (between(this.currentTime, entry.time, time)) {

                this.element.pause();
                entry.overlay.show();
            }
        }

        this.currentTime = time;
    };

    /**
     * Get the index of the overlay at (or just before) a given time.
     *
     * @memberof Video
     * @param {number} time - Overlay time (in seconds).
     * @return {number} Index into the overlays array.
     */
    Video.prototype.indexOf = function(time) {

        var min = 0;
        var max = this.overlays.length;

        while (min + 1 < max) {

            var mid = Math.floor((max - min) / 2);

            if (this.overlays[mid].time > time) {
                max = mid;
            } else {
                min = mid;
            }
        }

        return min;
    };

    /**
     * Set an overlay componenti over the video at a speciffic time offset.
     *
     * @memberof Video
     * @param {number} time - Video time offset in seconds.
     * @param {string} overlay - Overlay component.
     */
    Video.prototype.addOverlay = function(time, overlay) {

        var index = this.indexOf(time);
        this.overlays.splice(index, 0, {time: time, overlay: overlay});
    };

    /**
     * Show video HTML element.
     *
     * @memberof Video
     */
    Video.prototype.show = function() {

        this.element.setAttribute('preload', 'auto');
        this.element.style.display = 'block';
    };

    /**
     * Hide video HTML element.
     *
     * @memberof Video
     */
    Video.prototype.hide = function() {

        this.element.setAttribute('preload', 'metadata');
        this.element.style.display = 'none';
    };

    /**
     * Create a new overlay.
     *
     * @constructor
     * @name Overlay
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
     * @memberof Overlay
     * @return {object} New overlay element.
     */
    Overlay.prototype._newHTML = function() {

        var opts = this.options;

        var overlay = document.createElement('div');

        overlay.setAttribute('id', this.id);
        overlay.style.width = opts.width;
        overlay.style.height = opts.height;
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';

        var background = document.createElement('div');

        background.style.width = opts.width;
        background.style.height = opts.height;
        background.style.position = 'fixed';
        background.style.opacity = opts.background.opacity;
        background.style.filter = 'alpha(opacity=' + opts.background.opacity + ')';
        background.style['background-color'] = opts.background.color;

        var foreground = document.createElement('div');

        foreground.setAttribute('id', '_' + opts.id);
        foreground.style.width = opts.width;
        foreground.style.height = opts.height;
        foreground.style.position = 'fixed';

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
     *
     * @memberof Overlay
     */
    Overlay.prototype.show = function() {

        this.element.style.display = 'block';
    };

    /**
     * Hide overlay HTML element.
     *
     * @memberof Overlay
     */
    Overlay.prototype.hide = function() {

        this.element.style.display = 'none';
    };

    /**
     * Create a new Lecture.
     *
     * @constructor
     * @name Lecture
     * @param {object} element - Base element on which to build the lecture.
     * @param {object} [options] - Lecture configuration options.
     */
    function Lecture(element, options) {

        this.initial  = undefined;
        this.videos   = {};
        this.overlays = {};
        this.element  = element;
        this.options  = options || {};

        extend(this.options, lectureOptions);
    }

    /**
     * Create a new video component.
     *
     * @memberof Lecture
     * @param {string} id - Video element id.
     * @param {string} uri - Video URI.
     * @param {object} [options] - Video configuration options.
     * @return {Video} New video.
     */
    Lecture.prototype.newVideo = function(id, uri, options) {

        options = options || {};
        extend(options, this.options.video);
        extend(options, this.options, false);

        var video = new Video(id, uri, options);

        this.initial = this.initial || id;
        this.videos[id] = video;
        this.element.appendChild(video.element);

        if (this.initial === id) {
            video.show();
        }

        return video;
    };

    /**
     * Create a new overlay component.
     *
     * @memberof Lecture
     * @param {string} id - Overlay element id.
     * @param {string} uri - Overlay URI.
     * @param {object} [options] - Overlay configuration options.
     * @return {Overlay} New overlay.
     */
    Lecture.prototype.newOverlay = function(id, uri, options) {

        options = options || {};
        extend(options, this.options.overlay);
        extend(options, this.options, false);

        var overlay = new Overlay(id, uri, options);

        this.initial = this.initial || id;
        this.overlays[id] = overlay;
        this.element.appendChild(overlay.element);

        if (this.initial === id) {
            overlay.show();
        }

        return overlay;
    };

    /**
     * Get a video or a overlay object by id.
     *
     * @memberof Lecture
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
     * @memberof Lecture
     * @param {string} id - Component id.
     */
    Lecture.prototype.setInitialComponent = function(id) {

        this.getComponent(this.initial || id).hide();
        this.getComponent(id).show();
        this.initial = id;
    };

    return Lecture;

}(document));
