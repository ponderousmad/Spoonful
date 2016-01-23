var PARTICLES = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        images = [
            loader.load("ParticleBrown.png")
        ];
    
    loader.commit();
    
    function Particle(location, radius, mass) {
        this.location = location;
        this.radius = radius;
        this.mass = mass;        
        this.velocity = new LINEAR.Vector(0, 0);
        this.falling = true;
    }
    
    Particle.prototype.update = function(elapsed, particles, platforms, gravity) {
        for (var p = 0; p < particles.length; ++p) {
            if (particles[p].isBelow(this.location)) {
                var particle = particles[p];
            }
        }
        
        if (this.falling) {
            this.velocity.addScaled(gravity, elapsed);
            this.location.addScaled(this.velocity, elapsed);
        }
    };
    
    Particle.prototype.isBelow = function(location) {
        if (location.y > this.location.y) {
            return false;
        }
        var xDiff = location.x - this.location.x;
        return Math.abs(xDiff) <= this.radius;
    };
    
    function orderByHeight(p, q) {
        return p.location.y > q.location.y;
    }
    
    Particle.prototype.draw = function(context) {
        if (loader.loaded) {
            var size = 2 * this.radius;
            context.drawImage(images[0], this.location.x, this.location.y, size, size);
        }
    };
    
    return {
        Particle: Particle,
        Ordering: orderByHeight
    };
}());