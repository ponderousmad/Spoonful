var Player = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        torso = loader.load("torso.png"),
        leftLeg = loader.load("leftLeg.png"),
        rightLeg = loader.load("rightLeg.png"),
        arm = loader.load("arm.png"),
        gun = loader.load("gun.png"),
        rocket = loader.load("rocket.png"),
        explosion = new Flipbook(loader, "explode", 8, 2),
        launchSound = new SoundEffect("audio/launch.wav"),
        explodeSound = new SoundEffect("audio/explode.wav"),
        PLAYER_HEIGHT = 200,
        LEG_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.43,
        ARM_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.52,
        GUN_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.55,
        ARM_OFFSET = PLAYER_HEIGHT * 0.19,
        MAX_LEG_SWING = Math.PI * 0.05,
        MAX_ARM_SWING = Math.PI * 0.04,
        DRAW_OFFSET = 0,
        ROCKET_LENGTH = 50,
        EXPLOSION_TIME_PER_FRAME = 80,
        EXPLOSION_SIZE = 50,
        EXPLOSION_STRENGTH = 0.5,
        SWING_RATE = 0.005;
    
    loader.commit();
    
    function Rocket(location, velocity) {
        this.location = location.clone();
        this.lastLocation = location.clone();
        this.velocity = velocity.clone();
        this.acceleration = 0.04;
        this.accelDirection = velocity.clone();
        this.path = new LINEAR.Segment(this.lastLocation.clone(), this.location.clone());
        this.exploding = null;
        this.contact = new LINEAR.Vector(0, 0);
        this.dead = false;
    }
    
    Rocket.prototype.draw = function(context) {
        if (!loader.loaded) {
            return;
        }
        var flameOffset = 5,
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
    
    Rocket.prototype.update = function(elapsed, buttonDown, player, platforms, particles, enemies, gravity) {
        if (this.exploding !== null) {
            this.lastLocation.copy(this.contact);
            this.velocity.scale(0.8);
            this.contact.addScaled(this.velocity, elapsed);
            
            this.path.start.copy(this.lastLocation);
            this.path.end.copy(this.contact);
            
            if (this.path.length() > 0.5) {
                this.path.extendBoth(5);
                for (var i = 0; i < platforms.length; ++i) {
                    if (platforms[i].intersect(this.path, this.location)) {
                        this.velocity.set(0, 0);
                        this.contact.copy(this.location);
                    }
                }
            }

            if (explosion.updatePlayback(elapsed, this.exploding)) {
                this.exploding = null;
                return false;
            }
            
            var blastForce = LINEAR.subVectors(player.centroid, this.contact),
                distanceSq = blastForce.length(),
                distance = Math.sqrt(distanceSq),
                attenuation = 1.0 - this.exploding.fractionComplete;

            blastForce.scale(EXPLOSION_STRENGTH * Math.pow(attenuation, 12) / (distance * distanceSq));
            player.acceleration.add(blastForce);
            
            return true;
        }
        
        this.lastLocation.copy(this.location);
        this.accelDirection.copy(this.velocity);
        this.accelDirection.normalize();
        this.velocity.addScaled(gravity, elapsed);
        this.velocity.addScaled(this.accelDirection, this.acceleration * elapsed);
        this.location.addScaled(this.velocity, elapsed);
        this.acceleration *= elapsed / 40;
        
        this.path.start.copy(this.lastLocation);
        this.path.end.copy(this.location);
        this.path.extendAtEnd(ROCKET_LENGTH);

        var collidePlatform = null,
            collideEnemy = null,
            closestCollisionSq = 0;
        
        for (var f = 0; f < platforms.length; ++f) {
            var platform = platforms[f];
            
            if (platform.intersect(this.path, this.contact)) {
                var contactDistance = LINEAR.pointDistanceSq(this.lastLocation, this.contact);
                if (collidePlatform === null || contactDistance < closestCollisionSq) {
                    collidePlatform = platform;
                    closestCollisionSq = contactDistance;
                }
            }
        }

        if (collidePlatform !== null) {
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            collidePlatform.intersect(this.path, this.contact)
            this.velocity.set(0, 0);
            this.location.copy(this.contact);
        } else if (!buttonDown) {
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            this.contact.copy(this.location);
            this.velocity.scale(0.4);
        }
        
        if (this.exploding !== null) {
            explodeSound.play();
        }
        
        return true;
    };
    
    function Player(location) {
        this.location = location.clone();
        this.lastLocation = location.clone();
        this.centroid = location.clone();
        this.path = new LINEAR.Segment(this.lastLocation.clone(), this.location.clone());
        this.swingDelta = 0;
        this.gunAngle = 0;
        this.falling = false;
        this.velocity = new LINEAR.Vector(0, 0)
        this.acceleration = new LINEAR.Vector(0, 0);
        
        this.exploding = null;
        
        this.rockets = [];
    }
    
    Player.prototype.draw = function (context) {
        if (!loader.loaded) {
            return;
        }
        
        var torsoHeight = PLAYER_HEIGHT * 0.68,
            scaleFactor = torsoHeight / torso.height,
            torsoWidth = torso.width * scaleFactor,
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
            
        context.save();
        context.translate(this.location.x + legWidth * 0.2, legPivotY);
        context.rotate(MAX_LEG_SWING * swing);
        context.drawImage(leftLeg, -legWidth * 0.2, -2, legWidth, legHeight);
        context.restore();

        context.save();
        context.translate(this.location.x - legWidth * 0.2, legPivotY);
        context.rotate(-MAX_LEG_SWING * swing);
        context.drawImage(rightLeg, -legWidth * 0.8, -2, legWidth, legHeight);
        context.restore();

        context.drawImage(torso, this.location.x - torsoWidth * 0.5, this.location.y - PLAYER_HEIGHT + DRAW_OFFSET, torsoWidth, torsoHeight);
                
        context.save();
        context.translate(this.location.x + ARM_OFFSET, armPivotY);
        context.rotate(Math.PI * 0.1 - MAX_ARM_SWING * swing);
        context.drawImage(arm, -armWidth * 0.5, -armWidth * 0.5, armWidth, armHeight);
        context.restore();
       
        context.save();
        context.translate(this.location.x, gunPivotY);
        context.rotate(this.gunAngle);
        context.drawImage(gun, -gunHeight * 0.5, -gunHeight * 0.5, gunWidth, gunHeight);
        context.restore();
        
        for (var r = 0; r < this.rockets.length; ++r) {
            this.rockets[r].draw(context);
        }
        
        if (this.exploding !== null) {
            var explodeAt = LINEAR.addVectors(this.location, new LINEAR.Vector(0, -PLAYER_HEIGHT * 0.5));
            explosion.draw(context, this.exploding, explodeAt, EXPLOSION_SIZE, EXPLOSION_SIZE, true);
        }
    };
    
    Player.prototype.update = function (elapsed, platforms, particles, enemies, gravity, keyboard, mouse) {
        if (this.falling) {
            this.swingDelta += elapsed;
        } else {
            this.swingDelta *= 0.3;
        }

        var source = LINEAR.addVectors(this.location, new LINEAR.Vector(5, -GUN_PIVOT_HEIGHT)),
            direction = LINEAR.subVectors(mouse.location, source);
        
        direction.scale(0.01);
        
        this.gunAngle = Math.atan2(direction.y, direction.x);
        
        if (mouse.leftDown) {
            console.log("Fire rocket");
            this.rockets.push(new Rocket(source, direction));
            launchSound.play();
        }
        
        this.centroid.copy(this.location);
        this.centroid.y -= PLAYER_HEIGHT * .5;
        this.acceleration.set(0,0);
        
        for (var r = this.rockets.length - 1; r >= 0 ; --r) {
            if (!this.rockets[r].update(elapsed, mouse.left, this, platforms, particles, enemies, gravity)) {
                this.rockets.splice(r, 1);
            }
        }
        
        this.acceleration.add(gravity);
        //this.acceleration.x = 0;
        
        if (!this.falling) {
            this.acceleration.y = Math.min(0, this.acceleration.y);
            if (this.acceleration.y < 0) {
                this.falling = true;
            }
        }
        
        if (this.acceleration.x != 0 || this.acceleration.y != 0) {
            console.log("Accel: " + this.acceleration.x + ", " + this.acceleration.y);
        }
        
        this.lastLocation.copy(this.location);
        this.velocity.addScaled(this.acceleration, elapsed);
        this.location.addScaled(this.velocity, elapsed);
        
        if (this.exploding !== null && explosion.updatePlayback(elapsed, this.exploding)) {
            this.exploding = null;
        }
    };
    
    return Player;
}());