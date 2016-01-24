(function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        getTimestamp = null,
        lastTime = 0,
        titleImage = loader.load("title.png"),
        backgroundTiles = [
            loader.load("BackgroundStripe.png"),
            loader.load("BackgroundCubism.png"),
            loader.load("BackgroundTan.png")
        ],
        portalFrames = new Flipbook(loader, "portal", 16, 2),
        drawTitle = 2000,
        drawOffset = new LINEAR.Vector(0, 0),
        keyboardState = new INPUT.KeyboardState(window),
        mouseState = null,
        PORTAL_SPIN = Math.PI * 0.001,
        PORTAL_SIZE = 125,
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
                new PLATFORMS.Platform(new LINEAR.Vector(500, 100), new LINEAR.Vector(800, 100)),
                new PLATFORMS.Platform(new LINEAR.Vector(0, 300), new LINEAR.Vector(400, 300)),
                new PLATFORMS.Platform(new LINEAR.Vector(750, 600), new LINEAR.Vector(750, -300)),
                new PLATFORMS.Platform(new LINEAR.Vector(50, -300), new LINEAR.Vector(50, 600)),
                new PLATFORMS.Platform(new LINEAR.Vector(800, -250), new LINEAR.Vector(0, -250))
            ],
            enemies: [
            ],
            portal: new LINEAR.Vector(650, 30),
            portalAngle: 0,
            portalDraw: portalFrames.setupPlayback(80, true),
            gravity: new LINEAR.Vector(0, 0.0098),
            player: new Player(new LINEAR.Vector(400, 550)),
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
    
    environment.draw = function (context, width, height) {
        drawOffset.set(this.player.centroid.x - width * 0.5, this.player.centroid.y - height * 0.5);

        context.save();
        context.translate(-drawOffset.x, -drawOffset.y);
        var tile = backgroundTiles[2];
        drawTiled(context, tile, drawOffset, width, height);
        
        context.save();
        context.translate(this.portal.x, this.portal.y);
        context.rotate(this.portalAngle);
        portalFrames.draw(context, this.portalDraw, LINEAR.ZERO, PORTAL_SIZE, PORTAL_SIZE, true);
        context.restore();

        for (var p = 0; p < this.particles.length; ++p) {
            this.particles[p].draw(context);
        }
        
        context.strokeStyle = "rgba(0,0,0,1)";
        for (var f = 0; f < this.platforms.length; ++f) {
            this.platforms[f].draw(context);
        }
        
        this.player.draw(context);
        context.restore();
    };
    
    environment.update = function (elapsed) {
        for (var p = 0; p < this.particles.length; ++p) {
            this.particles[p].update(elapsed, this);
        }
        
        this.particles.sort(PARTICLES.Ordering);
        
        this.player.update(elapsed, this, keyboardState, mouseState, drawOffset);
        
        portalFrames.updatePlayback(elapsed, this.portalDraw);
        this.portalAngle += elapsed * PORTAL_SPIN;
    };
    
    environment.intersectPlatforms = function(segment, onIntersect) {
        PLATFORMS.intersect(this.platforms, segment, onIntersect)
    };
    
    environment.closestPlatformIntersection = function(segment, onClosest, filter) {
        var closestPlatform = null,
            closestDistanceSq = 0,
            closestIntersection = new LINEAR.Vector(0,0);
        
        this.intersectPlatforms(segment, function(platform, intersection) {
            if (filter && !filter(platform, intersection)) {
                return;
            }
            var contactDistance = LINEAR.pointDistanceSq(segment.start, intersection);
            if (closestPlatform === null || contactDistance < closestDistanceSq) {
                closestPlatform = platform;
                closestDistanceSq = contactDistance;
                closestIntersection.copy(intersection);
            }
        });
        if (closestPlatform !== null) {
            onClosest(closestPlatform, closestIntersection, closestDistanceSq);
        }
    };
    
    environment.wallCheck = function(location, radius, direction) {
        var bound = null;
        for (var p = 0; p < this.platforms.length; ++p) {
            var platform = this.platforms[p];
            if (platform.rise != 0) {
                var closest = platform.segment.closestPoint(location),
                    distanceSq = LINEAR.pointDistanceSq(closest.point, location);
                if (distanceSq < radius * radius) {
                    if (direction < 0) {
                        if (closest.point.x < location.x) {
                            var limit = closest.point.x + radius;
                            if (bound == null || limit > bound) {
                                bound = limit;
                            }
                        }
                    } else {
                        if (closest.point.x > location.x) {
                            var limit = closest.point.x - radius;
                            if (bound == null || limit < bound) {
                                bound = limit;
                            }
                        }
                    }
                }
            }
        }
        return bound;
    };
    
    environment.ceilingCheck = function(x, bottom, height) {
        var bound = null;
        for (var p = 0; p < this.platforms.length; ++p) {
            var platform = this.platforms[p];
            if (platform.run < 0) { // Only check inverted platforms.
                var y = platform.yForX(x) + height;
                if (y > bottom) {
                    if (bound == null || y > bound) {
                        bound = y;
                    }
                }
            }
        }
        return bound;
    };
    
    function draw(context, width, height) {
        if (!loader.loaded) {
            return;
        }
        
        environment.draw(context, width, height);

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
        
        environment.update(elapsed);

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