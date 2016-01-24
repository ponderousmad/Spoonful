var Player = (function () {
    "use strict";

    var loader = new ImageBatch("images/"),
        torso = loader.load("torso.png"),
        leftLeg = loader.load("leftLeg.png"),
        rightLeg = loader.load("rightLeg.png"),
        arm = loader.load("arm.png"),
        gun = loader.load("gun.png"),
        launchSound = new SoundEffect("audio/launch.wav"),
        PLAYER_HEIGHT = 200,
        TORSO_SCALE = 0.67,
        LEG_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.43,
        ARM_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.52,
        GUN_PIVOT_HEIGHT = PLAYER_HEIGHT * 0.55,
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
        this.location = location.clone();
        this.lastLocation = location.clone();
        this.centroid = location.clone();
        this.path = new LINEAR.Segment(this.lastLocation.clone(), this.location.clone());
        this.swingDelta = 0;
        this.gunAngle = 0;
        this.falling = false;
        this.velocity = new LINEAR.Vector(0, 0);
        this.acceleration = new LINEAR.Vector(0, 0);
        
        this.exploding = null;
        
        this.rockets = [];
    }
    
    Player.prototype.draw = function (context) {
        if (!loader.loaded) {
            return;
        }
        
        var torsoHeight = PLAYER_HEIGHT * TORSO_SCALE,
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
        context.translate(this.location.x + legWidth * LEG_OFFSET, legPivotY);
        context.rotate(MAX_LEG_SWING * swing);
        context.drawImage(leftLeg, -legWidth * LEG_OFFSET, 0, legWidth, legHeight);
        context.restore();

        context.save();
        context.translate(this.location.x - legWidth * LEG_OFFSET, legPivotY);
        context.rotate(-MAX_LEG_SWING * swing);
        context.drawImage(rightLeg, -legWidth * (1 - LEG_OFFSET), 0, legWidth, legHeight);
        context.restore();

        context.drawImage(torso, this.location.x - torsoWidth * 0.5, this.location.y - PLAYER_HEIGHT + DRAW_OFFSET, torsoWidth, torsoHeight);
                
        context.save();
        context.translate(this.location.x + ARM_OFFSET, armPivotY);
        context.rotate(ARM_BASE_ANGLE - MAX_ARM_SWING * swing);
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
    
    Player.prototype.update = function (elapsed, environment, keyboard, mouse, drawOffset) {
        if (this.falling) {
            this.swingDelta += elapsed;
        } else {
            this.swingDelta *= FLAIL_DAMPEN_FACTOR;
        }

        var source = LINEAR.addVectors(this.location, new LINEAR.Vector(5, -GUN_PIVOT_HEIGHT)),
            direction = LINEAR.subVectors(LINEAR.addVectors(mouse.location, drawOffset), source);
        
        direction.scale(ROCKET_VELOCITY_SCALE);
        
        this.gunAngle = Math.atan2(direction.y, direction.x);
        
        if (mouse.leftDown) {
            this.rockets.push(new Rocket(source, direction));
            launchSound.play();
        }
        
        this.centroid.copy(this.location);
        this.centroid.y -= PLAYER_HEIGHT * 0.5;
        this.acceleration.set(0, 0);
        
        for (var r = this.rockets.length - 1; r >= 0 ; --r) {
            if (!this.rockets[r].update(elapsed, mouse.left, this, environment)) {
                this.rockets.splice(r, 1);
            }
        }
        
        this.acceleration.add(environment.gravity);
        
        if (!this.falling) {
            if (this.acceleration.y < 0) {
                this.falling = true;
            }
        }
        
        this.lastLocation.copy(this.location);
        this.velocity.addScaled(this.acceleration, elapsed);
        this.location.addScaled(this.velocity, elapsed);
        
        if (this.falling) {
            // Wind resistance.
            this.velocity.x *= (1.0 - PLAYER_WIND_RESTANCE * elapsed);
        } else {
            // Friction.
            this.velocity.x *= (1.0 - PLAYER_FRICTION * elapsed);
        }
        
        if (this.location.y > 550) {
            this.falling = false;
            this.location.y = 550;
            this.velocity.set(0, 0);
        }
        
        if (this.exploding !== null && explosion.updatePlayback(elapsed, this.exploding)) {
            this.exploding = null;
        }
    };
    
    return Player;
}());
