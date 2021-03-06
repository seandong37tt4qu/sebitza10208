module.exports = (function() {
    var Slider = function(el, options) {
        this.el         = $(el);
        this.handle     = null;
        this.pageWidth  = 0;
        this.pageHeight = 0;
        this.pageIndex  = -1;
        this.pageLength = 0;
        this.options    = $.extend({}, Slider.DEFAULT, options, true);
        this.timeHandle = null;
        this.__render   = null;
    }

    Slider.DEFAULT = {
        autoPlay: true,
        time: 4000,
        indicator: true,
        describe: false,
        scale: false,

        enter: null,            // 当前页进入时执行的方法
        leave: null,            // 当前页退出时候执行的方法
    }

    Slider.prototype.initPoint = function() {
        var point = this.el.query(".slider-points"),
            html = "", items, cnew = false, $add;

        if (point.length == 0) point = null;

        if (!point || !point.children.length) {
            if (!point /* 无 DOM 先创建外围容器 */) {
                html = '<div class="slider-points">';
                cnew = true;
                $add = this.el;
            } else {
                $add = $(point);
            }

            items = this.el.query(".slider-item");

            for(var i=0; i<items.length; i++) {
                if (i == 0) {
                    html += '<i class="item actived"></i>';
                } else {
                    html += '<i class="item"></i>';
                }
            }

            html += cnew ? "</div>" : "";
            $add.append(html);
        }
    }

    Slider.prototype.init = function() {
        var that = this, opt = that.options, childs, $first, scroll;

        if (!that.el.children(".slider_scroll").length) {
            that.el.wrapAll("<div class='slider_scroll'></div>");
        }

        scroll = that.el.children();
        childs = scroll.query(".slider-item");
        $first = $(childs[0] || childs);
 
        if (opt.indicator) {
            this.initPoint();   // 创建指示器
        }
        
        that.__render = $first.render(function() {
            that.pageWidth = $first.width();
            if (opt.scale) {
                scroll.height(that.pageWidth*opt.scale);
            }
            that.pageLength = childs.length;
            scroll.width(that.pageWidth*childs.length);
            for(var i=0; i<childs.length; i++) {
                var style = childs[i].style;
                style.width = that.pageWidth+"px";
            }
            scroll.addClass("hasInit");

            // 初始化组件滚动效果
            that.handle = that.el.scroll({
                scrollX: true,
                scrollY: false,
                momentum: false,
                snap: true,
                snapSpeed: 600,
                scrollbars: false
            });

            that.handle.on("scrollEnd", function() {
                // 只有暂停以后才会执行重置方法
                if (!that.timeHandle) {
                    var pagex = Math.abs(that.handle.x);

                    // 更新当前 slide 停止的页面索引
                    that.pageIndex = parseInt(pagex/that.pageWidth);

                    that.resume();      // 恢复播放
                }
            })

            that.handle.refresh();
            that.resume();      // 初始化播放
        })

        that.el.on("touchstart", function() {
            that.pause();       // 暂停播放
        })

        return this;
    };

    /* 返回指定页面的对象,无参时返回当前页,从0开始 */
    Slider.prototype.item = function(pagex) {
        if (pagex == "prev" /* 表示选择上一页 */) {
            pagex = this.pageIndex;
        } else if (pagex == "next") {
            pagex = this.pageIndex+2;
        } else {
            pagex = pagex == undefined ? this.pageIndex+1 : pagex;
        }

        pagex = pagex >= this.pageLength ? this.pageLength :
                pagex <= 0 ? 1 : this.pageIndex + 1;

        return this.el.find(".slider-item:nth-child("+pagex+")");
    };

    /* 运行指定的页面的对应回调方法 */
    Slider.prototype.exec = function(type, pagex) {
        if (["enter", "leave"].indexOf(type) != -1) {
            var call = this.options[type],
                item = this.item(pagex);

            // 尝试执行指定的回调
            typeof call == "function" && call(item);
        }

        return this;
    }

    /* 更新当前指示器 */
    Slider.prototype.updatePoint = function() {
        var pagex = this.pageIndex,
            index = pagex <= 0 ? 1 : pagex + 1,
            point = this.el.find(".slider-points");

        point.find(".item.actived").removeClass('actived');
        point.find(".item:nth-child("+index+")").addClass("actived");
    }

    /* 重新启动定时器，尝试切换到给定的页面 */
    Slider.prototype.resume = function(pagex) {
        if (this.pageWidth > 0) {
            var that = this, opt = that.options;

            clearInterval(that.timeHandle);
            if (opt.autoPlay && opt.time) {
                that.timeHandle = setInterval(function() {
                    that.next();            // 自动播放下一个
                }, opt.time)
            }

            if (pagex !== undefined) {
                that.go(pagex);             // 尝试切换到给定页面
            } else {
                that.updatePoint();         // 更新指示器状态
            }
        }

        return this;
    }

    /* 暂停页面播放，如果有参数，则定时恢复 */
    Slider.prototype.pause = function(time) {
        var that = this;

        clearInterval(that.timeHandle);
        that.timeHandle = null;
        if (time && !isNaN(time)) {
            setTimeout(function() {
                that.resume();
            }, time)
        }

        return this;
    };


    /* 跳到下一个页面 */
    Slider.prototype.next = function() {
        var pagex = this.pageIndex;

        if (!this.timeHandle) {
            this.resume(pagex+1);
        } else {
            this.go(pagex == -1 ? 1 : pagex + 1);
        }

        return this;
    };

    /* 返回上一个页面 */
    Slider.prototype.prev = function() {
        if (!this.timeHandle) {
            this.resume(this.pageIndex-1);
        } else {
            this.go(this.pageIndex-1);
        }

        return this;
    };

    /* 未指定到那个页面时，则为当前页面不动 */
    Slider.prototype.go = function(pagex) {
        // 只有内容真正载入的时候，才自动播放，以避免报错
        if (this.pageWidth > 0) {
            var len = this.pageLength - 1, isnow,
                old = this.pageIndex;

            pagex = pagex == undefined ? old : pagex;
            pagex = pagex < 0 ? len : (pagex > len ? 0 : pagex);
            isnow = pagex == old;

            // 上个页面离开回调，如果页面序列是-1，则不执行离开方法
            (!isnow && old != -1) && this.exec("leave");
            this.handle.goToPage(pagex, 0);     // 滚动到对应页面
            this.pageIndex = pagex;             // 更新当前索引
            !isnow && this.exec("enter");       // 当前页面进入回调

            this.updatePoint();                 // 更新指示器状态
        }

        return this;
    };

    Slider.prototype.destroy = function() {
        clearInterval(this.__render);
        clearInterval(this.timeHandle);
        this.options = null;
    }


    if ($ && $.fn && !$.fn.slider) {
        $.fn.extend({slider: function(option) {
            return new Slider(this[0], option).init();
        }})
    };
})();