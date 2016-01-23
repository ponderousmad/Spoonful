(function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        getTimestamp = null,
        lastTime = 0,
        titleImage = loader.load("title.png"),
        backgroundTiles = [
            loader.load("backgroundStripe.png")
        ],
        platformImages = [
        ],
        playedSpoons = false,
        spoonInstrument = new SoundEffect("audio/clicky.wav");
        
    
    // One time initialization code
    (function() {
        loader.commit();
       
        if (window.performance.now) {
            console.log("Using high performance timer");
            getTimestamp = function () { return window.performance.now(); };
        } else {
            if (window.performance.webkitNow) {
                console.log("Using webkit high performance timer");
                getTimestamp = function () { return window.performance.webkitNow(); };
            } else {
                console.log("Using low performance timer");
                getTimestamp = function () { return new Date().getTime(); };
            }
        }
        lastTime = getTimestamp();
    })();
        
    function drawTiled(context, tile, width, height) {
        var tileX = 0,
            tileY = 0,
            spanX = tile.width,
            spanY = tile.height;
        
        while (tileY < height) {
            if (tileY + spanY > width) {
                spanY = height - tileY;
            }
            while (tileX < width) {
                if (tileX + spanY > width) {
                    spanX = width - tileX;
                }
                context.drawImage(tile, 0, 0, spanX, spanY, tileX, tileY, spanX, spanY);
                tileX += tile.width;
            }
            spanX = tile.width;
            tileY += tile.height;
            tileX = 0;
        }
    }
    
    function drawCentered(context, image, x, y, width, height) {
        var spareX = (width - image.width) * 0.5,
            spareY = (height - image.height) * 0.5;
        context.drawImage(image, x + spareX, y + spareY);
    }
    
    function draw(context, width, height) {
        if (!loader.loaded) {
            return;
        }
        var tile = backgroundTiles[0];
        drawTiled(context, tile, width, height);
        drawCentered(context, titleImage, 0, 0, width, height);
    }
    
    function update() {
        var now = getTimestamp(),
            elapsed = Math.min(now - lastTime, 32);
            
        if (!playedSpoons && spoonInstrument.isLoaded()) {
            playedSpoons = true;
            spoonInstrument.play();
        }
            
        lastTime = now;
    }
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d");
    
        function drawFrame() {
            requestAnimationFrame(drawFrame);
            draw(context, canvas.width, canvas.height);
        }
        
        window.setInterval(update, 16);
        
        drawFrame();
    };
}());