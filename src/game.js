(function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        getTimestamp = null,
        lastTime = 0,
        titleImage = loader.load("title.png"),
        backgroundTiles = [
            loader.load("BackgroundStripe.png"),
            loader.load("BackgroundCubism.png")
        ],
        platformImages = [
        ],
        drawTitle = 2000,
        drawOffset = new LINEAR.Vector(0, 0),
        keyboardState = new INPUT.KeyboardState(window),
        mouseState = null,        
        environment = {
            particles: [
                new PARTICLES.Particle(new LINEAR.Vector(20, 0), 5, 1),
                new PARTICLES.Particle(new LINEAR.Vector(23, 10), 5, 1),
                new PARTICLES.Particle(new LINEAR.Vector(25, 0), 4, 1),
                new PARTICLES.Particle(new LINEAR.Vector(30, 0), 3, 1),
                new PARTICLES.Particle(new LINEAR.Vector(35, 0), 2, 1)
            ],
            platforms: [
                new PLATFORMS.Platform(new LINEAR.Vector(0, 550), new LINEAR.Vector(800, 550)),
                new PLATFORMS.Platform(new LINEAR.Vector(750, 0), new LINEAR.Vector(750, 550))
            ],
            enemies: [
            ],
            gravity: new LINEAR.Vector(0, 0.0098),
            player: new Player(new LINEAR.Vector(75, 550)),
        };
        
    
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
        
    function drawTiled(context, tile, location, width, height) {
        var spanX = tile.width,
            spanY = tile.height,
            tileAlignedX = spanX * Math.floor(location.x / spanX),
            tileAlignedY = spanY * Math.floor(location.y / spanY),
            tileX = 0,
            tileY = 0;
        
        width += location.x - tileAlignedX;
        height += location.y - tileAlignedY;
        
        while (tileY < height) {
            if (tileY + spanY > width) {
                spanY = height - tileY;
            }
            while (tileX < width) {
                if (tileX + spanY > width) {
                    spanX = width - tileX;
                }
                context.drawImage(tile, 0, 0, spanX, spanY, tileX + tileAlignedX, tileY + tileAlignedY, spanX, spanY);
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
        
        drawOffset.set(environment.player.centroid.x - width * 0.5, environment.player.centroid.y - height * 0.5);

        context.save();
        context.translate(-drawOffset.x, -drawOffset.y);
        var tile = backgroundTiles[1];
        drawTiled(context, tile, drawOffset, width, height);

        for (var p = 0; p < environment.particles.length; ++p) {
            environment.particles[p].draw(context);
        }
        
        context.strokeStyle = "rgba(0,0,0,1)";
        for (var f = 0; f < environment.platforms.length; ++f) {
            environment.platforms[f].draw(context);
        }
        
        environment.player.draw(context);
        context.restore();
        
        if (drawTitle > 0) {
            context.save();
            var FADE_TIME = 1000;
            if (drawTitle < FADE_TIME) {
                context.globalAlpha = drawTitle / FADE_TIME;
            }
            drawCentered(context, titleImage, 0, 0, width, height);
            context.restore();
        }
    }
    
    function update() {
        var now = getTimestamp(),
            elapsed = Math.min(now - lastTime, 32);
        
        for (var p = 0; p < environment.particles.length; ++p) {
            environment.particles[p].update(elapsed, environment);
        }
        
        environment.particles.sort(PARTICLES.Ordering);
        
        environment.player.update(elapsed, environment, keyboardState, mouseState, drawOffset);

        keyboardState.postUpdate();
        mouseState.postUpdate();

        drawTitle -= elapsed;
        lastTime = now;
    }
    
    window.onload = function(e) {
        console.log("window.onload", e, Date.now());
        var canvas = document.getElementById("canvas"),
            context = canvas.getContext("2d");
            
        mouseState = new INPUT.MouseState(canvas);
    
        function drawFrame() {
            requestAnimationFrame(drawFrame);
            draw(context, canvas.width, canvas.height);
        }
        
        window.setInterval(update, 16);
        
        drawFrame();
    };
}());