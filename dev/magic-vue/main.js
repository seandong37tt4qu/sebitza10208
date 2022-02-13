require("./lib/magic.js");

$(function() {
    if (!window.$J) window.$J = undefined;

    var mvue, config = {tables: []}, _option = {}
        Router = require("./lib/route.js");
        
    window.$$ = mvue = {
        location   : null,       // 全局ROUTER对象

        __VUE__    : null,       // 全局VUE对象
        __VIEW__   : null,       // 全局MG-VIEW对象
        __PAGE__   : {
                        ROUTER : null,
                        PARAMS : {},
                        HANDLE : null,
                        CONTENT: null,
                        BEFORE : null,
                     },
        __CACHE__  : null,       // 全局页面缓存

        __LOAD__   : {
                        START  : 0,             // LOAD动画开始时间
                        BACK   : false,         // 是否为BACK模式
                        HANDLE : null,          // 定时器句柄
                        $DOM   : null,          // DOM对象
                        SHOW   : false,         // 是否正在显示LOAD动画
                        PAGEIN : false,         // 标记是否已经插入了页面
                     },         // 加载动画相关参数

        __STATE__  : null,       // 记录当前APP各种状态
    };


    /**
     * init option 参数说明
     * 
     * authBase     全局默认的权限值
     * authPage     不满足权限值的时候跳转验证的页面
     * authCall     用于验证的方法，可以不传
     * authCheck    用于判断是否校验的阀值
     * 
     */

    // APP初始化方法
    mvue.init = function(option, repath) {
        _option = option;   // 保存下初始化设置的选项

        $$.key("__MAGIC_RUNID", $.getRandom());

        var vue   = mvue.__VUE__  = new Vue({ el: "body" }),
            view  = mvue.__VIEW__ = $("body").query("mg-view"),
            $view = $(mvue.__VIEW__), PAGE = mvue.__PAGE__;
        
        mvue.__STATE__ = {
            AUTH_HASRUN  : false,       // 记录验证页面是否已调用
            AUTH_BEFORE  : "",          // 验证失败的页面，用于回跳

            ROUTER_TYPE  : false,       // 路由事件触发加载方式
            ROUTER_AFTER : false,       // 路由事件执行状态

            PAGE_READY   : false,       // 页面加载状态
        }

        var tables = $.extend.apply({}, config.tables);

        mvue.location = new Router(tables, $.extend({
            /* 页面跳转前的回调方法 */
            before : function(lastUrl, nowUrl, match, that) {
                var mnow  = match[match.length-1],
                    STAT  = mvue.__STATE__, aret,
                    LOAD  = mvue.__LOAD__,
                    opt   = that.options,
                    apage = opt.authPage,
                    atest = opt.authCheck;

                STAT.ROUTER_AFTER = false;
                STAT.ROUTER_TYPE  = that.evetype;

                // 初始化加载动画相关信息
                console.log("before: "+$.getTime());
                if (opt.loading !== false) {
                    makeLoading(that, match, nowUrl);
                }

                PAGE.PARAMS = mnow.para;
                PAGE.ROUTER = match;

                if (apage && nowUrl != apage) {
                    var auth;   // 检测页面的Auth值，可继承父类

                    for (var i=match.length-1; i>=0; i--) {
                        if (match[i].item.auth !== undefined) {
                            auth = match[i].item.auth;
                            break;  // 跳出后续的检测
                        }
                    }

                    if (auth === undefined) {
                        auth = opt.authBase || 1;
                    }

                    if ($.isFun(opt.authCall)) {
                        aret = opt.authCall(nowUrl, auth, atest, lastUrl, that);
                    } else {
                        aret = auth <= atest;
                    }

                    /* false 当前页面未通过验证 */
                    if (aret === false) {
                        STAT.AUTH_BEFORE = nowUrl;
                        return false;   // 阻止后续程序执行
                    }
                }
            },

            /* 页面跳转成功后的回调方法 */
            after : function(lastUrl, nowUrl, match, that) {
                mvue.__STATE__.ROUTER_AFTER = true;

                vue.$broadcast("routeChange", nowUrl);
            },

            always: function(lastUrl, nowUrl, match, that) {
                var STAT = mvue.__STATE__,
                    auth = that.options.authPage;

                if (!STAT.AUTH_HASRUN && STAT.AUTH_BEFORE) {
                    STAT.AUTH_HASRUN = true;

                    // !!! MgNative 下调用原生跳转
                    if ($J && $J.router) {
                        $J.loginRepath(STAT.AUTH_BEFORE);
                    } else {
                        that.go(auth, true);
                    }
                } else if (STAT.AUTH_HASRUN) {
                    STAT.AUTH_BEFORE = "";
                    STAT.AUTH_HASRUN = false;
                }
            },

            authBase  : 1,
            authCheck : 2,
        }, option || {})).init(repath);

        /* 返回到登陆页面的方法 */
        mvue.location.authRepath = function(set, togo) {
            var option   = mvue.location.options,
                location = mvue.location,
                STAT     = mvue.__STATE__;

            if (set !== undefined) {
                set = location.geturl(set);
                STAT.AUTH_BEFORE = set;

                if (togo === true) {
                    // !!! MgNative 下调用原生跳转
                    if ($J && $J.router) {
                        $J.loginRepath(STAT.AUTH_BEFORE);
                    } else {
                        location.go(option.authPage, true);
                    }
                    STAT.AUTH_HASRUN = true;
                }
            } else {
                STAT.AUTH_BEFORE = "";
                STAT.AUTH_HASRUN = false;
                
                location.go(option.home, true);
            }
        }

        // 重新修改原来的 back 和 go 方法
        var oback = mvue.location.back;
        mvue.location.back = function() {
            console.log("xiugai")
            clearLoading();
            mvue.__LOAD__.BACK = true;
            oback.call(mvue.location, arguments);
        }

        var onew  = mvue.location.go;
        mvue.location.go = function() {
            console.log("xiugai")
            clearLoading();
            onew.call(mvue.location, arguments);
        }
    }


    // APP路由初始化方法
    mvue.route = function(table) {
        config.tables.push(table)

        return this;
    }

    // 即时注册路由的方法，只能在 init 方法调用后执行
    mvue.when = function(url, option) {
        mvue.__ROUTER__.on(url, option);
    }


    // 转换 000 字符为 空 值
    function _transParams(params) {
        for (var key in params) {
            if (params[key] == "000") {
                params[key] = "";
            }
        }

        return params;
    }

    function _createLoadHtml(router, match, url) {
        var last = match[match.length-1].item, html;
            
        html = '<mg-page class="_load_">'

        // 判断是否创建 header 部分
        if (last.head != false && _option.loadHead != false) {
            html   += '<div class="bar bar-header">';

            // 判断是否需要创建 back 按钮
            var state = history.state || {},
                slast = router.last.state;
            if (last.back != false && 
               (slast && slast.id != state.id)) {
                html += '<mg-back></mg-back>';
            }

            html   += '<h3 class="title">{{title}}</h3></div>';
        }

        html +=     '<div class="content has-header"><div class="tip"></div></div>'+
                '</mg-page>';

        html = $.tpl(html, { title: last.title, url  : url||'' });

        return html;
    }

    // 创建临时的加载中页面效果
    function makeLoading(router, match) {
        var $view = $(mvue.__VIEW__), LOAD = mvue.__LOAD__;
        
        $view.append(_createLoadHtml(router, match));

        LOAD.START = $.getTime();
        LOAD.$DOM  = $view.find('._load_');
        if (LOAD.BACK === true) {
            LOAD.$DOM.addClass('pop-new');
        } else {
            LOAD.$DOM.addClass('push-new');
        }

        // 动画执行完设置 显示状态 为 False
        LOAD.$DOM.once("transitionend", function() {
            LOAD.SHOW = false;
        })

        LOAD.HANDLE = setTimeout(function() {
            if (!mvue.__STATE__.AUTH_BEFORE && !LOAD.PAGEIN) {
                LOAD.SHOW = true;
                LOAD.$DOM.addClass("enter");
            }
        }, 100);
    }

    // 清除加载中页面
    var clearLoading = (function() {
        function clear(LOAD, el) {
            clearTimeout(LOAD.HANDLE);
            LOAD.SHOW   = false;
            LOAD.HANDLE = null;
            LOAD.$DOM.remove();
            LOAD.BACK   = false;

            el && $(el).removeClass("hide");
        }

        return function(el, delay) {
            var LOAD = mvue.__LOAD__;

            if (delay) {
                setTimeout(function() {
                    clear(LOAD, el);
                }, delay);
            } else {
                clear(LOAD, el);
            }
        }
    })();

    // 绑定动画效果
    function bindAnimate(insert, old, call) {

    };

    // 检测当前是否运行在 PAGE 层级还是组件层级
    function _isRunPage(scope) {
        return scope.$parent.$options.name == "_loadPage";
    }

    // 创建一个 LOAD 完成处理函数
    function _createLoadFinish() {
        var defer = $.defer(), PAGE = mvue.__PAGE__;

        defer.then(function(handle) {
            var now = $.getTime(), LOAD = mvue.__LOAD__,
                $el = $(handle.$el), $before;

            if (PAGE.BEFORE && PAGE.BEFORE[0]) {
                $before = $(PAGE.BEFORE[0].$el);
            }

            LOAD.PAGEIN = true;     // 标记页面已经插入

            if (LOAD.SHOW != false) {
                console.log("transition is show")
                LOAD.$DOM.once("transitionend", function(e) {
                    console.log('trans end')
                    clearLoading($el, 80);
                })
            } else {
                console.log("can show page")
                clearLoading($el)

                if (LOAD.BACK === true) {

                } else {

                }
                $before.addClass("leave");

                $el.removeClass("hide").addClass("push-new")
                .once("transitionend", function() {
                    $el.removeClass("push-new enter");
                    $before.removeClass("leave").addClass("hide");
                })

                // 必须延时绑定 CLASS 否则无法触发动画
                setTimeout(function() {
                    $el.addClass("enter");
                });
            }
        })

        return defer;   // 返回创建好的承诺对象
    }

    // 根据传入的 PAGE 对象参数不同，创建不同的 READY 函数
    function _createReady(page) {
        var PAGE = mvue.__PAGE__, STAT = mvue.__STATE__,
            init = page.resolve;

        function _pageReady() {
            STAT.PAGE_READY = true;

            this.$broadcast("pageReady");
            this.$emit("pageReadyDirect");
        }

        if (typeof init == "function") {
            return function() {
               console.log("pready: "+$.getTime());
                var that = this, _params = $.extend({}, PAGE.PARAMS),
                    _defer  = $.defer(), loadDefer = _createLoadFinish();

                _params = _transParams(_params);    // 修正参数列表

                // 注册 数据更新事件，用于手动触发刷新动作
                that.$on("refreshData", function(params) {
                    init.call(that, params || _params, _defer);
                })

                // 注册 数据接受事件，用于手动初始化数据
                that.$on("reciveData", function(initData) {
                    if (typeof initData == "object") {
                        for(var key in initData) {
                            that.$set(key, initData[key]);
                        }
                    }
                });

                that.$emit("refreshData");  // 手动触发一下更新

                // 通过前面注册的事件，将数据更新到对象实例上
                _defer.then(function(initData) {
                    that.$emit("reciveData", initData);
                    loadDefer.resolve(that);
                });

                _pageReady.call(this);
            }
        } else {
            return function() {
               console.log("pready: "+$.getTime());
                _pageReady.call(this);

                _createLoadFinish().resolve(this);
            }
        }
    }

    function _commonPage(page) {
        var old = page.data, mixins;

        // 采用新的方式，组件的 data 必须为函数
        if (typeof old !== "function") {
            page.data = function() { return old; }
        }

        // 公用方法注册，利用 VUE 的 mixin 选项实现
        mixins = {
            ready: _createReady(page),

            beforeDestroy: function() {
                mvue.__STATE__.PAGE_READY = false;

                this.$broadcast("pageDestroy");
                this.$emit("pageDestroyDirect");
            },
        }

        // 添加基础的方法
        if (typeof page.mixins == "array") {
            page.mixins.push(mixins);
        } else {
            page.mixins = [mixins];
        }

        return page;    // 返回修改后的page对象
    }

    mvue.initView = function(resolve) {
        return function(page) {
            // 实例初始化页面组件对象
            resolve(_commonPage(page));
        }
    }

    mvue.loadView = function(name, initFix) {
        var cname = "ma-"+name;

        if (typeof initFix == "object") {
            initFix.replace = true;
            initFix.inherit = true;

            initFix = _commonPage(initFix);
        }

        mvue.component(cname, initFix);

        // 如果 initFix 值为一个 函数 ，说明为一个异步组件，用于Page层级
        return function() {
            var PAGE = mvue.__PAGE__, LOAD = mvue.__LOAD__,
                before = PAGE.BEFORE, handle = PAGE.HANDLE;

            if (LOAD.BACK === true &&
                (before && before[0] && before[0].$options.name == cname)) {

                PAGE.BEFORE = handle;
                PAGE.HANDLE = before;
            } else {
                var tmp = '<'+cname+' class="hide"></'+cname+'>',
                    $insert = new Vue({ template: tmp, name: "_loadPage" }).$mount();

                if (before && before[0]) {
                    before[0].$destroy(true);
                }

                PAGE.BEFORE = PAGE.HANDLE || null;
                PAGE.HANDLE = $insert.$children;
                
                $insert.$appendTo(mvue.__VIEW__);
            }
        }
    }

    mvue.component = function(ids, opt) {
        if (opt /* 参数默认值全局设置 */) {
            if (opt.replace === undefined) {
                opt.replace = false;
            }
            if (opt.inherit === undefined) {
                opt.inherit = true;
            }
        }

        return Vue.component(ids, opt);
    }

    /* 加载常用工具方法 */
    require("./util/main.js");

    /* 加载默认的核心样式文件和组件 */
    require("./component/main.js");
});