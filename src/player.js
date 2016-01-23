var Player = (function () {
    "use strict";
    
    var loader = new ImageBatch("images/"),
        torso = loader.load("torso.png"),
        leg = loader.load("leg.png"),
        arm = loader.load("arm.png"),
        spoon = loader.load("spoon.png"),
        playerHeight = 200,
        legPivotHeight = playerHeight * 0.48,
        armPivotHeight = playerHeight * 0.78,
        MAX_LEG_SWING = Math.PI * 0.2,
        MAX_ARM_SWING = Math.PI * 0.03,
        SPOON_OFFSET = new LINEAR.Vector(playerHeight * 0.25, playerHeight * 0.14),
        SPOON_LENGTH = playerHeight * 0.25,
        SPOON_IN_HAND = SPOON_LENGTH * 0.2,
        SWING_RATE = 0.005;
    
    loader.commit();
    
    function Player(location) {
        this.location = location;
        this.swingDelta = 0;
        this.spoonAngle = -Math.PI * 0.5;
        this.spoonFlipped = true;
    }
    
    Player.prototype.draw = function (context) {
        if (!loader.loaded) {
            return;
        }
        
        var torsoHeight = playerHeight * 0.6,
            scaleFactor = torsoHeight / torso.height,
            torsoWidth = torso.width * scaleFactor,
            legWidth = leg.width * scaleFactor,
            legHeight = leg.height * scaleFactor,
            legPivotY = this.location.y - legPivotHeight,
            armWidth = arm.width * scaleFactor,
            armHeight = arm.height * scaleFactor,
            armPivotY = this.location.y - armPivotHeight,
            spoonHeight = spoon.height * (SPOON_LENGTH / spoon.width),
            swing = Math.sin(this.swingDelta * SWING_RATE);
            
        context.save();
        context.translate(this.location.x, legPivotY);
        context.rotate(MAX_LEG_SWING * swing);
        context.drawImage(leg, -legWidth * 0.5, -2, legWidth, legHeight);
        context.restore();
        
        context.save();
        context.translate(this.location.x, armPivotY);
        context.rotate(MAX_ARM_SWING * swing);
        context.drawImage(arm, -armWidth * 0.13, -1, armWidth, armHeight);
        context.restore();
        
        context.drawImage(torso, this.location.x - torsoWidth * 0.5, this.location.y - playerHeight, torsoWidth, torsoHeight);
        
        context.save();
        context.translate(this.location.x, legPivotY);
        context.rotate(-MAX_LEG_SWING * swing);
        context.drawImage(leg, -legWidth * 0.5, -2, legWidth, legHeight);
        context.restore();
                
        context.save();
        context.translate(this.location.x, armPivotY);
        context.rotate(-MAX_ARM_SWING * swing);
        context.save();
        context.translate(SPOON_OFFSET.x, SPOON_OFFSET.y);
        context.rotate(this.spoonAngle);
        if (this.spoonFlipped) {
            context.scale(1, -1);
        }
        context.drawImage(spoon, -SPOON_IN_HAND, 0, SPOON_LENGTH, spoonHeight);
        context.restore();
        context.drawImage(arm, -armWidth * 0.13, -1, armWidth, armHeight);
        context.restore();
    };
    
    Player.prototype.update = function (elapsed) {
        this.swingDelta += elapsed;
        this.location.x += elapsed * 0.1;
    };
    
    return Player;
}());