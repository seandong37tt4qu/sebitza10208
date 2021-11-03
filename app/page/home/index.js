module.exports = {
    template: require("./template.html"),
    data: {
        modal: null
    },

    methods: {
        pullDown: function(finish) {
            console.log("pullDown has run!")
            setTimeout(function() {
                finish.done();
            }, 600)
        },

        pullUp: function(finish) {
            console.log("pullUp has run!")
            setTimeout(function() {
                finish.done();
            }, 600)
        },
    },

    events: {
        "hook:ready": function() {
            var $div = $("#lefter").lefter(1443628800);

        }
    }
}