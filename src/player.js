var Player = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        torso = loader.load("torso.png"),
        leg = loader.load("leg.png"),
        arm = loader.load("arm.png"),
        rocket = loader.load("rocket.png"),
        explosion = new Flipbook(loader, "explode", 8, 2),
        playerHeight = 200,
        legPivotHeight = playerHeight * 0.5,
        armPivotHeight = playerHeight * 0.78,
        MAX_LEG_SWING = Math.PI * 0.1,
        MAX_ARM_SWING = Math.PI * 0.03,
        DRAW_OFFSET = 5,
        ROCKET_LENGTH = 50,
        EXPLOSION_TIME_PER_FRAME = 80,
        EXPLOSION_SIZE = 50,
        SWING_RATE = 0.005;
    
    loader.commit();
    
    function Rocket(location, velocity) {
        this.location = location.clone();
        this.lastLocation = location.clone();
        this.velocity = velocity.clone();
        this.accel = 0.02;
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
    
    Rocket.prototype.update = function(elapsed, buttonDown, platforms, particles, enemies, gravity) {
        if (this.exploding !== null) {
            this.velocity.scale(0.8);
            this.contact.addScaled(this.velocity, elapsed);
            if (explosion.updatePlayback(elapsed, this.exploding)) {
                this.exploding = null;
                return false;
            }
            return true;
        }
        
        this.lastLocation.copy(this.location);
        this.accelDirection.copy(this.velocity);
        this.accelDirection.normalize();
        this.velocity.addScaled(gravity, elapsed);
        this.velocity.addScaled(this.accelDirection, this.accel * elapsed);
        this.location.addScaled(this.velocity, elapsed);
        
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
            this.velocity.set(0, 0);
            this.location = this.contact;
        } else if (!buttonDown) {
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            this.contact = this.location;
            this.velocity.scale(0.4);
        }
        return true;
    };
    
    function Player(location) {
        this.location = location;
        this.swingDelta = 0;
        
        this.exploding = null;
        
        this.rockets = [];
    }
    
    Player.prototype.draw = function (context) {
        if (!loader.loaded) {
            return;
        }
        
        var torsoHeight = playerHeight * 0.6,
            scaleFactor = torsoHeight / torso.height,
            torsoWidth = torso.width * scaleFactor,
            legWidth = leg.width * scaleFactor,
            legHeight = leg.height * scaleFactor,
            legPivotY = this.location.y - legPivotHeight + DRAW_OFFSET,
            armWidth = arm.width * scaleFactor,
            armHeight = arm.height * scaleFactor,
            armPivotY = this.location.y - armPivotHeight + DRAW_OFFSET,
            swing = Math.sin(this.swingDelta * SWING_RATE);
            
        context.save();
        context.translate(this.location.x, legPivotY);
        context.rotate(MAX_LEG_SWING * swing);
        context.drawImage(leg, -legWidth * 0.5, -2, legWidth, legHeight);
        context.restore();
        
        context.save();
        context.translate(this.location.x, armPivotY);
        context.rotate(MAX_ARM_SWING * swing);
        context.drawImage(arm, -armWidth * 0.13, -1, armWidth, armHeight);
        context.restore();
        
        context.drawImage(torso, this.location.x - torsoWidth * 0.5, this.location.y - playerHeight + DRAW_OFFSET, torsoWidth, torsoHeight);
        
        context.save();
        context.translate(this.location.x, legPivotY);
        context.rotate(-MAX_LEG_SWING * swing);
        context.drawImage(leg, -legWidth * 0.5, -2, legWidth, legHeight);
        context.restore();
                
        context.save();
        context.translate(this.location.x, armPivotY);
        context.rotate(-MAX_ARM_SWING * swing);
        context.drawImage(arm, -armWidth * 0.13, -1, armWidth, armHeight);
        context.restore();
        
        for (var r = 0; r < this.rockets.length; ++r) {
            this.rockets[r].draw(context);
        }
        
        if (this.exploding !== null) {
            var explodeAt = LINEAR.addVectors(this.location, new LINEAR.Vector(0, -playerHeight * 0.5));
            explosion.draw(context, this.exploding, explodeAt, EXPLOSION_SIZE, EXPLOSION_SIZE, true);
        }
    };
    
    Player.prototype.update = function (elapsed, platforms, particles, enemies, gravity, keyboard, mouse) {
        this.swingDelta += elapsed;
        this.location.x += elapsed * 0.1;
        
        if (mouse.leftDown) {
            console.log("Fire rocket");
            var source = LINEAR.addVectors(this.location, new LINEAR.Vector(5, -armPivotHeight)),
                direction = LINEAR.subVectors(mouse.location, source);
            
            direction.normalize();
            
            this.rockets.push(new Rocket(source, direction));
        }
        
        for (var r = this.rockets.length - 1; r >= 0 ; --r) {
            if (!this.rockets[r].update(elapsed, mouse.left, platforms, particles, enemies, gravity)) {
                this.rockets.splice(r, 1);
            }
        }
        
        if (this.exploding !== null && explosion.updatePlayback(elapsed, this.exploding)) {
            this.exploding = null;
        }
    };
    
    return Player;
}());