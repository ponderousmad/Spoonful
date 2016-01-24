var Player = (function () {
    "use strict";

    var loader = new ImageBatch("images/"),
        torso = loader.load("torso.png"),
        leftLeg = loader.load("leftLeg.png"),
        rightLeg = loader.load("rightLeg.png"),
        arm = loader.load("arm.png"),
        gun = loader.load("gun.png"),
        launchSound = new SoundEffect("audio/launch.wav"),
        PLAYER_HEIGHT = 100,
        TORSO_SCALE = 0.67,
        LEG_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.43,
        ARM_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.52,
        GUN_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.555,
        ARM_OFFSET = PLAYER_HEIGHT * 0.19,
        LEG_OFFSET = 0.2,
        MAX_LEG_SWING = Math.PI * 0.05,
        MAX_ARM_SWING = Math.PI * 0.04,
        ARM_BASE_ANGLE = Math.PI * 0.1,
        DRAW_OFFSET = 0,
        SWING_RATE = 0.005,
        FLAIL_DAMPEN_FACTOR = 0.3,
        PLAYER_WIND_RESTANCE = 0.005,
        PLAYER_FRICTION = 0.015,
        ROCKET_VELOCITY_SCALE = 0.01;

    loader.commit();
    
    function Player(location) {
        this.reset(location);
    }
    
    Player.prototype.reset = function(location) {
        this.location = location.clone();
        this.centroid = location.clone();
        this.path = new LINEAR.Segment(location.clone(), location.clone());
        this.swingDelta = 0;
        this.gunAngle = 0;
        this.freefall = false;
        this.velocity = new LINEAR.Vector(0, 0);
        this.acceleration = new LINEAR.Vector(0, 0);
        this.support = null;
        this.width = PLAYER_HEIGHT; // temporary value, need images to determine.
        
        this.exploding = null;
        this.teleport = null;
        
        this.rockets = [];
    };
    
    function drawImageTransformed(context, image, x, y, angle, xOffset, yOffset, width, height) {
        context.save();
        context.translate(x, y);
        context.rotate(angle);
        context.drawImage(image, xOffset, yOffset, width, height);
        context.restore();
    }
    
    Player.prototype.drawBody = function (context) {
        var torsoHeight = PLAYER_HEIGHT * TORSO_SCALE,
            scaleFactor = torsoHeight / torso.height,
            legWidth = leftLeg.width * scaleFactor,
            legHeight = leftLeg.height * scaleFactor,
            legPivotY = this.location.y - LEG_PIVOT_HEIGHT + DRAW_OFFSET,
            armWidth = arm.width * scaleFactor,
            armHeight = arm.height * scaleFactor,
            armPivotY = this.location.y - ARM_PIVOT_HEIGHT + DRAW_OFFSET,
            gunWidth = gun.width * scaleFactor,
            gunHeight = gun.height * scaleFactor,
            gunPivotY = this.location.y - GUN_PIVOT_HEIGHT + DRAW_OFFSET,
            swing = Math.sin(this.swingDelta * SWING_RATE);
            
        this.width = torso.width * scaleFactor,
        
        drawImageTransformed(context, leftLeg,
            this.location.x + legWidth * LEG_OFFSET, legPivotY,
            MAX_LEG_SWING * swing,
            -legWidth * LEG_OFFSET, 0, legWidth, legHeight
        );
        
        drawImageTransformed(context, rightLeg,
            this.location.x - legWidth * LEG_OFFSET, legPivotY,
            -MAX_LEG_SWING * swing,
            -legWidth * (1 - LEG_OFFSET), 0, legWidth, legHeight
        );

        context.drawImage(torso, this.location.x - this.width * 0.5, this.location.y - PLAYER_HEIGHT + DRAW_OFFSET, this.width, torsoHeight);

        drawImageTransformed(context, arm,
            this.location.x + ARM_OFFSET, armPivotY,
            ARM_BASE_ANGLE - MAX_ARM_SWING * swing,
            -armWidth * 0.5, -armWidth * 0.5, armWidth, armHeight
        );
        
        drawImageTransformed(context, gun,
            this.location.x, gunPivotY,
            this.gunAngle,
            -gunHeight * 0.5, -gunHeight * 0.5, gunWidth, gunHeight
        );
    };
    
    Player.prototype.draw = function (context) {
        if (!loader.loaded) {
            return;
        }
        
        if (this.exploding !== null) {
            var explodeAt = LINEAR.addVectors(this.location, new LINEAR.Vector(0, -PLAYER_HEIGHT * 0.5));
            explosion.draw(context, this.exploding, explodeAt, EXPLOSION_SIZE, EXPLOSION_SIZE, true);
        } else {
            context.save();
            if (this.teleport != null) {
                context.globalAlpha = this.teleport;
            }
            this.drawBody(context);
            context.restore();
        }
        
        // Draw rockets/explosions over the player.
        for (var r = 0; r < this.rockets.length; ++r) {
            this.rockets[r].draw(context);
        }
    };
    
    Player.prototype.updateCentroid = function () {
        this.centroid.copy(this.location);
        this.centroid.y -= PLAYER_HEIGHT * 0.5;
    };
    
    Player.prototype.updateRockets = function (elapsed, environment, mouse, drawOffset) {
        var source = LINEAR.addVectors(this.location, new LINEAR.Vector(5, -GUN_PIVOT_HEIGHT)),
            direction = LINEAR.subVectors(LINEAR.addVectors(mouse.location, drawOffset), source);
        
        direction.scale(ROCKET_VELOCITY_SCALE);
        
        this.gunAngle = Math.atan2(direction.y, direction.x);
        
        if (mouse.leftDown && this.teleport === null) {
            this.rockets.push(new Rocket(source, direction));
            launchSound.play();
        }
        
        this.updateCentroid();
        this.acceleration.set(0, 0);
        for (var r = this.rockets.length - 1; r >= 0 ; --r) {
            if (!this.rockets[r].update(elapsed, mouse.left, environment)) {
                this.rockets.splice(r, 1);
            }
        }
    };
    
    Player.prototype.wallBound = function (elapsed, environment) {
        var offset = this.path.end.x - this.path.start.x,
            bound = environment.wallCheck(this.centroid, this.width * 0.5, offset);
            
        if (bound !== null) {
            this.location.x = bound;
            this.path.end.x = bound;
            this.velocity.x = 0;
            this.acceleration.x = 0;
        }
    }
    
    Player.prototype.updatePhysics = function (elapsed, environment) {
        var self = this;
        
        this.acceleration.add(environment.gravity);
       
        if (!this.freefall) {
            if (this.acceleration.y < 0) {
                this.freefall = true;
            }
        }
        
        this.path.start.copy(this.location);
        this.velocity.addScaled(this.acceleration, elapsed);
        if (environment.wallCheck(this.centroid, this.width * 0.5, this.velocity.x) !== null) {
            this.velocity.x = 0;
        }
        this.location.addScaled(this.velocity, elapsed);
        
        if (this.teleport != null) {
            var teleportFeet = environment.portal.clone();
            teleportFeet.y -= PLAYER_HEIGHT * 0.5;
            this.location.scale(this.teleport);
            this.location.addScaled(teleportFeet, 1.0 - this.teleport);
        }
        
        var skipPlatform = null,
            slid = false,
            offEnd = false,
            checkIntersections = true;
        
        if (this.support !== null) {
            var dot = this.support.segment.directedNormal().dot(this.velocity);
            
            if (dot < 0) { // Velocity into platform.
                var offsetX = this.path.start.x - this.location.x;
                if (offsetX == 0) {
                    // No sliding velocity, we're done.
                    this.location.y = this.path.start.y;
                    this.velocity.set(0, 0);
                    checkIntersections = false;
                } else {
                    var closest = this.support.segment.closestPoint(this.location);
                    if (closest.atEnd) {                   
                        var direction = LINEAR.subVectors(closest.point, this.path.start);
                        skipPlatform = true;
                        if (direction.x != 0) {
                            this.location.y = offsetX * (direction.y / direction.x);
                            offEnd = true;
                            slid = true;
                        } else {
                            this.freefall = true;
                            skipPlatform = this.support;
                        }
                    } else {
                        this.location.copy(closest.point);
                        slid = true;
                        skipPlatform = this.support;
                    }
                }
            } else {
                skipPlatform = this.support;
            }
        }
        
        this.path.end.copy(this.location);
        
        while (checkIntersections && (slid || this.freefall || this.support === null)) {
            this.updateCentroid();
            this.wallBound(elapsed, environment);
            
            checkIntersections = false;
            environment.closestPlatformIntersection(this.path, function(platform, intersection) {
                if (platform.run > 0) { // No support from vertical or inverted platforms.
                    self.support = platform;
                    self.freefall = false;
                    self.velocity.set(0, 0);
                    self.location.copy(intersection);
                } else {
                    checkIntersections = self.velocity.y != 0;
                    if(!checkIntersections) {
                        self.wallBound(elapsed, environment);
                    }
                    self.location.x = intersection.x;
                    self.path.end.x = self.location.x;
                    skipPlatform = platform;
                    if(slid && offEnd) {
                        self.freefall = true;
                    }
                }
            }, function(platform, intersection) {
                return platform != skipPlatform; 
            });            
        }
        
        if (this.freefall) {
            var top = environment.ceilingCheck(this.location.x, this.location.y, PLAYER_HEIGHT)
            if (top != null) {
                this.location.y = top;
                this.path.end.y = top;
            }
            this.support = null;
        }
        
        if (this.support === null) {
            // Wind resistance.
            this.velocity.x *= (1.0 - PLAYER_WIND_RESTANCE * elapsed);
        } else {
            // Friction.
            this.velocity.x *= (1.0 - PLAYER_FRICTION * elapsed);
        }
        this.updateCentroid();
    };
    
    Player.prototype.update = function (elapsed, environment, keyboard, mouse, drawOffset) {
        if (this.exploding !== null && explosion.updatePlayback(elapsed, this.exploding)) {
            this.exploding = null;
            return;
        }
        
        if (this.freefall) {
            this.swingDelta += elapsed;
        } else {
            this.swingDelta *= FLAIL_DAMPEN_FACTOR;
        }
        
        this.updateRockets(elapsed, environment, mouse, drawOffset);
        
        this.updatePhysics(elapsed, environment);
        
        if (this.teleport === null) {
            var portalDistance = LINEAR.pointDistance(this.centroid, environment.portal);
            if (portalDistance < environment.PORTAL_SIZE * 0.5) {
                this.teleport = environment.teleport();
            }
        } else {
            this.teleport = environment.updateTeleport(elapsed);
        }
    };
    
    return Player;
}());
