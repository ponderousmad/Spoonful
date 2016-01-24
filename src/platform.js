var PLATFORMS = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        images = [
            loader.load("girder.png")
        ],
        Types = {
            Girder: 0
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
    
    function Platform(start, end, type) {
        this.start = start.clone();
        this.end = end.clone();
        
        this.segment = new LINEAR.Segment(this.start, this.end);
        
        this.rise = end.y - start.y;
        this.run = end.x - start.x;
        
        this.type = type ? Types[type] : Types.Girder;
    }
    
    Platform.prototype.draw = function (context) {
        if (!loader.loaded) {
            context.beginPath();
            // Draw using pixel centers.
            context.moveTo(this.start.x - 0.5, this.start.y + 0.5);
            context.lineTo(this.end.x + 0.5, this.end.y + 0.5);
            context.stroke();
            return;
        }
        var image = images[this.type],
            length = this.segment.length(),
            offset = 0,
            angle = Math.atan2(this.rise, this.run);

        context.save();
        context.translate(this.start.x, this.start.y);
        context.rotate(angle);
        while (length > 0) {
            var width = Math.min(length, image.width);
            context.drawImage(image, 0, 0, width, image.height, offset, 0, width, image.height);
            length -= width;
            offset += width;
        }
        context.restore();
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
    
    Platform.prototype.xForY = function (y) {
        return this.start.x + ((y - this.start.y) / this.rise) * this.run;
    };
    
    Platform.prototype.intersect = function (segment, contact) {
        return this.segment.findIntersection(segment, contact);
    };
    
    Platform.prototype.save = function() {
        return {
            type: nameForType(this.type),
            start: this.start,
            end: this.end
        }
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
        Types: Types,
        intersect: intersectPlatforms
    };
}());
