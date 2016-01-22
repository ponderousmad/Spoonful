(function () {
    "use strict";
    
    function draw() {
    }
    
    function update() {
    }
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d");
    
        function drawFrame() {
            requestAnimationFrame(drawFrame);
            draw(context);
        }
        
        window.setInterval(update, 16);
        
        drawFrame();
    };
}());