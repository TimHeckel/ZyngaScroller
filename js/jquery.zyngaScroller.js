/*
* jQuery.zyngaScroller, v. 0.0.1
* Created by Tim Heckel, 2012 
* Licensed under the MIT.
*/

(function ($) {
    var methods = {
        init: function (options) {
            options = options || {};
            options.cursorUrl = options.cursorUrl || "/images";                

            return this.each(function () {
                var _self = $(this);
                if (!_self.data('zyngaScroller')) {

                    //set up kinetic scrolling
                    options.es = new EasyScroller(this, {
                        scrollingX: options.scrollingX || true
                        , scrollingY: options.scrollingX || true
                        , enabled: true
                        , callbacks: {
                            onStart: function () {
                                send({ name: 'onStart', args: arguments });
                            }
                            , onMove: function () {
                                send({ name: 'onMove', args: arguments });
                            }
                            , onEnd: function () {
                                send({ name: 'onEnd', args: arguments });
                            }
                            , onZoom: function () {
                                send({ name: 'onZoom', args: arguments });
                            }
                        }
                    });

                    //set up cursor
                    var cursCoords = ($.browser.msie) ? "" : " 4 4";
                    var dragCursor = ($.browser.mozilla) ? "-moz-grab" : "url(" + options.cursorUrl + "/openhand.cur)" + cursCoords + ", move";
                    _self.css({ cursor: dragCursor });
                    _self.mousedown(function (e) {
                        dragCursor = ($.browser.mozilla) ? "-moz-grabbing" : "url(" + options.cursorUrl + "/closedhand.cur)" + cursCoords + ", move";
                        _self.css({ cursor: dragCursor });
                    });
                    _self.mouseup(function (e) {
                        dragCursor = ($.browser.mozilla) ? "-moz-grab" : "url(" + options.cursorUrl + "/openhand.cur)" + cursCoords + ", move";
                        _self.css({ cursor: dragCursor });
                    });

                    //set up collaboration

                    if (options.collab.on) {

                        options.proxyName = options.proxyName || _guid();
                        options.clientId = _guid();

                        $(this).signalRamp({
                            proxyName: options.proxyName
                            , url: options.collab.url
                            , callbacks: {
                                bridgeInitialized: function (bridge, done) {

                                    bridge.on('onStart', function (obj) {
                                        options.es.scroller.doTouchStart([{ pageX: obj.args[0], pageY: obj.args[1] }], obj.args[2]);
                                    });

                                    bridge.on('onEnd', function (obj) {
                                        mover(obj.args[0].moves, function () {
                                            options.es.scroller.doTouchEnd(obj.args[0].t);
                                        });
                                    });

                                    function mover(moves, cb) {
                                        var _max = _(moves).chain().pluck('t').max().value();
                                        var _min = _(moves).chain().pluck('t').min().value();

                                        var mvs = window.setInterval(function () {
                                            if (moves.length > 0) {
                                                var m = moves.shift();
                                                options.es.scroller.doTouchMove([{ pageX: m.x, pageY: m.y }], m.t);
                                            } else {
                                                window.clearInterval(mvs);
                                                cb && cb();
                                            }
                                        }, parseInt((_max - _min) / moves.length));
                                    };

                                    done();
                                }
                            }
                        });
                    }

                    function send(pkg) {
                        if (options.collab.on) {
                            $.extend(pkg, { id: options.clientId });
                            var bridge = _self.signalRamp("bridge");
                            bridge.invoke(pkg.name, pkg);
                        }
                    };

                    _self.data({ zyngaScroller: { options: options || {} } });
                }
            });
        },
        scroller: function () {
            return $(this).data("zyngaScroller").options.es.scroller;
        },
        destroy: function () {
            return this.each(function () {
                var _self = $(this);
                _self.removeData("zyngaScroller");
            })
        }
    };

    //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    function _guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }).substring(0, 7);
    };

    $.fn.zyngaScroller = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.zyngaScroller');
        }
    };

})(jQuery);