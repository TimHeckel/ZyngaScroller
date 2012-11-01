/*
* v. 0.0.2
* Created by Tim Heckel, &copy; 2012 
* Licensed under the MIT.
*/

(function ($) {
    var methods = {
        init: function (options) {

            options = options || {};
            options.bindable = options.bindable || {};
            options.bindable.click = options.bindable.click || "signalRampClick";
            options.bindable.hover = options.bindable.hover || "signalRampHover";
            options.bindable.mousedown = options.bindable.mousedown || "signalRampMouseDown";
            options.bindable.mouseup = options.bindable.mouseup || "signalRampMouseUp";
            options.callbacks = options.callbacks || {};
            options.sensibility = (options.sensibility + 1) || 100;
            options.stop = false;
            options.inc = 1000;
            options.proxyName = options.proxyName || utils.guid();
            options.clientId = utils.guid();

            options.classes = {
                cc: "." + options.bindable.click
                , ch: "." + options.bindable.hover
                , cd: "." + options.bindable.mousedown
                , cu: "." + options.bindable.mouseup
            };
            options.classes.custom = [options.classes.cc, ",", options.classes.ch, ",", options.classes.cd, ",", options.classes.cu].join('');

            return this.each(function () {
                var _self = $(this);
                if (!_self.data('signalRamp')) {

                    //ensure that the parent element has an id
                    if (this.nodeName.toLowerCase().replace("#", "") === "document") {
                        _self.attr("id", "document");
                    } else if (!_self.attr("id")) {
                        _self.attr("id", [options.proxyName, "_", options.inc].join(''));
                    }

                    _self.data({ signalRamp: { options: options} });
                    bindables.attach(_self);

                    //set up signalr proxy server at signalGRR
                    $(function () {
                        var connection = $.hubConnection(options.url || "http://signalgrr.apphb.com");
                        options.bridge = connection.createProxy(options.proxyName);

                        options.bridge.on('receive', function (pkg) {
                            //if (pkg.clientId !== options.clientId) //defaults to others, so this is not explicitly required
                            _self.signalRamp("receive", pkg);
                        });

                        var _start = function () {
                            connection.start().done(function () {
                                options.callbacks.bridgeStarted && options.callbacks.bridgeStarted(options.proxyName, options.bridge);
                            });
                        };

                        if (options.callbacks.bridgeInitialized) {
                            options.callbacks.bridgeInitialized.apply(this, [options.bridge, function () {
                                _start();
                            } ]);
                        } else {
                            _start();
                        }
                    });
                }
            });
        },
        receive: function (pkg) {

            //set stop so propagation stops in case .trigger requeues event
            var _options = utils.options($("#" + pkg.id).data("signalRamp"));

            _options.stop = true;

            switch (pkg.type) {
                case "checkbox":
                case "radio":
                    $("#" + pkg.id).attr("checked", pkg.checked);
                    break;
                case "click":
                    $("#" + pkg.id).trigger("click");
                    break;
                case "hoverOver":
                    $("#" + pkg.id).trigger("mouseover");
                    break;
                case "hoverOut":
                    $("#" + pkg.id).trigger("mouseout");
                    break;
                case "mousedown":
                    $("#" + pkg.id).trigger("mousedown");
                    break;
                case "mouseup":
                    $("#" + pkg.id).trigger("mouseup");
                    break;
                default:
                    $("#" + pkg.id).val(pkg.val);
                    break;
            }

            _options.callbacks.dataReceive && _options.callbacks.dataReceive(pkg);
        },
        rewire: function () {
            return this.each(function () {
                var _self = $(this);
                bindables.detatch(_self);
                bindables.attach(_self);
            });
        },
        destroy: function () {
            return this.each(function () {
                var _self = $(this);
                if (_self.data("signalRamp")) {
                    bindables.detatch(_self);
                    _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + options.classes.custom).removeData("signalRamp");
                    _self.removeData("signalRamp");
                }
            });
        },
        bridge: function () {
            return $(this).data("signalRamp").options.bridge;
        }
    };

    var bindables = {
        attach: function (_self) {

            var options = _self.data("signalRamp").options;
            var c = options.classes;

            //add ids to any missing bindable elements
            _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + c.custom).each(function () {
                if (!$(this).attr("id")) {
                    options.inc++;
                    $(this).attr("id", [options.proxyName, "_", options.inc].join(''));
                }
            });

            //second, wire up the listeners
            _self.find("input[type='checkbox'],input[type='radio'],select").bind('change', utils._chg);
            _self.find("input[type='text'],textarea").bind('keyup', utils._chg);

            _self.find(c.cc).bind('click', utils._click);
            _self.find(c.cd).bind('mousedown', utils._down);
            _self.find(c.cu).bind('mouseup', utils._up);
            _self.find(c.ch).bind('mouseover', utils._over);
            _self.find(c.ch).bind('mouseout', utils._out);

            _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + c.custom).data({ signalRamp: _self.attr("id") });
        }
        , detatch: function (_self) {
            if (_self.data("signalRamp")) {
                var options = _self.data("signalRamp").options;
                var c = options.classes;

                _self.find("input[type='checkbox'],input[type='radio'],select").unbind('mouseup', utils._chg);
                _self.find("input[type='text'],textarea").unbind('keyup', utils._chg);
                _self.find(c.cc).unbind('click', utils._click);
                _self.find(c.cd).unbind('mousedown', utils._down);
                _self.find(c.cu).unbind('mouseup', utils._up);
                _self.find(c.ch).unbind('mouseover', utils._over);
                _self.find(c.ch).unbind('mouseout', utils._out);

            }
        }
    };

    var utils = {
        _rs: null
        , guid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }).substring(0, 7);
        }
        , options: function (id) {
            if (id === "document") {
                return $(document).data("signalRamp").options;
            } else {
                return $("#" + id).data("signalRamp").options;
            }
        }
        , _chg: function (e) {
            var _self = $(this);
            var opts = utils.options(_self.data("signalRamp"));
            window.clearTimeout(utils._rx);
            utils._rx = window.setTimeout(function () { utils._run(_self); }, opts.sensibility);
        }
        , _click: function (e) {
            utils.run($(this), "click");
        }
        , _over: function (e) {
            utils.run($(this), "hoverOver");
        }
        , _out: function (e) {
            utils.run($(this), "hoverOut");
        }
        , _down: function (e) {
            utils.run($(this), "mousedown");
        }
        , _up: function (e) {
            utils.run($(this), "mouseup");
        }
        , _run: function (obj, _typeOverride) {
            var _id = obj.attr("id"), _type = _typeOverride || obj.attr("type")
                , _check = null, _val = '', _options = utils.options(obj.data("signalRamp"));
            switch (_type) {
                case "click":
                case "hoverOver":
                case "hoverOut":
                case "mousedown":
                case "mouseup":
                    //no data to be sent
                    _options.callbacks.uiEventChanged && _options.callbacks.uiEventChanged(_id, _type);
                    break;
                case "checkbox":
                case "radio":
                    _check = (obj.attr("checked") === "checked" ? true : false);
                    _options.callbacks.checkChanged && _options.callbacks.checkChanged(_id, _check);
                    break;
                default:
                    _val = obj.val();
                    _options.callbacks.valueChanged && _options.callbacks.valueChanged(_id, _val);
                    break;
            }

            if (!_options.stop) {
                var _pkg = { id: _id, type: _type, checked: _check, val: _val, clientId: _options.clientId };
                if (_options.callbacks.dataSend) {
                    _options.callbacks.dataSend.apply(this, [_pkg, function () {
                        _options.bridge.invoke('receive', _pkg);
                    } ]);
                } else {
                    _options.bridge.invoke('receive', _pkg);
                }
            } else {
                _options.stop = false;
            }
        }
    };

    $.fn.signalRamp = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.signalRamp');
        }
    };

})(jQuery);