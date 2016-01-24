var Enemy = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        images = [
            loader.load("glider.png")
        ],
        explosion = new Flipbook(loader, "boom", 8, 2),
        EXPLOSION_SIZE = 100,
        EXPLOSION_TIME_PER_FRAME = 80,
        FOLLOW_DISTANCE = 250,
        ATTACK_RANGE = 50,
        boomSound = new SoundEffect("audio/boom.wav"),
        Types = {
            Glider: 0
        };
    
    loader.commit();
    
    function nameForType(type) {
        for (var t in Types) {
            if (Types.hasOwnProperty(t)) {
                if (Types[t] === type) {
                    return t;
                }
            }
        }
        return null;
    }
    
    function Enemy(type, path) {
        this.type = typeof type == "number" ? type : Types[type];
        this.location = path[0].clone();
        this.path = path;
        this.angle = 0;
        this.exploding = null;
        this.dead = false;
        this.direction = new LINEAR.Vector(0, 0);
        this.velocity = new LINEAR.Vector(0, 0);
        this.waypoint = 1;
    }
    
    Enemy.prototype.draw = function (context) {
        if (!loader.loaded || this.dead) {
            return;
        }
       
        var image = images[this.type];
        context.save();
        context.translate(this.location.x, this.location.y);
        context.rotate(this.angle);
        if (this.exploding != null) {
            explosion.draw(context, this.exploding, LINEAR.ZERO, EXPLOSION_SIZE, EXPLOSION_SIZE, true);
        } else {
            this.radius = image.width * 0.5;
            context.drawImage(image, -this.radius, -this.radius);
        }
        context.restore();
    };
    
    Enemy.prototype.speed = function() {
        if (this.type == Types.Glider) {
            return 0.3;
        }
        return 0.1;
    };
    
    Enemy.prototype.update = function (elapsed, environment) {
        if (this.dead) {
            return;
        }
        
        if (this.exploding !== null) {
            if (explosion.updatePlayback(elapsed, this.exploding)) {
                this.exploding = null;
                this.dead = true;
            } else {this.velocity.scale(0.5);
                this.location.addScaled(this.velocity, elapsed);
            }            
            return;
        }

        this.direction.copy(environment.player.centroid);
        this.direction.sub(this.location);
        
        var travel = this.speed() * elapsed,
            playerDistance = this.direction.lengthSq(),
            attackPlayer = false;

        if (playerDistance < FOLLOW_DISTANCE * FOLLOW_DISTANCE) {
            attackPlayer = true;
            if (playerDistance < ATTACK_RANGE * ATTACK_RANGE) {
                this.kill();
                environment.player.kill();
            }
        } else {
            this.direction.copy(this.path[this.waypoint]);
            this.direction.sub(this.location);
        }
        
        this.angle = Math.atan2(this.direction.y, this.direction.x);
               
        var distance = this.direction.length();
        if (distance < travel) {
            travel = distance;
            if (!attackPlayer) {
                this.waypoint = (this.waypoint + 1) % this.path.length;
            }
        }
        
        this.location.addScaled(this.direction, travel/distance);
        this.location.addScaled(this.velocity, elapsed);
        
        this.velocity.scale(0.5);
    };
    
    Enemy.prototype.kill = function () {
        if (this.exploding == null ) {
            this.exploding = explosion.setupPlayback(EXPLOSION_TIME_PER_FRAME);
            boomSound.play();
        }
    }
    
    Enemy.prototype.isAlive = function() {
        return !this.dead && this.exploding == null;
    }
    
    Enemy.prototype.save = function () {
        return {
            type: nameForType(this.type),
            path: this.path
        }
    };
    
    return Enemy;
}());
