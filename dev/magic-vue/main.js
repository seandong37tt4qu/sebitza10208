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
                        ROUTER : null,          // 当前页面的 路由匹配对象
                        PARAMS : {},            // 当前页面的 参数
                        CONTENT: null,          // 当前页面的 主体内容

                        HANDLE : null,          // 当前页面 句柄数组
                        BEFORE : null,          // 旧页面 句柄数组
                     },
        __CACHE__  : null,       // 全局页面缓存

        __NAVS__   : {
                        $el    : null,          // 导航栏对象
                        $dom   : null,          // 当前状态渲染的DOM
                        match  : [],            // 每个子项目的匹配信息
        },

        __LOAD__   : {
                        FIRST  : true,          // 第一次加载的时候动画特殊处理
                        START  : 0,             // LOAD动画开始时间
                        SHOW   : false,         // 是否正在显示LOAD动画
                        PUSH   : true,          // 是否为新建页面的方式
                        HANDLE : null,          // 定时器句柄
                        $DOM   : null,          // DOM对象
                     },                         // 加载动画相关参数

        __STATE__  : {
                        AUTH_HASRUN  : false,       // 记录验证页面是否已调用
                        AUTH_BEFORE  : "",          // 验证失败的页面，用于回跳

                        ROUTER_AFTER : false,       // 路由事件执行状态

                        PAGE_READY   : false,       // 页面加载状态
                     },

        compontent : {},            // 组件的配置选项
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
            $view = $(mvue.__VIEW__), PAGE = mvue.__PAGE__,
            LOAD  = mvue.__LOAD__, NAVS = mvue.__NAVS__;

        var tables = $.extend.apply({}, config.tables);

        // NAVS 全局导航组件初始化
        if (_option.navTabs && _option.navTabs.template) {
            var $navs = $(_option.navTabs.template), items;

            // 修复 $navs 对象，防止出错
            if ($navs[0] instanceof DocumentFragment) {
                $navs = $navs.children();
            }

            items = $navs[0].children;
            NAVS.$el = $navs;

            for(var i=0; i<items.length; i++) {
                var $now = $(items[i]);

                NAVS.match[i] = {
                    pos: i,
                    url: $now.attr("match") || ""
                };

                $now.removeAttr("match");
            }
        }

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

                // 初始化加载动画相关信息
                if (opt.loading !== false) {
                    if (LOAD.FIRST == true) {
                        LOAD.PUSH = true;
                        LOAD.FIRST = false;
                    } else {
                        LOAD.PUSH = that.evetype == "pushstate";
                    }
                    makeLoading(that, match, nowUrl);
                }

                PAGE.PARAMS = mnow.para;
                PAGE.ROUTER = match;

                navToggle(nowUrl, match);

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

    // 创建load动画的html代码
    function _createLoadHtml(router, match) {
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

        html = $.tpl(html, { title: last.title});

        return html;
    }

    // 创建临时的加载中页面效果
    function makeLoading(router, match) {
        var $view = $(mvue.__VIEW__), LOAD = mvue.__LOAD__, tsend;

        if ($.runtime == "weixin") {
            tsend = "webkitTransitionEnd";
        } else {
            tsend = "transitionend";
        }

        $view.append(_createLoadHtml(router, match));

        LOAD.START = $.getTime();
        LOAD.$DOM  = $view.find('._load_');

        if (LOAD.PUSH === true) {
            LOAD.$DOM.addClass('slideInRight');
        } else {
            LOAD.$DOM.addClass('slideOutLeft');
        }

        LOAD.$DOM.once(tsend, function() {
            LOAD.SHOW  = false;
        })
    }

    // 清除加载中页面
    var clearLoading = (function() {
        function clear(LOAD, el) {
            // 返回状态为初始状态，并清除创建的DOM
            clearTimeout(LOAD.HANDLE);
            LOAD.PUSH = true;
            LOAD.SHOW = false;
            LOAD.$DOM && LOAD.$DOM.remove();

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

    // 更新 NAVS 导航的状态
    function navToggle(nowUrl, match) {
        var NAVS = mvue.__NAVS__, items = NAVS.match,
            show = false, fix, $copy;

        fix = nowUrl.replace(/^[#|\\|\/]/, '');

        // 明确声明当前页面有自定义 foot 则不渲染
        if (match && !match[match.length-1].item.foot &&
            NAVS.$el && items.length) {

            $copy = NAVS.$el.clone();

            for(var i=0; i<items.length; i++) {
                var match = items[i].url,
                    pos = items[i].pos, $act;

                // 判断是普通的语句还是正则检测表达式
                if (match[0] == "/" && match[match.length-1] == "/") {
                    match = new RegExp(match+"i");
                } else if (match) {
                    match = new RegExp("^"+match);
                }

                if (match && match.test(fix)) {
                    $act = $($copy[0].children[pos]);

                    $copy.find("actived").removeClass("actived");
                    $act.addClass("actived"); break;
                }
            }
        }

        NAVS.$dom = $copy ? $copy : null;
    }

    // 绑定动画效果
    function backAnimate(now, old, call) {
        var $now = $(now), $old = $(old),
            LOAD = mvue.__LOAD__, nowCls, oldCls, tsend;

        if ($.runtime == "weixin") {
            tsend = "webkitTransitionEnd webkitAnimationEnd";
        } else {
            tsend = "transitionend animationend";
        }

        oldCls = "slideOutRight";
        nowCls = LOAD.PUSH ? "slideInRight" : "slideInLeft";

        $old.removeClass("hide").addClass(oldCls);
        $now.removeClass("hide").addClass(nowCls)
            .once(tsend, function() {
                $old.removeClass(oldCls).addClass("hide");
                $now.removeClass(nowCls).removeClass("hide");
            })
    };

    // 获取当前组件的 父 page 组件
    mvue.getVm = function(vm) {
        return vm.$parent;
    },

    // 获取当前组件的 根 page 组件
    mvue.getVmRoot = function(vm) {
        return vm.$root.$children[0];
    }

    // 检测当前是否运行在 PAGE 层级还是组件层级
    mvue._isRunPage = function(scope) {
        return scope.$parent.$options.name == "_loadPage";
    }

    // 创建一个 LOAD 完成处理函数
    function crateNewAnimate() {
        var defer = $.defer(), PAGE = mvue.__PAGE__;

        defer.then(function(scope) {
            var LOAD = mvue.__LOAD__, $now = $(scope.$el),
                $old, nowCls, oldCls, tsend;

            if ($.runtime == "weixin") {
                tsend = "webkitTransitionEnd webkitAnimationEnd";
            } else {
                tsend = "transitionend animationend";
            }

            // 只在PAGE模式下运行页面动画处理
            if (mvue._isRunPage(scope)) {
                if (PAGE.BEFORE && PAGE.BEFORE[0]) {
                    $old = $(PAGE.BEFORE[0].$el);
                }

                if (LOAD.SHOW /* 正在显示加载动画 */) {
                    LOAD.$DOM.once(tsend, function(e) {
                        clearLoading($now, 30);
                    });
                } else {
                    nowCls = LOAD.PUSH ? "slideInRight" : "slideInLeft";
                    oldCls = LOAD.PUSH ? "slideOutLeft" : "slideOutRight";
                    clearLoading($now);      // 清除 load 内容

                    if ($old) $old.addClass(oldCls);
                    $now.removeClass("hide").addClass(nowCls)
                    .once(tsend, function() {
                        $now.removeClass(nowCls);
                        $old && $old.removeClass(oldCls).addClass("hide");
                    })
                }
            } else {
                $now.removeClass("hide");
            }
        })

        return defer;   // 返回创建好的承诺对象
    }

    // 根据传入的 PAGE 对象参数不同，创建不同的 READY 函数
    function _createReady(page) {
        var PAGE = mvue.__PAGE__, STAT = mvue.__STATE__,
            init = page.resolve;

        function _pageReady(params) {
            STAT.PAGE_READY = true;

            this.$set('params', params || {});
            this.$dispatch("childPageReady");   // 向上冒泡事件
            this.$broadcast("pageReady");       // 向下传递事件
            this.$emit("pageReadyDirect");      // 触发自身事件

            if (mvue.__NAVS__.show /* 当前是否显示 footer */) {
                var $com = $(this.$el).children(".content");

                $com.addClass("has-footer");
            }
        }

        if (typeof init == "function") {
            return function() {
                var that = this, _params = $.extend({}, PAGE.PARAMS),
                    _defer  = $.defer(), loadDefer = crateNewAnimate();

                _params = _transParams(_params);    // 修正参数列表

                // 注册 数据更新事件，用于手动触发刷新动作
                that.$on("__refreshData", function(params) {
                    var initDefer = _defer;

                    // 创建后续的数据刷新回调动作
                    if (initDefer.status == "resolved") {
                        initDefer = $.defer();
                        initDefer.then(function(initData) {
                            that.$emit("__updateData", initData);
                        })
                    }

                    init.call(that, params || _params, initDefer);
                })

                // 注册 数据接受事件，用于手动初始化数据
                that.$on("__updateData", function(initData) {
                    if (typeof initData == "object") {
                        for(var key in initData) {
                            that.$set(key, initData[key]);
                        }
                    }
                });

                that.$emit("__refreshData");  // 手动触发一下更新

                // 通过前面注册的事件，将数据更新到对象实例上
                _defer.then(function(initData) {
                    that.$emit("__updateData", initData);
                    loadDefer.resolve(that);
                });

                _pageReady.call(this, _transParams(PAGE.PARAMS));

                // 绑定数据更新快捷方法
                that.$refresh = function(params) {
                    that.$emit("__refreshData", params);
                }
            }
        } else {
            return function() {
                _pageReady.call(this, _transParams(PAGE.PARAMS));

                crateNewAnimate().resolve(this);
            }
        }
    }


    function _commonPage(page) {
        var old = page.data, tmp = page.template,
            mixins, head, rhead = /^\<mg\-page[^\>]*\>/, style = page.style;

        // 尝试对页面添加私有的 class 名字
        if (style && style.page && tmp && (head = tmp.match(rhead)) ) {
            var mat, fix, rcls = /class\=[\'|"].*[\'|"]/;

            head = head[0]; style = style.page;
            mat  = head.match(rcls);

            if (mat) {
                mat = mat[0].replace(/[\'|\"]/, '"');
                fix = mat.replace(/\"$/, ' '+style+'"');

                head = head.replace(rcls, fix);
            } else {
                style = ' class="'+style+'">';
                head  = head.replace(/\>$/, style);
            };

            page.template = tmp.replace(rhead, head);
        }

        // 采用新的方式，组件的 data 必须为函数
        if (typeof old !== "function") {
            page.data = function() {
                return $.extend(true, {params: {}}, old);
            }
        }

        // 公用方法注册，利用 VUE 的 mixin 选项实现
        mixins = {
            compiled: function() {
                var $el  = $(this.$el),
                    $dom = mvue.__NAVS__.$dom;

                if ($dom) {
                    $el.append($dom)
                    .children("mg-content").addClass("has-footer");
                } 
            },

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

    // 渲染VIEW 对象成DOM元素
    mvue.__renderView = function(view, name) {
        var tmp = '<'+view+' class="hide"></'+view+'>';

        name = name ? name : "_loadPage";

        return new Vue({ template: tmp, name: name }).$mount();
    }

    // 生成系统用的 page 的组件名称
    mvue.__makeViewName = function(name, tag) {
        var ret = "ma-"+name;

        ret = ret.replace(/[\-|\\|\/]/g, "-");

        return tag ? "<"+ret+"></"+ret+">" : ret;
    }

    mvue.loadView = function(name, initFix) {
        var cname = mvue.__makeViewName(name);

        if (typeof initFix == "object") {
            initFix.replace = true;
            initFix.inherit = true;

            initFix = _commonPage(initFix);
        }

        mvue.component(cname, initFix);

        // 如果 initFix 值为一个 函数 ，说明为一个异步组件，用于Page层级
        return function() {
            var PAGE = mvue.__PAGE__, LOAD = mvue.__LOAD__,
                before = PAGE.BEFORE, handle = PAGE.HANDLE,
                old = before && before[0] ? before[0] : null, $insert;

            // 修正保存的当前页面句柄和旧页面句柄
            if (LOAD.PUSH === true) {
                $insert = mvue.__renderView(cname);

                if (old) old.$destroy(true);

                PAGE.BEFORE = PAGE.HANDLE || null;
                $insert.$appendTo(mvue.__VIEW__);
                PAGE.HANDLE = $insert.$children;
            } else {
                PAGE.BEFORE = handle; PAGE.HANDLE = before;

                if (old && old.$options.name == cname) {
                    backAnimate(PAGE.HANDLE[0].$el, PAGE.BEFORE[0].$el);
                    clearLoading();
                } else {
                    $insert = mvue.__renderView(cname);

                    if (old) old.$destroy(true);

                    $insert.$appendTo(mvue.__VIEW__);
                    PAGE.HANDLE = $insert.$children;
                }
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

    /**
     * 数据 Store 相关方法
     */
    mvue.store = function(name, option) {
        if (arguments.length == 1) {
            option = name;   // 只有一个参数时，修正顺序
            name   = undefined;
        }

        var obj = {}, store, type, item, actions;

        if (option.state) obj.state = option.state;
        if (option.mutations) obj.mutations = option.mutations;
        if (option.modules) obj.modules = option.modules;
        if (option.middlewares) obj.middlewares = option.middlewares;

        actions = option.actions;
        delete option.actions;
        store = new Vuex.Store(obj);

        for(var key in actions) {
            item = actions[key];
            type = typeof item;

            if (type == "function") {
                store[key] = item;
            } else if (type == "string") {
                store[key] = (function(mutation) {
                    return function(store) {
                        var dispatch = store.dispatch, args = [mutation];

                        for(var i=1; i<arguments.length; i++) {
                            args.push(arguments[i]);
                        }

                        return dispatch.apply(undefined, args);
                    }
                })(item);
            }
        }
        
        option.$snapshot = function() {
            return $.extend(true, {}, this.state);
        }

        option.$recover = function(snapshot) {
            this.$set('state', snapshot);
        }

        // 注册为全局的对象
        if (typeof name == "string") {
            mvue.store[name] = store;
        }

        return store;
    }

    mvue.filter = function(name, fun) {
        Vue.filter(name, fun);
        mvue.filter[name] = fun;

        return mvue.filter;
    };

    /* 加载常用工具方法 */
    require("./util/main.js");

    /* 加载默认的核心样式文件和组件 */
    require("./component/main.js");

    /* 加载默认核心的指令组件 */
    require("./directive/main.js");
});