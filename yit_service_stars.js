// ==UserScript==
// @name         Yit Stars
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Stars In Yit Service.
// @author       Hong
// @match        https://kefu.easemob.com/mo/*
// @grant        none
// ==/UserScript==

/*数据结构

var YitUsers = [
{id:"123", isMarked: true},
{id:"456", isMarked: false},
{id:"789", isMarked: true},
{id:"000", isMarked: false}
]

数据结构*/

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

    var visitorsID = [];
    var historyVisitorsID = [];
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
                        var vIds = [];
                        for (var i = 0; i < visitors.length; i++) {
                            vIds.push(visitors[i].user.userId);
                        }
                        visitorsID = vIds;
                        
                        var updateCnt = 0;
                        var updateintervalid = setInterval(function() {
                          updateCnt += 1;
                          
                          var visitorDoms = $(".em-chat-itm-visitor");
                          if (visitorDoms.length > 0) {
                            $(".em-chat-itm-visitor").each(function(i) {
                                var isTansferredFromRobot = visitors[i].transferedFrom === 'Robot';
                                if (isTansferredFromRobot) {
                                  $(this)[0].style.backgroundColor = "yellow";
                                }
                            });
                          }
                          
                          dispatchData();
                          reinstallMarker();
                          if (updateCnt >= 3) {
                            clearInterval(updateintervalid);
                          }
                        }, 300);
                        
                        
                    }
                    if (url.indexOf("ServiceSessionHistorys?") > -1) {
                        var historys = JSON.parse(xhr.response).items;
                        var hIds = [];
                        for (var j = 0; j < historys.length; j++) {
                            hIds.push(historys[j].visitorUser.userId);
                        }
                        historyVisitorsID = hIds;
                    }
                    break;
            }
        }
    });

    // ======================================初始化
    var isInstalled = localStorage.isInstalled;
    var sessionCnt = 0;
    var historyCnt = 0;

    /*$.get("https://kefu.easemob.com/v1/Agents/me/Visitors?_=1510046734969", function(res) {
        console.log(res);
    });*/

    // 收集数据;
    function gatherData() {
        var YitUsers = [];
        $(".em-chat-itm-visitor").each(function() {
            var user = {
                id: $(this).attr("id"),
                isMarked: false
            };
            YitUsers.push(user);
        });
        localStorage.YitUsers = JSON.stringify(YitUsers);
        console.log("收集数据完毕，开始安装控件...");
    }

    function dispatchData() {
        $(".em-chat-itm-visitor").each(function(i) {
            $(this).attr("id", visitorsID[i]);
        });
        $(".ui-itm-table-history").each(function(i) {
            $(this).attr("id", historyVisitorsID[i]);
        });
    }

    // 轮询页面是否加载完毕;
    var loadingIntervalID = setInterval(function(){
        var visitorDom = $(".em-chat-itm-visitor");
        var historyDom = $(".ui-itm-table-history");
        if (visitorDom.length > 0 || historyDom > 0) {
            clearInterval(loadingIntervalID);
            dispatchData();
            startMarker();

            // 监控是否有新会话接入;
            sessionCnt = visitorDom.length;
            historyCnt = historyDom.length;
            setInterval(function(){
                var newSessionCnt = $(".em-chat-itm-visitor").length;
                var newHistoryCnt = $(".ui-itm-table-history").length;
                if (sessionCnt !== newSessionCnt || historyCnt !== newHistoryCnt) {
                    console.log("数据发生变化，重载中...");
                    sessionCnt = newSessionCnt;
                    historyCnt = newHistoryCnt;
                    var url = "https://kefu.easemob.com/v1/Agents/me/Visitors?_=";
                    var timeStr = Date.parse(new Date()).toString();
                    url = url + timeStr;
                    $.get(url, function() {
                      dispatchData();
                      reinstallMarker();
                    });
                    
                }
            }, 1000);

            // 点击面板重新安装
            $("[sign='webapp/chat'], [sign='webapp/myhistory'], .backgrid-paginator").click(function() {
                // 监听是否加载完毕;
                var historyLoadingInterval = setInterval(function(){
                    var isLoadingEnd = $(".article-agent .ui-cmp-loading")[0].style.display == "none" ? true : false;
                    if (isLoadingEnd) {
                        console.log("历史记录加载完毕！");
                        clearInterval(historyLoadingInterval);
                        dispatchData();
                        reinstallMarker();
                    }
                }, 300);
            });

        }
    }, 1000);

    // 运行脚本;
    function startMarker() {
        if (isInstalled) {
            console.log("开始读取历史数据...");
            installMarker();
        } else {
            console.log("初次安装控件，开始收集数据...");
            gatherData();
            installMarker();
        }
    }

    // 安装控件;
    var markedHTML = "<div class='yit-marked' style='position:absolute;top:4px;left:4px;width:12px;height:12px;'>"+
        "<svg style='display:block;fill:red;' width='12px' height='12px' viewBox='0 0 1024 1024'><path d='M1024 402.148612c0-15.180828-11.484233-24.615229-34.469943-28.311824L680.617553 328.921539 542.157967 48.915763c-7.789793-16.821125-17.849274-25.227377-30.154733-25.227377-12.303304 0-22.356318 8.406252-30.152578 25.227377L343.384602 328.921539 34.45701 373.836788C11.488544 377.533383 0 386.967784 0 402.148612c0 8.619641 5.129969 18.465733 15.387751 29.542586l224.002896 217.846934L186.467905 957.226341c-0.821226 5.746427-1.228606 9.86118-1.228606 12.311925 0 8.61533 2.151138 15.894282 6.457726 21.847632 4.304432 5.961972 10.762158 8.92787 19.381799 8.92787 7.38888 0 15.590364-2.450746 24.615229-7.378102l276.302714-145.247096 276.322113 145.247096c8.630418 4.927357 16.834058 7.378102 24.606607 7.378102 8.23166 0 14.473841-2.965898 18.780428-8.92787 4.293655-5.944729 6.446948-13.232302 6.446948-21.847632 0-5.326115-0.206923-9.427935-0.618614-12.311925l-52.927054-307.688209 223.384282-217.846934C1018.673885 421.02388 1024 411.173478 1024 402.148612z' /></svg>" +
        "</div>";
    var unMarkedHTML = "<div class='yit-mark-btn' style='position:absolute;top:4px;left:4px;width:12px;height:12px;opacity:0'>"+
        "<svg style='display:block;fill:lightgray;' width='12px' height='12px' viewBox='0 0 1024 1024'><path d='M1024 402.148612c0-15.180828-11.484233-24.615229-34.469943-28.311824L680.617553 328.921539 542.157967 48.915763c-7.789793-16.821125-17.849274-25.227377-30.154733-25.227377-12.303304 0-22.356318 8.406252-30.152578 25.227377L343.384602 328.921539 34.45701 373.836788C11.488544 377.533383 0 386.967784 0 402.148612c0 8.619641 5.129969 18.465733 15.387751 29.542586l224.002896 217.846934L186.467905 957.226341c-0.821226 5.746427-1.228606 9.86118-1.228606 12.311925 0 8.61533 2.151138 15.894282 6.457726 21.847632 4.304432 5.961972 10.762158 8.92787 19.381799 8.92787 7.38888 0 15.590364-2.450746 24.615229-7.378102l276.302714-145.247096 276.322113 145.247096c8.630418 4.927357 16.834058 7.378102 24.606607 7.378102 8.23166 0 14.473841-2.965898 18.780428-8.92787 4.293655-5.944729 6.446948-13.232302 6.446948-21.847632 0-5.326115-0.206923-9.427935-0.618614-12.311925l-52.927054-307.688209 223.384282-217.846934C1018.673885 421.02388 1024 411.173478 1024 402.148612z' /></svg>" +
        "</div>";
    function installMarker() {
        var YitUsers = JSON.parse(localStorage.YitUsers);
        $(".em-chat-itm-visitor").each(function() {
            var id = $(this).attr("id");
            var isMarked = false;
            // 获取标记信息;
            for (var i = 0; i < YitUsers.length; i++) {
                if (id == YitUsers[i].id) {
                    isMarked = YitUsers[i].isMarked;
                }
            }
            if (isMarked) {
                $(this).append(markedHTML);
            } else {
                $(this).append(unMarkedHTML);
            }
        });
        $(".ui-itm-table-history").each(function() {
            var id = $(this).attr("id");
            var isMarked = false;
            // 获取标记信息;
            for (var i = 0; i < YitUsers.length; i++) {
                if (id == YitUsers[i].id) {
                    isMarked = YitUsers[i].isMarked;
                }
            }
            if (isMarked) {
                $(this).append(markedHTML);
            } else {
                $(this).append(unMarkedHTML);
            }
        });
        interaction();
        localStorage.isInstalled = true;
        console.log("控件安装成功！");
    }

    // ======================================数据更新

    // 界面交互;
    function interaction() {
        // hover;
        $(".em-chat-itm-visitor").off().hover(function(){
            var id = $(this).attr("id");
            $(this).find(".yit-mark-btn").animate({opacity: 1}, 100).click(function() {
                $(this).parent(".em-chat-itm-visitor").append(markedHTML);
                $(this).remove();
                dataUpdate(id, true);
                console.log("标记成功！");
            });
            $(this).find(".yit-marked").animate({opacity: 1}, 100).click(function() {
                $(this).parent(".em-chat-itm-visitor").append(unMarkedHTML);
                $(this).remove();
                dataUpdate(id, false);
                console.log("取消标记！");
            });
        },function(){
            $(this).find(".yit-mark-btn").animate({opacity: 0}, 100).off();
        });

        $(".ui-itm-table-history").off().hover(function(){
            var id = $(this).attr("id");
            $(this).find(".yit-mark-btn").animate({opacity: 1}, 100).click(function() {
                $(".ui-itm-table-history").each(function() {
                    if (id == $(this).attr("id")) {
                        $(this).append(markedHTML);
                        $(this).find(".yit-mark-btn").remove();
                    }
                });
                dataUpdate(id, true);
                console.log("标记成功！");
            });
            $(this).find(".yit-marked").animate({opacity: 1}, 100).click(function() {
                $(".ui-itm-table-history").each(function() {
                    if (id == $(this).attr("id")) {
                        $(this).append(unMarkedHTML);
                        $(this).find(".yit-marked").remove();
                    }
                });
                dataUpdate(id, false);
                console.log("取消标记！");
            });
        },function(){
            $(this).find(".yit-mark-btn").animate({opacity: 0}, 100).off();
        });

    }

    // 数据交互;
    function checkin(id, currentYitUsers) {
        var isIn = false;
        for (var i = 0; i < currentYitUsers.length; i++) {
            if (id == currentYitUsers[i].id) {
                isIn = true;
            }
        }
        return isIn;
    }

    function dataUpdate(id, isMarked) {
        var YitUsers = JSON.parse(localStorage.YitUsers);
        if (checkin(id, YitUsers)) {
            for (var i = 0; i < YitUsers.length; i++) {
                if (id == YitUsers[i].id) {
                    YitUsers[i].isMarked = isMarked;
                }
            }
        } else {
            var user = {id: id, isMarked: isMarked};
            YitUsers.push(user);
        }

        localStorage.YitUsers = JSON.stringify(YitUsers);
    }

    // ======================================监控新会话
    function reinstallMarker() {
        var YitUsers = JSON.parse(localStorage.YitUsers);

        $(".em-chat-itm-visitor").each(function() {
            var id = $(this).attr("id");

            if (!checkin(id, YitUsers)) {
                var user = {
                    id: id,
                    isMarked: false
                };
                YitUsers.push(user);
            }
        });
        $(".ui-itm-table-history").each(function() {
            var id = $(this).attr("id");
            if (!checkin(id, YitUsers)) {
                var user = {
                    id: id,
                    isMarked: false
                };
                YitUsers.push(user);
            }
        });
        localStorage.YitUsers = JSON.stringify(YitUsers);
        console.log("重新收集数据完毕，开始安装控件...");
        $(".em-chat-itm-visitor").find(".yit-mark-btn").remove();
        $(".ui-itm-table-history").find(".yit-mark-btn").remove();
        $(".em-chat-itm-visitor").find(".yit-marked").remove();
        $(".ui-itm-table-history").find(".yit-marked").remove();
        installMarker();
    }


})();
