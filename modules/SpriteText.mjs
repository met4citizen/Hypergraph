import { LinearFilter, Sprite, SpriteMaterial, Texture } from 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.module.js'

class SpriteText extends Sprite {

  constructor(text, textHeight, color) {
    super( new SpriteMaterial({
      map: new Texture(),
      color: 0xffffff,
			transparent: true,
			depthTest: false,
			depthWrite: false
    }) );

    this.text = `${text}`;
    this.textHeight = textHeight;
    this.color = color;

    this.fontFace = 'Arial';
    this.fontSize = 40; // defines text resolution
    this.fontWeight = 'bold';

    this.canvas = document.createElement('canvas');
    this.texture = this.material.map;
    this.texture.minFilter = LinearFilter;

    this.update();
  }

  update() {
    const ctx = this.canvas.getContext('2d');
    const lines = this.text.split('\n');
    const font = `${this.fontWeight} ${this.fontSize}px ${this.fontFace}`;

    ctx.font = font; // measure canvas with appropriate font
    const innerWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) + 110;
    const innerHeight = this.fontSize * lines.length;
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;

    ctx.font = font;
    ctx.fillStyle = this.color;
    ctx.textBaseline = 'bottom';
    ctx.translate( 55,0 );

    lines.forEach((line, index) => {
      const lineX = (innerWidth - ctx.measureText(line).width) / 2;
      const lineY = (index + 1) * this.fontSize;
      ctx.fillText(line, lineX, lineY);
    });

    this.texture.image = this.canvas;
    this.texture.needsUpdate = true;

    const yScale = this.textHeight * lines.length;
    this.scale.set( yScale * this.canvas.width / this.canvas.height, yScale, 0);
  }
}

export { SpriteText };
