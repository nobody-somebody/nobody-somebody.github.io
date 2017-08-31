'use strict';

// Wannabe interface?
function Renderable() {}
Renderable.prototype.step = function(fsc) {throw "step not implemented.";}
Renderable.prototype.draw = function(ctx) {throw "draw not implemented.";}

function Id() {
  this.start = 0;
};

Id.prototype.next = function() {
  return this.start++;
};

function HSLA(h, s, l, a) {
  this.h = h;
  this.s = s;
  this.l = l;
  this.a = a;
};

HSLA.prototype.rotate = function(v) {
  this.h = (this.h + v) % 360;
};

HSLA.prototype.toString = function() {
  return "hsla(" + this.h + ", " + this.s + "%, " + this.l + "%, " + this.a + ")";
};

function FullScreenCanvas(element) {
  this.element = element
  this.context = element.getContext("2d");
  this.objects = [];
  
  window.addEventListener("resize", this.stretch.bind(this));
  
  this.stretch();
}

FullScreenCanvas.prototype.add = function(object) {
  if(!(object instanceof Renderable))
    throw new TypeError("invalud value for `object`, an instance of Renderable required");
  
  this.objects.push(object);
};

FullScreenCanvas.prototype.stretch = function() {
  this.context.fillStyle = "#FFF";
  this.context.fillRect(0, 0, this.element.width, this.element.height);
  
  this.element.width = window.innerWidth;
  this.element.height = window.innerHeight;
};

FullScreenCanvas.prototype.center = function() {
  return {
    x: this.element.width / 2,
    y: this.element.height / 2
  };
};

FullScreenCanvas.prototype.step = function() {
  for(var i = 0; i < this.objects.length; i += 1) {
    this.objects[i].step(this);
  }
};

FullScreenCanvas.prototype.draw = function() {
  this.context.save();
  this.context.fillStyle = "rgba(0, 0, 0, 0.3)";
  this.context.fillRect(0, 0, this.element.width, this.element.height);
  this.context.globalCompositeOperation = "lighten";
  for(var i = 0; i < this.objects.length; i += 1) {
    this.objects[i].draw(this.context);
  }
  this.context.restore();
};

var Dot = Renderable.extend(function Dot(fsc, orbit, radius, id, ang, dir, vel, hue) {
  this.id  = id;
  this.fsc = fsc;
  this.orb = orbit;
  this.rad = radius;
  this.ang = typeof(ang) === "number" ? ang : (Math.random() * 360);
  this.dir = typeof(dir) === "number" ? dir : (Math.random() < 0.5 ? -1 : 1);
  this.hue = hue instanceof HSLA ? hue : new HSLA(Math.random() * 360, 100, 50, 1);
  this.vel = typeof(vel) === "number" ? vel : (.3 + (Math.random() * .5));
  this.pos = 0;
});

Dot.prototype.step = function(fsc) {
  var center = fsc.center();
  // using pointOnCircle from codepen-utilities
  this.ang = (this.ang + (this.vel * this.dir));
  this.pos = Math.pointOnCircle(center.x, center.y, this.orb, this.ang);
  
  this.hue.rotate(.5);
};

Dot.prototype.draw = function(context) {
  context.save();
    context.fillStyle = this.hue;
    context.shadowColor = this.hue;
    context.shadowBlur = 25;
    context.beginPath();
      context.arc(this.pos.x, this.pos.y, this.rad, 0, Math.Tau, false); // Math.Tau from codepen-utilities
      context.fill();
    context.closePath();
  context.restore();
};

var DotPairer = Renderable.extend(function(objects) {
  this.objects = objects;
});

DotPairer.prototype.step = function(fsc) {
  // do nothing in step, we need to ender what we find
};

DotPairer.prototype.draw = function(context) {
  var paired = {};
  
  context.save();
  context.shadowBlur = 10;
  context.shadowColor = "rgba(255, 255, 255, 0.3)";
  
  for(var i = 0; i < this.objects.length; i += 1) {
    for(var j = 0; j < this.objects.length; j += 1) {
      var p1 = this.objects[i],
          p2 = this.objects[j],
          ida = ((p1.id << 16) | p2.id),
          idb = ((p2.id << 16) | p1.id);
      
      // We only want to pair them when they haven't been paired yet
      if(p1 !== p2 && !paired[ida] && !paired[idb]) {
        var gradient = context.createLinearGradient(p1.pos.x, p1.pos.y, p2.pos.x, p2.pos.y);
        gradient.addColorStop(0, p1.hue.toString());
        gradient.addColorStop(1, p2.hue.toString());
        context.strokeStyle = gradient;
        
        // Pair the dots with gradient shocking lines with perhaps a glow
        context.beginPath();
        context.moveTo(p1.pos.x, p1.pos.y); // start from here

        // wiggly woggle wob shock!
        for(var currentPoint = 0.25; currentPoint < 1; currentPoint += 0.20) {
          var ptx = (p1.pos.x + (p2.pos.x - p1.pos.x) * currentPoint),
              pty = (p1.pos.y + (p2.pos.y - p1.pos.y) * currentPoint);

          context.lineTo(ptx + 12 - (Math.random() * 20), pty + 12 - (Math.random() * 20));
        }
        
        // end here!
        context.lineTo(p2.pos.x, p2.pos.y);
        context.stroke(); // stroke before closePath, prevent a line back from last point
        context.closePath();
        //context.stroke(); // stroke after closePath, render a line back from last point
        
        // This pair is done, so both dots are excluded 
        paired[ida] = paired[idb] = true;
      }
    }
  }
  
  context.restore();
};

window.addEventListener("load", function(e) {
  var canvas = document.getElementById("animation"),
      fsc = new FullScreenCanvas(canvas),
      dots = [], pairer = new DotPairer(dots),
      idg = new Id(),
      radius = 200,
      max = 6;
  //Dot(fsc, orbit, radius, id, ang, dir, vel)
  for(var i = 0; i < max; i += 1) {
    var hue = new HSLA((i / max) * 360, 100, 50, 1);
    var dot = new Dot(fsc, radius, 1, idg.next(), Math.floor((i / max) * 360), 1, .08, hue);
    dots.push(dot);
    fsc.add(dot);
  }
  
  fsc.add(pairer);
  // The main loop
  (function animationLoop() {
    fsc.step();
    fsc.draw();
    
    // in codepen-utilities.js I have a polyfill for requestAnimationFrame, is it still useful?
    window.requestAnimFrame(animationLoop);
  }());
});