var Enemy = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        images = [
            loader.load("glider.png")
        ],
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
        this.dead = false;
        this.direction = new LINEAR.Vector(0, 0);
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
        context.drawImage(image, -image.width * 0.5, -image.height * 0.5);
        context.restore();
    };
    
    Enemy.prototype.speed = function() {
        if (this.enemy == Types.Glider) {
            return 0.5;
        }
        return 0.1;
    };
    
    Enemy.prototype.update = function (elapsed, environment) {
        var next = this.path[this.waypoint],
            speed = this.speed(),
            travel = speed * elapsed;
        
        this.direction.copy(next);
        this.direction.sub(this.location);
        this.angle = Math.atan2(this.direction.y, this.direction.x);
        
        var distance = this.direction.length();
        if (distance < travel) {
            travel = distance;
            this.waypoint = (this.waypoint + 1) % this.path.length;
        }
        
        this.location.addScaled(this.direction, travel/distance);
    };
    
    Enemy.prototype.save = function () {
        return {
            type: nameForType(this.type),
            path: this.path
        }
    };
    
    return Enemy;
}());
