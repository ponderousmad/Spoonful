(function (baseURL) {
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
        MAX_LEVELS = 3,
        environment = {
            level: 0,
            particles: [],
            platforms: [],
            enemies: [
                new Enemy("Glider", [
                    new LINEAR.Vector(200, 200),
                    new LINEAR.Vector(650, 200),
                    new LINEAR.Vector(700, 225),
                    new LINEAR.Vector(650, 250),
                    new LINEAR.Vector(200, 250),
                    new LINEAR.Vector(150, 225)
                ])
            ],
            portal: new LINEAR.Vector(0, 0),
            portalAngle: 0,
            portalDraw: portalFrames.setupPlayback(80, true),
            PORTAL_SPIN: Math.PI * 0.001,
            PORTAL_SIZE: 125,
            TELEPORT_TIME: 1000,
            FADE_TIME: 1000,
            teleportLeft: 0,
            gravity: new LINEAR.Vector(0, 0.0098),
            player: new Player(new LINEAR.Vector(0, 0)),
            fade: null,
            levelDone: false,
            loading: false
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
        
        if (!this.loading) {
            context.save();
            context.translate(this.portal.x, this.portal.y);
            context.rotate(this.portalAngle);
            portalFrames.draw(context, this.portalDraw, LINEAR.ZERO, this.PORTAL_SIZE, this.PORTAL_SIZE, true);
            context.restore();

            for (var p = 0; p < this.particles.length; ++p) {
                this.particles[p].draw(context);
            }

            for (var e = 0; e < this.enemies.length; ++e) {
                this.enemies[e].draw(context);
            }
            
            context.strokeStyle = "rgba(0,0,0,1)";
            for (var f = 0; f < this.platforms.length; ++f) {
                this.platforms[f].draw(context);
            }
            
            this.player.draw(context);
        }
        context.restore();
        
        if (this.fade != null) {
            var fade = this.fade / this.FADE_TIME;
            if (this.levelDone) {
                fade = 1.0 - fade;
            }
            context.fillStyle = "rgba(255,255,255," + fade + ")";
            context.fillRect(0, 0, width, height);
        }
    };
    
    environment.update = function (elapsed) {
        if (this.loading) {
            return;
        }
        for (var p = 0; p < this.particles.length; ++p) {
            this.particles[p].update(elapsed, this);
        }
        
        for (var e = 0; e < this.enemies.length; ++e) {
            this.enemies[e].update(elapsed, this);
        }
        
        this.particles.sort(PARTICLES.Ordering);
        
        this.player.update(elapsed, this, keyboardState, mouseState, drawOffset);
        
        portalFrames.updatePlayback(elapsed, this.portalDraw);
        this.portalAngle += elapsed * this.PORTAL_SPIN;
        
        if (this.fade !== null) {
            this.fade = Math.max(0, this.fade - elapsed);
            
            if(this.fade == 0) {
                if (this.levelDone) {
                    this.loadNextLevel();
                } else {
                    this.fade = null;
                }
            }
        }
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
    
    environment.teleport = function() {
        this.levelDone = true;
        this.teleportLeft = this.TELEPORT_TIME;
        return this.teleportLeft / this.TELEPORT_TIME;
    };
    
    environment.updateTeleport = function(elapsed) {
        this.teleportLeft -= elapsed;
        var teleport = Math.max(0, this.teleportLeft / this.TELEPORT_TIME);
        if (this.fade === null && teleport < 0.5) {
            this.fade = this.FADE_TIME;
        }
        return teleport;
    };
    
    environment.save = function () {
        var platformData = [],
            enemyData = [];
        
        for (var p = 0; p < this.platforms.length; ++p) {
            platformData.push(this.platforms[p].save());
        }
        
        for (var e = 0; e < this.enemies.length; ++e) {
            enemyData.push(this.enemies[e].save());
        }
        
        return {
            platforms: platformData,
            enemies: enemyData,
            portal: this.portal,
            playerStart: this.player.location
        }
    };
    
    function saveLevel() {
        var saveDiv = document.getElementById("save");
        saveDiv.innerHTML = "<pre>" + JSON.stringify(environment.save(), null, 4) + "</pre>";
    }
    
    environment.load = function (resource) {
        var self = this,
            request = new XMLHttpRequest();
            
        this.loading = true;
        request.open("GET", resource, true);
        request.responseType = "text";
        request.onload = function () {
            console.log("Loading " + resource);
            var responseData = JSON.parse(request.response),
                platformData = responseData["platforms"],
                enemyData = responseData["enemies"];
            enemyData = enemyData ? enemyData : [];
            
            self.platforms = [];
            self.enemies = [];
            
            for (var p = 0; p < platformData.length; ++p) {
                var platform = platformData[p];
                self.platforms.push(new PLATFORMS.Platform(LINEAR.parseVector(platform.start), LINEAR.parseVector(platform.end)));
            }
            
            for (var e = 0; e < enemyData.length; ++e) {
                var enemy = enemyData[e],
                    path = [];
                for (var v = 0; v < enemy.path.length; ++v) {
                    path.push(LINEAR.parseVector(enemy.path[v]));
                }
                self.enemies.push(new Enemy(enemy.type, path));
            }
            
            self.portal = LINEAR.parseVector(responseData["portal"]);
            self.player.reset(LINEAR.parseVector(responseData["playerStart"]));
            
            self.levelDone = false;
            self.loading = false;
            self.fade = self.FADE_TIME;
            
            saveLevel();
        };
        request.send();
    };
    
    environment.loadNextLevel = function() {
        this.level = Math.min(MAX_LEVELS, this.level + 1);
        var resource = baseURL + "levels/level" + (this.level > 10 ? "" : "0") + this.level + ".json";
        this.load(resource);
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
        
        saveLevel();
        
        environment.loadNextLevel();
    
        function drawFrame() {
            requestAnimationFrame(drawFrame);
            draw(context, canvas.width, canvas.height);
        }
        
        window.setInterval(update, 16);
        
        drawFrame();
    };
}(rootURL));