var Rocket = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        rocket = loader.load("rocket.png"),
        explosion = new Flipbook(loader, "explode", 8, 2),
        explodeSound = new SoundEffect("audio/explode.wav"),
        ROCKET_LENGTH = 25,
        ROCKET_FLAME_OFFSET = 5,
        INITIAL_ROCKET_ACCELERATION = 0.02,
        ROCKET_ACCEL_DECAY = 0.025,
        EXPLOSION_TIME_PER_FRAME = 80,
        EXPLOSION_SIZE = 100,
        EXPLOSION_STRENGTH = 400.0,
        EXPLOSION_AIR_RESISTANCE = 0.015,
        FATAL_BLAST = 0.03,
        MAX_BLAST_FORCE = 0.03;
    
    loader.commit();
    
    function Rocket(location, velocity, touchID) {
        this.location = location.clone();
        this.velocity = velocity.clone();
        this.acceleration = INITIAL_ROCKET_ACCELERATION;
        this.accelDirection = velocity.clone();
        this.path = new LINEAR.Segment(location.clone(), location.clone());
        this.exploding = null;
        this.contact = new LINEAR.Vector(0, 0);
        this.dead = false;
        this.touchID = touchID;
    }
    
    Rocket.prototype.draw = function (context) {
        if (!loader.loaded) {
            return;
        }
        var flameOffset = ROCKET_FLAME_OFFSET,
            rocketHeight = rocket.height * (ROCKET_LENGTH / rocket.width),
            rocketAngle = Math.atan2(this.velocity.y, this.velocity.x);
            
        context.save();
        if (this.exploding !== null) {
            context.translate(this.contact.x, this.contact.y);
            context.rotate(rocketAngle);
            explosion.draw(context, this.exploding, LINEAR.ZERO, EXPLOSION_SIZE, EXPLOSION_SIZE, true);
        } else {
            context.translate(this.location.x, this.location.y);
            context.rotate(rocketAngle);
            context.drawImage(rocket, -flameOffset, -rocketHeight * 0.5, ROCKET_LENGTH, rocketHeight);
        }
        context.restore();
    };
    
    Rocket.prototype.blastForceAt = function (location) {
        var blastForce = LINEAR.subVectors(location, this.contact),
            distanceSq = blastForce.lengthSq(),
            distance = Math.sqrt(distanceSq),
            attenuation = 1.0 - this.exploding.fractionComplete,
            strength = EXPLOSION_STRENGTH * Math.pow(attenuation, 2) / distanceSq;

        blastForce.scale(Math.min(strength, MAX_BLAST_FORCE) / distance);
        return blastForce;
    };
    
    Rocket.prototype.blastEnemies = function (elapsed, environment) {
        for (var e = 0; e < environment.enemies.length; ++e) {
            var enemy = environment.enemies[e];
            if (!enemy.dead) {
                var blastForce = this.blastForceAt(enemy.location);
                if (blastForce.lengthSq() > FATAL_BLAST * FATAL_BLAST) {
                    enemy.kill();
                } else {
                    enemy.velocity.addScaled(blastForce, elapsed);
                }
            }
        }
    };
    
    Rocket.prototype.update = function (elapsed, buttonDown, touchState, environment) {
        var self = this;
        
        if (this.exploding !== null) {
            this.path.start.copy(this.contact);
            this.velocity.scale(1.0 - EXPLOSION_AIR_RESISTANCE * elapsed);
            this.contact.addScaled(this.velocity, elapsed);
            this.path.end.copy(this.contact);
            
            if (this.path.length() > 0.5) { // No need to worry about low velocity/stationary explosions.
                this.path.extendBoth(5);
                
                environment.closestPlatformIntersection(this.path, function (platform, intersection) {
                    self.velocity.set(0, 0);
                    self.contact.copy(intersection);
                });
            }

            if (explosion.updatePlayback(elapsed, this.exploding)) {
                this.exploding = null;
                return false;
            }
            
            environment.player.acceleration.add(this.blastForceAt(environment.player.centroid));
            
            this.blastEnemies(elapsed, environment);
            return true;
        }
        
        this.path.start.copy(this.location);
        this.accelDirection.copy(this.velocity);
        this.accelDirection.normalize();
        this.velocity.addScaled(environment.gravity, elapsed);
        this.velocity.addScaled(this.accelDirection, this.acceleration * elapsed);
        this.location.addScaled(this.velocity, elapsed);
        this.acceleration *= elapsed * ROCKET_ACCEL_DECAY;
        this.path.end.copy(this.location);
        this.path.extendAtEnd(ROCKET_LENGTH);

        var collidePlatform = null,
            collide = false;
        
        environment.closestPlatformIntersection(this.path, function(platform, intersection) {
            collidePlatform = platform;
            self.contact.copy(intersection);
        });

        if (collidePlatform !== null) {
            collide = true;
            this.velocity.set(0, 0);
            this.location.copy(this.contact);
        } else if ((this.touchID === null && !buttonDown) || (this.touchID !== null && touchState.getTouch(this.touchID) === null)) {
            collide = true;
            this.contact.copy(this.location);
        } else {
            for (var e = 0; e < environment.enemies.length; ++e) {
                var enemy = environment.enemies[e];
                if (enemy.isAlive()) {
                    var closest = this.path.closestPoint(enemy.location);
                    if (LINEAR.pointDistanceSq(closest.point, enemy.location) < enemy.radius * enemy.radius) {
                        collide = true;
                        this.contact.copy(closest.point);
                        this.velocity.set(0, 0);
                    }
                }
            }
        }
        
        if (collide) {
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            explodeSound.play();
        }
        
        return true;
    };
    
    Rocket.prototype.isAlive = function() {
        return this.exploding === null;
    };
    
    return Rocket;
}());
