var PARTICLES = (function () {
    "use strict";
    
    function Particle(location, radius, mass) {
        this.location = location;
        this.radius = radius;
        this.mass = mass;        
        this.velocity = new LINEAR.Vector(0,0);
    }
    
    Particle.prototype.update = function(elapsed, particles, platforms, gravity) {
        for (var p = 0; p < particles.length; ++p) {
            if (particles[p].isBelow(this.location)) {
                var particle = particles[p];
            }
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
    
    return {
        Particle: Particle,
        Ordering: orderByHeight
    };
}());