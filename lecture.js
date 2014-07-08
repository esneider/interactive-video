var Lecture = (function(document) {

    'use strict';

    /**
     * Default values for all options.
     */
    var lectureOptions = {
        general: {
            width: '500px',
            height: '300px',
        },
        overlay: {
            background: {
                color: 'white',
                opacity: 1,
            },
        },
        video: {
            controls: true,
            autoplay: false,
            crossOrigin: false,
            currentTime: 0,
            defaultPlaybackRate: 1,
            loop: false,
            muted: false,
            volume: 1,
        },
    };

    /**
     * Extend an object's properties with another's.
     *
     * @param {object} target - Target object.
     * @param {object} source - Source object.
     */
    function extend(target, source) {

        if (target.__extending__)
            return;
        target.__extending__ = true;

        for (var attr in source) {
            if (!source.hasOwnProperty(attr)) {
                continue;
            }
            if (!target.hasOwnProperty(attr)) {
                target[attr] = source[attr];
                continue;
            }
            if (typeof source[attr] !== 'object') {
                continue;
            }
            if (typeof target[attr] !== 'object') {
                continue;
            }
            extend(target[attr], source[attr]);
        }

        delete target.__extending__;
    }

    /**
     * Create a new Lecture.
     *
     * @constructor
     * @name Lecture
     *
     * @param {object} element - Base element on which to build the lecture.
     * @param {object} options - Lecture configuration options.
     */
    function Lecture(element, options) {

        this.initial  = null;
        this.videos   = {};
        this.overlays = {};
        this.element  = element;
        this.options  = options || {};

        extend(this.options, lectureOptions);
    }

    /**
     * Add a new video fragment.
     * TODO: add support for multiple video sources/formats.
     *
     * @memberof Lecture
     *
     * @param {string} id - Video element id.
     * @param {string} uri - Video uri.
     * @param {object} options - Video configuration options.
     */
    Lecture.prototype.addVideo = function(id, uri, options) {

        options = options || {};
        extend(options, this.options.video);
        extend(options, this.options.general);

        var video = document.createElement('video');

        video.setAttribute('id', id);
        video.style.display = 'none';
        video.style.position = 'fixed';

        for (var attr in options) {
            if (options.hasOwnProperty(attr) && typeof options[attr] !== 'object') {
                video.setAttribute(attr, options[attr]);
            }
        }

        var source = document.createElement('source');

        source.setAttribute('src', uri);
        source.setAttribute('type', 'video/mp4');

        var text = document.createTextNode('Your browser does not html5 video');

        video.appendChild(source);
        video.appendChild(text);

        this.element.appendChild(video);
        this.videos[id] = options;

        if (this.initial === null || this.initial === id)
            this.setInitialVideo(id);
    };

    /**
     * Set the initial video for this lecture.
     *
     * @memberof Lecture
     *
     * @param {string} id - Id of the initial video.
     */
    Lecture.prototype.setInitialVideo = function(id) {

        var video;

        if (this.initial) {
            video = document.getElementById(this.initial);
            if (video) {
                video.setAttribute('preload', 'metadata');
                video.style.display = 'none';
            }
        }

        this.initial = id;

        video = document.getElementById(this.initial);
        if (video) {
            video.setAttribute('preload', 'auto');
            video.style.display = 'block';
        }
    };

    /**
     * Create a new XMLHttpRequest.
     */
    function newHttpRequest() {
        try {return new XMLHttpRequest();}
        catch (error) {}
        try {return new ActiveXObject("Msxml2.XMLHTTP");}
        catch (error) {}
        try {return new ActiveXObject("Microsoft.XMLHTTP");}
        catch (error) {}

        throw new Error("Could not create HTTP request object.");
    }

    /**
     * Add a new overlay.
     *
     * @memberof Lecture
     *
     * @param {string} id - Overlay element id.
     * @param {string} uri - Overlay uri.
     * @param {object} options - Overlay configuration options.
     */
    Lecture.prototype.addOverlay = function(id, uri, options) {

        options = options || {};
        extend(options, this.options.overlay);
        extend(options, this.options.general);

        var overlay = document.createElement('div');

        overlay.setAttribute('id', id);
        overlay.setAttribute('width', options.width);
        overlay.setAttribute('height', options.height);
        overlay.style.display = 'none';
        overlay.style.position = 'fixed';

        var background = document.createElement('div');

        background.setAttribute('width', options.width);
        background.setAttribute('height', options.height);
        background.style.position = 'fixed';
        background.style.opacity = options.background.opacity;
        background.style.filter = 'alpha(opacity=' + options.background.opacity + ')';
        background.style['background-color'] = options.background.color;

        var foreground = document.createElement('div');

        foreground.setAttribute('width', options.width);
        foreground.setAttribute('height', options.height);
        foreground.style.position = 'fixed';

        overlay.appendChild(background);
        overlay.appendChild(foreground);

        this.element.appendChild(overlay);
        this.overlays[id] = options;

        var request = newHttpRequest();
        request.open("GET", uri, true);
        request.send();
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200 || request.status == 304) {
                    foreground.innerHTML = request.responseText;
                }
            }
        };
    };

    return Lecture;

}(document));
