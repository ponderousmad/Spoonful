(function () {
    "use strict";
    
    function Particle(location, radius, mass) {
        this.location = location;
        this.radius = radius;
        this.mass = mass;        
        this.velocity = new LINEAR.Vector(0,0);
    }
    
    Particle.prototype.update = function(elapsed, particles, platforms, gravity) {
    };
    
    Particle.prototype.isBelow = function(location) {
        var xDiff = location.x - this.location.x;
        return Math.abs(xDiff) <= this.radius;
    };
}());