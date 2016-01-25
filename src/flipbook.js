var Flipbook = (function () {
    function Flipbook(imageBatch, baseName, frameCount, digits) {
        this.frames = [];
        for (var i = 1; i <= frameCount; ++i) {
            var number = i.toString();
            while (number.length < digits) {
                number = "0" + number;
            }
            this.frames.push(imageBatch.load(baseName + number + ".png"));
        }
    }
    
    Flipbook.prototype.setupPlayback = function(frameTime, loop) {
        return {
            elapsed: 0,
            timePerFrame: frameTime,
            fractionComplete: 0,
            loop: loop === true
        };
    };
    
    Flipbook.prototype.updatePlayback = function(elapsed, playback) {
        var totalLength = playback.timePerFrame * this.frames.length;
        playback.elapsed += elapsed;
        if(playback.loop) {
            playback.elapsed = playback.elapsed % totalLength;
        }
        if (playback.elapsed > totalLength) {
            playback.fractionComplete = 0;
            return true;
        } else {
            playback.fractionComplete = playback.elapsed / totalLength;
            return false;
        }
    };
    
    Flipbook.prototype.draw = function(context, playback, location, width, height, center) {
        var index = Math.min(this.frames.length - 1, Math.floor(playback.elapsed / playback.timePerFrame)),
            x = location.x - (center ? width * 0.5 : 0),
            y = location.y - (center ? height * 0.5 : 0);
        context.drawImage(this.frames[index], x, y, width, height);
    };
    
    return Flipbook;
}());
