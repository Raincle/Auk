// ==UserScript==
// @name         Yit Mark TransferredFromRobot
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Mark Sessions TransferredFromRobot
// @author       Hong
// @match        https://kefu.easemob.com/mo/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    !function (ob) {
        ob.hookAjax = function (funs) {
            window._ahrealxhr = window._ahrealxhr || XMLHttpRequest;
            XMLHttpRequest = function () {
                this.xhr = new window._ahrealxhr;
                for (var attr in this.xhr) {
                    var type = "";
                    try {
                        type = typeof this.xhr[attr];
                    } catch (e) {}
                    if (type === "function") {
                        this[attr] = hookfun(attr);
                    } else {
                        Object.defineProperty(this, attr, {
                            get: getFactory(attr),
                            set: setFactory(attr)
                        });
                    }
                }
            };

            function getFactory(attr) {
                return function () {
                    return this.hasOwnProperty(attr + "_")?this[attr + "_"]:this.xhr[attr];
                };
            }

            function setFactory(attr) {
                return function (f) {
                    var xhr = this.xhr;
                    var that = this;
                    if (attr.indexOf("on") !== 0) {
                        this[attr + "_"] = f;
                        return;
                    }
                    if (funs[attr]) {
                        xhr[attr] = function () {
                            funs[attr](that) || f.apply(xhr, arguments);
                        };
                    } else {
                        xhr[attr] = f;
                    }
                };
            }

            function hookfun(fun) {
                return function () {
                    var args = [].slice.call(arguments);
                    if (funs[fun] && funs[fun].call(this, args, this.xhr)) {
                        return;
                    }
                    return this.xhr[fun].apply(this.xhr, args);
                };
            }
            return window._ahrealxhr;
        };
        ob.unHookAjax = function () {
            if (window._ahrealxhr)  XMLHttpRequest = window._ahrealxhr;
            window._ahrealxhr = undefined;
        };
    }(window);
    
    
    hookAjax({
        //hook callbacks
        onreadystatechange:function(xhr){
            var url = xhr.responseURL;
            switch(xhr.readyState){
                case 1://OPENED
                    //do something
                    break;
                case 2://HEADERS_RECEIVED
                    //do something
                    break;
                case 3://LOADING
                    //do something
                    break;
                case 4://DONE
                    //do something
                    if (url.indexOf("Visitors?") > -1) {
                        var visitors = JSON.parse(xhr.response);

                        var updateCnt = 0;
                        var updateintervalid = setInterval(function() {
                          updateCnt += 1;
                          
                          var visitorDoms = $(".em-chat-itm-visitor");
                          if (visitorDoms.length > 0) {
                            $(".em-chat-itm-visitor").each(function(i) {
                                var isTansferredFromRobot = visitors[i].transferedFrom === 'Robot';
                                if (isTansferredFromRobot) {
                                  $(this)[0].style.backgroundColor = "red";
                                }
                            });
                          }
                          
                          if (updateCnt >= 3) {
                            clearInterval(updateintervalid);
                          }
                        }, 300);
                        
                    }
                    break;
            }
        }
    });
    
})();
