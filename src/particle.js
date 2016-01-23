var PARTICLES = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        images = [
            loader.load("ParticleBrown.png")
        ];
    
    loader.commit();
    
    function Particle(location, radius, mass) {
        this.location = location.clone();
        this.lastLocation = location.clone();
        this.radius = radius;
        this.mass = mass;        
        this.velocity = new LINEAR.Vector(0, 0);
        this.support = null;
    }
    
    Particle.prototype.update = function (elapsed, particles, platforms, gravity) {
        if (this.support === null) {
            this.velocity.addScaled(gravity, elapsed);
        }
        
        for (var p = 0; p < particles.length; ++p) {
            if (particles[p].isBelow(this.location)) {
                var particle = particles[p];
            }
        }
        
        var highestPlatform = null,
            highestPlatformHeight = 0;
        
        for (var f = 0; f < platforms.length; ++f) {
            if (platforms[f].isBelow(this.location)) {
                var platform = platforms[f],
                    platformHeight = platform.yForX(this.location.x);
                
                if (highestPlatform == null || platformHeight < highestPlatformHeight) {
                    highestPlatform = platform;
                    highestPlatformHeight = platformHeight;
                }
            }
        }
        
        if (this.support === null) {
            if (highestPlatform != null && highestPlatformHeight < (this.location.y + this.radius + this.velocity.y * elapsed)) {
                this.support = highestPlatform;
                this.location.y = highestPlatformHeight - this.radius;
                this.velocity.set(0, 0);
            }
        } else {
            this.velocity.set(0, 0);
        }
        
        this.location.addScaled(this.velocity, elapsed);
        this.lastLocation.copy(this.location);
    };
    
    Particle.prototype.isBelow = function (location) {
        if (location.y > this.location.y) {
            return false;
        }
        var xDiff = location.x - this.location.x;
        return Math.abs(xDiff) <= this.radius;
    };
    
    Particle.prototype.draw = function (context) {
        if (loader.loaded) {
            var size = 2 * this.radius;
            context.drawImage(images[0], this.location.x - this.radius, this.location.y - this.radius, size, size);
        }
    };
    
    function orderByHeight(p, q) {
        return p.location.y > q.location.y;
    }
    
    return {
        Particle: Particle,
        Ordering: orderByHeight
    };
}());