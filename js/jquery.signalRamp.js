/*
* signalRamp v. 0.0.1
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

            var cc = "." + options.bindable.click
                , ch = "." + options.bindable.hover
                , cd = "." + options.bindable.mousedown
                , cu = "." + options.bindable.mouseup
                , _custom = [cc, ",", ch, ",", cd, ",", cu].join('');

            return this.each(function () {
                var _self = $(this);
                if (!_self.data('signalRamp')) {

                    //first create ids on any elements that have none...
                    //a unique id is essential for ui syncing

                    var _inc = 1000;

                    //ensure that the parent element has an id
                    if (this.nodeName.toLowerCase().replace("#", "") === "document") {
                        _self.attr("id", "document");
                    } else if (!_self.attr("id")) {
                        _self.attr("id", [options.proxyName, "_", _inc].join(''));
                    }

                    //add ids to any missing bindable elements
                    _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + _custom).each(function () {
                        if (!$(this).attr("id")) {
                            _inc++;
                            $(this).attr("id", [options.proxyName, "_", _inc].join(''));
                        }
                    });

                    //second, wire up the listeners
                    _self.find("input[type='checkbox'],input[type='radio'],select").bind('change', locals._chg);
                    _self.find("input[type='text'],textarea").bind('keyup', locals._chg);

                    _self.find(cc).bind('click', locals._click);
                    _self.find(cd).bind('mousedown', locals._down);
                    _self.find(cu).bind('mouseup', locals._up);
                    _self.find(ch).bind('mouseover', locals._over);
                    _self.find(ch).bind('mouseout', locals._out);

                    _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + _custom).data({ signalRamp: _self.attr("id") });
                    options.proxyName = options.proxyName || locals.guid();
                    options.clientId = locals.guid();

                    //set up signalr proxy server at signalGRR
                    $(function () {
                        var connection = $.hubConnection(options.url || "http://signalgrr.apphb.com");
                        options.bridge = connection.createProxy(options.proxyName);

                        options.bridge.on('receive', function (pkg) {
                            if (pkg.clientId !== options.clientId)
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

                    _self.data({ signalRamp: { options: options || {}} });
                }
            });
        },
        receive: function (pkg) {

            //set stop so propogation stops in case .trigger requeues event
            var _options = null;

            if ($("#" + pkg.id).data("signalRamp") === "document") {
                _options = $(document).data("signalRamp").options;
            } else {
                _options = $("#" + $("#" + pkg.id).data("signalRamp")).data("signalRamp").options;
            }

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
        destroy: function () {
            return this.each(function () {
                var _self = $(this);
                if (_self.data("signalRamp")) {
                    _self.find("input[type='checkbox'],input[type='radio'],select").unbind('mouseup', locals._chg);
                    _self.find("input[type='text'],textarea").unbind('keyup', locals._chg);
                    _self.find(cc).unbind('click', locals._click);
                    _self.find(cd).unbind('mousedown', locals._down);
                    _self.find(cu).unbind('mouseup', locals._up);
                    _self.find(ch).unbind('mouseover', locals._over);
                    _self.find(ch).unbind('mouseout', locals._out);

                    _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + _custom).removeData("signalRamp");
                    _self.removeData("signalRamp");
                }
            })
        },
        bridge: function () {
            return $(this).data("signalRamp").options.bridge;
        }
    };

    var locals = {
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
                return $("#" + $("#" + id).data("signalRamp")).data("signalRamp").options;
            }
        }
        , _chg: function (e) {
            var _self = $(this);
            var opts = locals.options(_self.data("signalRamp"));
            window.clearTimeout(locals._rx);
            locals._rx = window.setTimeout(function () { locals._run(_self); }, opts.sensibility);
        }
        , _click: function (e) {
            locals.run($(this), "click");
        }
        , _over: function (e) {
            locals.run($(this), "hoverOver");
        }
        , _out: function (e) {
            locals.run($(this), "hoverOut");
        }
        , _down: function (e) {
            locals.run($(this), "mousedown");
        }
        , _up: function (e) {
            locals.run($(this), "mouseup");
        }
        , _run: function (obj, _typeOverride) {
            var _id = obj.attr("id"), _type = _typeOverride || obj.attr("type")
                , _check = null, _val = '', _options = locals.options(obj.data("signalRamp"));
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
    }

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