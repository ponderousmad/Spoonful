var Rocket = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        rocket = loader.load("rocket.png"),
        explosion = new Flipbook(loader, "explode", 8, 2),
        explodeSound = new SoundEffect("audio/explode.wav"),
        ROCKET_LENGTH = 50,
        ROCKET_FLAME_OFFSET = 5,
        INITIAL_ROCKET_ACCELERATION = 0.02,
        ROCKET_ACCEL_DECAY = 0.025,
        EXPLOSION_TIME_PER_FRAME = 80,
        EXPLOSION_SIZE = 100,
        EXPLOSION_STRENGTH = 500.0,
        EXPLOSION_AIR_RESISTANCE = 0.015,
        MAX_BLAST_FORCE = 0.04;
    
    loader.commit();
    
    function Rocket(location, velocity) {
        this.location = location.clone();
        this.lastLocation = location.clone();
        this.velocity = velocity.clone();
        this.acceleration = INITIAL_ROCKET_ACCELERATION;
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
    
    Rocket.prototype.update = function (elapsed, buttonDown, player, platforms, particles, enemies, gravity) {
        if (this.exploding !== null) {
            this.lastLocation.copy(this.contact);
            this.velocity.scale(1.0 - EXPLOSION_AIR_RESISTANCE * elapsed);
            this.contact.addScaled(this.velocity, elapsed);
            
            this.path.start.copy(this.lastLocation);
            this.path.end.copy(this.contact);
            
            if (this.path.length() > 0.5) { // No need to worry about low velocity explosions.
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
            
            player.acceleration.add(this.blastForceAt(player.centroid));
            return true;
        }
        
        this.lastLocation.copy(this.location);
        this.accelDirection.copy(this.velocity);
        this.accelDirection.normalize();
        this.velocity.addScaled(gravity, elapsed);
        this.velocity.addScaled(this.accelDirection, this.acceleration * elapsed);
        this.location.addScaled(this.velocity, elapsed);
        this.acceleration *= elapsed * ROCKET_ACCEL_DECAY;
        
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
            collidePlatform.intersect(this.path, this.contact);
            this.velocity.set(0, 0);
            this.location.copy(this.contact);
        } else if (!buttonDown) {
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            this.contact.copy(this.location);
        }
        
        if (this.exploding !== null) {
            explodeSound.play();
        }
        
        return true;
    };
    
    return Rocket;
}());
