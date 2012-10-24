var EasyScroller = function (content, options) {

    this.content = content;
    this.container = content.parentNode;
    this.options = options || {};

    // create Scroller instance
    var that = this;
    this.scroller = new Scroller(function (left, top, zoom) {
        that.render(left, top, zoom);
    }, options);

    // bind events
    this.bindEvents();

    // the content element needs a correct transform origin for zooming
    this.content.style[EasyScroller.vendorPrefix + 'TransformOrigin'] = "left top";

    // reflow for the first time
    this.reflow();

};

EasyScroller.prototype.render = (function () {

    var docStyle = document.documentElement.style;

    var engine;
    if (window.opera && Object.prototype.toString.call(opera) === '[object Opera]') {
        engine = 'presto';
    } else if ('MozAppearance' in docStyle) {
        engine = 'gecko';
    } else if ('WebkitAppearance' in docStyle) {
        engine = 'webkit';
    } else if (typeof navigator.cpuClass === 'string') {
        engine = 'trident';
    }

    var vendorPrefix = EasyScroller.vendorPrefix = {
        trident: 'ms',
        gecko: 'Moz',
        webkit: 'Webkit',
        presto: 'O'
    }[engine];

    var helperElem = document.createElement("div");
    var undef;

    var perspectiveProperty = vendorPrefix + "Perspective";
    var transformProperty = vendorPrefix + "Transform";

    if (helperElem.style[perspectiveProperty] !== undef) {

        return function (left, top, zoom) {
            this.content.style[transformProperty] = 'translate3d(' + (-left) + 'px,' + (-top) + 'px,0) scale(' + zoom + ')';
        };

    } else if (helperElem.style[transformProperty] !== undef) {

        return function (left, top, zoom) {
            this.content.style[transformProperty] = 'translate(' + (-left) + 'px,' + (-top) + 'px) scale(' + zoom + ')';
        };

    } else {

        return function (left, top, zoom) {
            this.content.style.marginLeft = left ? (-left / zoom) + 'px' : '';
            this.content.style.marginTop = top ? (-top / zoom) + 'px' : '';
            this.content.style.zoom = zoom || '';
        };

    }
})();

EasyScroller.prototype.reflow = function () {

    // set the right scroller dimensions
    this.scroller.setDimensions(this.container.clientWidth, this.container.clientHeight, this.content.offsetWidth, this.content.offsetHeight);

    // refresh the position for zooming purposes
    var rect = this.container.getBoundingClientRect();
    this.scroller.setPosition(rect.left + this.container.clientLeft, rect.top + this.container.clientTop);
};

EasyScroller.prototype.bindEvents = function () {

    var that = this, __mm;

    // reflow handling
    if (window.addEventListener) {
        window.addEventListener("resize", function () {
            that.reflow();
        }, false);
    } else {
        window.attachEvent("resize", function () {
            that.reflow();
        });
    }

    function fixEvent(e) {
        var posx = 0;
        var posy = 0;
        if (!e) var e = window.event;
        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        }
        else if (e.clientX || e.clientY) {
            posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }
        e.pageX = posx;
        e.pageY = posy;
    };

    // touch devices bind touch events
    if ('ontouchstart' in window) {

        this.container.addEventListener("touchstart", function (e) {

            if (that.options.enabled) {
                // Don't react if initial down happens on a form element
                if (e.touches[0] && e.touches[0].target && e.touches[0].target.tagName.match(/input|textarea|select/i)) {
                    return;
                }
                that.scroller.doTouchStart(e.touches, e.timeStamp);
                that.options.callbacks.onStart && that.options.callbacks.onStart.apply(this, [e.touches, e.timeStamp]);
                e.preventDefault ? e.preventDefault() : e.returnValue = false;
            }

        }, false);

        document.addEventListener("touchmove", function (e) {
            if (that.options.enabled) {
                that.scroller.doTouchMove(e.touches, e.timeStamp, e.scale);

                clearTimeout(__mm);
                __mm = setTimeout(function () {
                    that.options.callbacks.onMove && that.options.callbacks.onMove.apply(this, [e.touches, e.timeStamp, e.scale]);
                }, 100);
            }
        }, false);

        document.addEventListener("touchend", function (e) {
            if (that.options.enabled) {
                that.scroller.doTouchEnd(e.timeStamp);
                that.options.callbacks.onEnd && that.options.callbacks.onEnd.apply(this, [e.timeStamp]);
            }
        }, false);

        document.addEventListener("touchcancel", function (e) {
            if (that.options.enabled) {
                that.scroller.doTouchEnd(e.timeStamp);
                that.options.callbacks.onEnd && that.options.callbacks.onEnd.apply(this, [e.timeStamp]);
            }
        }, false);

        // non-touch bind mouse events

    } else {

        var mousedown = false;

        var md = function (e) {
            if (that.options.enabled) {

                fixEvent(e);

                var root = e.target || e.srcElement;
                if (root.tagName.match(/input|textarea|select/i)) {
                    return;
                }
                var t = e.timeStamp || Date.now();
                that.scroller.doTouchStart([{
                    pageX: e.pageX,
                    pageY: e.pageY
                }], t);

                that.options.callbacks.onStart && that.options.callbacks.onStart.apply(this, [e.pageX, e.pageY, t]);

                that.options.mousemoves = [];

                mousedown = true;
                e.preventDefault ? e.preventDefault() : e.returnValue = false;
            }
        };

        if (this.container.addEventListener) {
            document.addEventListener("mousedown", md, false);
        } else {
            document.attachEvent("onmousedown", md);
        }

        var mm = function (e) {

            if (that.options.enabled) {
                if (!mousedown) {
                    return;
                }

                fixEvent(e);
                var t = e.timeStamp || Date.now();
                that.scroller.doTouchMove([{
                    pageX: e.pageX,
                    pageY: e.pageY
                }], t);

                that.options.mousemoves.push({ x: e.pageX, y: e.pageY, t: t });
                //clearTimeout(__mm);
                //__mm = setTimeout(function () {
                //    that.options.callbacks.onMove && that.options.callbacks.onMove.apply(this, [e.pageX, e.pageY, t]);
                //}, 100);

                mousedown = true;
            }
        };

        if (this.container.addEventListener) {
            document.addEventListener("mousemove", mm, false);
        } else {
            document.attachEvent("onmousemove", mm);
        }

        var mu = function (e) {
            if (that.options.enabled) {
                if (!mousedown) {
                    return;
                }
                fixEvent(e);

                var t = e.timeStamp || Date.now();
                that.scroller.doTouchEnd(t);

                that.options.callbacks.onEnd && that.options.callbacks.onEnd.apply(this, [{ moves: that.options.mousemoves, t: t}]);

                mousedown = false;
            }
        };

        if (this.container.addEventListener) {
            document.addEventListener("mouseup", mu, false);
        } else {
            document.attachEvent("onmouseup", mu);
        }

        var mw = function (e) {
            if (that.options.enabled) {
                if (that.options.zooming) {
                    fixEvent(e);
                    var t = e.timeStamp || Date.now();
                    that.scroller.doMouseZoom(e.wheelDelta, t, e.pageX, e.pageY);
                    that.options.callbacks.onZoom && that.options.callbacks.onZoom.apply(this, [e.wheelDelta, t, e.pageX, e.pageY]);
                    e.preventDefault ? e.preventDefault() : e.returnValue = false;
                }
            }
        };

        if (this.container.addEventListener) {
            this.container.addEventListener("mousewheel", mw, false);
        } else {
            this.container.attachEvent("onmousewheel", mw);
        }

    }
};