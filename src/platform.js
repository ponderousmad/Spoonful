var PLATFORMS = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        images = [
        ];
        
    loader.commit();
    
    function Platform(start, end) {
        this.start = start.clone();
        this.end = end.clone();
        
        this.segment = new LINEAR.Segment(this.start, this.end);
        
        this.rise = end.y - start.y;
        this.run = end.x - start.x;
    }
    
    Platform.prototype.draw = function (context) {
        context.beginPath();
        // Draw using pixel centers.
        context.moveTo(this.start.x - 0.5, this.start.y + 0.5);
        context.lineTo(this.end.x + 0.5, this.end.y + 0.5);
        context.stroke();
    };
    
    Platform.prototype.isBelow = function (location, radius) {
        if (this.run <= 0) {
            // Ignore vertical platforms.
            return false;
        }
        if (location.x < this.start.x - radius || this.end.x + radius < location.x) {
            return false;
        }
        if (location.y > this.start.y && location.y > this.end.y) {
            return false;
        }
        
        var platformY = this.yForX(location.x);
        return platformY > location.y;
    };
    
    Platform.prototype.yForX = function (x) {
        return this.start.y + ((x - this.start.x) / this.run) * this.rise;
    };
    
    Platform.prototype.intersect = function (segment, contact) {
        return this.segment.findIntersection(segment, contact);
    };
    
    function intersectPlatforms(platforms, segment, onIntersect) {
        var intersection = new LINEAR.Vector(0, 0);
        for (var i = 0; i < platforms.length; ++i) {
            var platform = platforms[i];
            if (platform.intersect(segment, intersection)) {
                onIntersect(platform, intersection);
            }
        }
    }
    
    return {
        Platform: Platform,
        intersect: intersectPlatforms
    };
}());
