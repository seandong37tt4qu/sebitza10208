require("./style.scss");

module.exports = (function() {
    $$.component("mg-content", {
        template: "<div class='scroll_body'><content></content></div>",
        ready: function() {
            var $el = $(this.$el), $scroll, $parent, handle, refresh;   // 定义操作对象

            $scroll = $el.addClass("content").scroll(); // 初始化

            $parent = $el.parent();
            if ($parent.find("mg-header").length) {
                $el.addClass("has-header");
            }
            if ($parent.find("mg-footer").length || 
                $parent.find(".tabs-footer").length) {
                $el.addClass("has-footer");
            }

            handle = $el.attr("handle");
            if (handle && this[handle] !== undefined) {
                this[handle] = $scroll;
            }

            // 是否开启触屏后刷新，默认 开启 触屏刷新
            if ((refresh = $el.attr("refresh")) !== false) {
                var $body = $el.children(), last = 0;

                if (refresh === true) {
                    $el.on("touchstart", function() {
                        var height = $body.height();

                        if (height != last) {
                            $scroll.refresh();      // 强制刷新高度
                            last = height;          // 更新内容高度
                        }
                    })
                } else if (this[refresh] !== undefined) {
                    this.$watch(refresh, function(newVal) {
                        Vue.nextTick(function() {
                            $scroll.refresh();
                            $scroll.scrollTo(0, 0);
                        })
                    })
                }
            }
        }
    });

    $$.component("mg-scroll", {
        template: "<div><content></content></div>",
        ready: function() {
            var $el = $(this.$el), $scroll, handle, refresh, opt;   // 定义操作对象

            opt = $el.attr("scroll-x") ? {scrollX: true, scrollY: false} : {};
            $scroll = $el.addClass("mg-scroll").scroll(opt);

            handle = $el.attr("handle");
            if (handle && this[handle] !== undefined) {
                this[handle] = $scroll;
            }

            // 是否开启触屏后刷新，默认 开启 触屏刷新
            if ((refresh = $el.attr("refresh")) !== false) {
                var $body = $el.children(), last = 0;

                if (refresh === true) {
                    $el.on("touchstart", function() {
                        var height = $body.height();

                        if (height != last) {
                            $scroll.refresh();      // 强制刷新高度
                            last = height;          // 更新内容高度
                        }
                    })
                } else if (this[refresh] !== undefined) {
                    this.$watch(refresh, function() {
                        Vue.nextTick(function() {
                            $scroll.refresh();
                            $scroll.scrollTo(0, 0);
                        })
                    })
                }
            }
        }
    })
})();