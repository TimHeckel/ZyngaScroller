/*
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

                    _self.find("input[type='checkbox'],input[type='radio'],select").bind('change', _chg);
                    _self.find("input[type='text'],textarea").bind('keyup', _chg);

                    _self.find(cc).bind('click', _click);
                    _self.find(cd).bind('mousedown', _down);
                    _self.find(cu).bind('mouseup', _up);
                    _self.find(ch).bind('mouseover', _over);
                    _self.find(ch).bind('mouseout', _out);

                    _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + _custom).data({ signalRamp: _self.attr("id") });
                    options.proxyName = options.proxyName || _guid();
                    options.clientId = _guid();

                    //set up signalr proxy server at signalGRR
                    $(function () {
                        var connection = $.hubConnection(options.url || "http://signalgrr.apphb.com");
                        options.bridge = connection.createProxy(options.proxyName);

                        options.bridge.on('receive', function (pkg) {
                            if (pkg.originator !== options.clientId)
                                _self.signalRamp("receive", pkg);
                        });

                        var _start = function() {
                            connection.start().done(function () {
                                options.callbacks.bridgeStarted && options.callbacks.bridgeStarted(options.proxyName, options.bridge);
                            });
                        };

                        if (options.callbacks.bridgeInitialized) {
                            options.callbacks.bridgeInitialized.apply(this, [options.bridge, function() {
                                _start();
                            }]);
                        } else {
                            _start();
                        }
                    });

                    _self.data({ signalRamp: { options: options || {} } });
                }
            });
        },
        receive: function (pkg) {

            //set stop so propogation stops in case .trigger requeues event
            var _options = $("#" + $("#" + pkg.id).data("signalRamp")).data("signalRamp").options;
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
        },
        destroy: function () {
            return this.each(function () {
                var _self = $(this);
                if (_self.data("signalRamp")) {
                    _self.find("input[type='checkbox'],input[type='radio'],select").unbind('mouseup', _chg);
                    _self.find("input[type='text'],textarea").unbind('keyup', _chg);
                    _self.find(cc).unbind('click', _click);
                    _self.find(cd).unbind('mousedown', _down);
                    _self.find(cu).unbind('mouseup', _up);
                    _self.find(ch).unbind('mouseover', _over);
                    _self.find(ch).unbind('mouseout', _out);


                    _self.find("input[type='checkbox'],input[type='radio'],select,input[type='text'],textarea," + _custom).removeData("signalRamp");
                    _self.removeData("signalRamp");
                }
            })
        },
        bridge: function () {
            return $(this).data("signalRamp").options.bridge;
        }
    };

    //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    function _guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }).substring(0, 7);
    };

    var _rx;
    function _chg(e) {
        var _self = $(this);
        var opts = $("#" + _self.data("signalRamp")).data("signalRamp").options;
        window.clearTimeout(_rx);
        _rx = window.setTimeout(function () { _run(_self); }, opts.sensibility);
    };

    function _click(e) {
        _run($(this), "click");
    };

    function _over(e) {
        _run($(this), "hoverOver");
    };

    function _out(e) {
        _run($(this), "hoverOut");
    };

    function _down(e) {
        _run($(this), "mousedown");
    };

    function _up(e) {
        _run($(this), "mouseup");
    };

    function _run(obj, _typeOverride) {
        var _id = obj.attr("id"), _type = _typeOverride || obj.attr("type"), _check = null, _val = '';
        var _options = $("#" + obj.data("signalRamp")).data("signalRamp").options;
        switch (_type) {
            case "click":
            case "hoverOver":
            case "hoverOut":
            case "mousedown":
            case "mouseup":
                //no data to be sent
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

        if (!_options.stop)
            _options.bridge.invoke('receive', { id: _id, type: _type, checked: _check, val: _val, originator: _options.clientId });
        else
            _options.stop = false;
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