var PLATFORMS = (function () {
    "use strict";
    
    function Platform(start, end) {
        this.start = start;
        this.end = end;
    }
    
    Platform.prototype.draw = function (context) {
        context.beginPath();
        // Draw using pixel centers.
        context.moveTo(this.start.x - 0.5, this.start.y + 0.5);
        context.lineTo(this.end.x + 0.5, this.end.y + 0.5);
        context.stroke();
    };
    
    Platform.protothype
    
    return {
        Platform: Platform
    };
}());
